import json
import re
import subprocess
import tempfile
from collections.abc import Iterator
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from openai import APIError, OpenAI, RateLimitError
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import get_db
from app.services.analysis import (
    analyze_saving_goal,
    analyze_spending_breakdown,
    build_analysis_snapshot,
    build_overview_context,
    build_projection,
    build_recommendation_input,
    simulate_financial_scenario,
)

chat_router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """User message payload passed from the mobile chat screen."""

    user_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    year: int = Field(default=2026, ge=2000, le=2100)
    month: int = Field(default=4, ge=1, le=12)


class ChatResponse(BaseModel):
    """Single-turn chat reply returned to the client."""

    reply: str


SYSTEM_PROMPT = """
You are a personal finance copilot inside a budgeting app.
Give concise, practical answers in Simplified Chinese.
Focus on spending analysis, yearly projection, savings goals, and concrete next steps.
Avoid legal or investment-advisory framing. Be helpful, grounded, and specific.
When context data is provided, prioritize it over general advice.
""".strip()


def select_context_sections(message: str) -> list[str]:
    """Pick the most relevant financial context blocks based on the user's question."""

    lowered = message.lower()
    sections = ["overview"]

    if any(keyword in message for keyword in ["储蓄", "目标", "差距", "达成", "够不够"]):
        sections.extend(["saving_goal", "projection"])

    if any(keyword in message for keyword in ["支出", "消费", "花", "超支", "结构"]):
        sections.extend(["spending_breakdown", "projection"])

    if any(keyword in message for keyword in ["建议", "怎么做", "优化", "改进"]):
        sections.append("recommendation_input")

    if "本月分析" in message:
        sections.extend(["overview", "spending_breakdown"])

    if "全年预测" in message:
        sections.append("projection")

    if "目标差距" in message:
        sections.append("saving_goal")

    if any(keyword in lowered for keyword in ["if", "what if"]) or any(
        keyword in message for keyword in ["如果", "假如", "要是"]
    ):
        sections.append("what_if")

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(sections))


def parse_what_if_adjustments(message: str) -> dict[str, Optional[int]]:
    """Extract simple delta instructions from natural language what-if questions."""

    income_delta = 0
    expense_delta = 0
    saving_target = None

    income_match = re.search(r"(多赚|多收入|涨工资|增加收入)\s*(\d+)", message)
    if income_match:
        income_delta += int(income_match.group(2))

    expense_down_match = re.search(r"(少花|减少支出|少支出|降低支出)\s*(\d+)", message)
    if expense_down_match:
        expense_delta -= int(expense_down_match.group(2))

    expense_up_match = re.search(r"(多花|增加支出|多支出)\s*(\d+)", message)
    if expense_up_match:
        expense_delta += int(expense_up_match.group(2))

    target_match = re.search(r"(目标.*?)(\d+)", message)
    if target_match:
        saving_target = int(target_match.group(2))

    return {
        "income_delta": income_delta,
        "expense_delta": expense_delta,
        "saving_target": saving_target,
    }


def build_chat_context(payload: ChatRequest, db: Session) -> dict[str, Any]:
    """Build structured financial context before calling the language model."""

    snapshot = build_analysis_snapshot(db, payload.user_id, payload.year, payload.month)
    sections = select_context_sections(payload.message)
    context: dict[str, Any] = {}

    if "overview" in sections:
        context["overview"] = build_overview_context(snapshot)

    if "saving_goal" in sections:
        context["saving_goal"] = analyze_saving_goal(snapshot)

    if "spending_breakdown" in sections:
        context["spending_breakdown"] = analyze_spending_breakdown(snapshot)

    if "projection" in sections:
        context["projection"] = build_projection(snapshot)

    if "recommendation_input" in sections:
        context["recommendation_input"] = build_recommendation_input(snapshot)

    if "what_if" in sections:
        adjustments = parse_what_if_adjustments(payload.message)
        context["what_if"] = simulate_financial_scenario(
            snapshot,
            income_delta=int(adjustments["income_delta"] or 0),
            expense_delta=int(adjustments["expense_delta"] or 0),
            saving_target=(
                int(adjustments["saving_target"])
                if adjustments["saving_target"] is not None
                else None
            ),
        )

    return context


def build_model_prompt(message: str, context: dict[str, Any]) -> str:
    """Compose the final prompt sent to the backing chat model."""

    context_text = json.dumps(context, ensure_ascii=False, indent=2)
    return (
        f"{SYSTEM_PROMPT}\n\n"
        "Reply in Simplified Chinese. Keep the answer concise and practical.\n"
        "Use the financial context when it is relevant. If the context is insufficient, say so briefly.\n\n"
        f"Structured financial context:\n{context_text}\n\n"
        f"User message: {message}"
    )


def format_sse_event(event: str, data: dict[str, Any]) -> str:
    """Serialize one SSE event frame."""

    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def split_reply_chunks(reply: str) -> list[str]:
    """Split the final reply into small chunks so the client can render progressively."""

    chunks = [segment.strip() for segment in re.split(r"(?<=[。！？\n])", reply) if segment.strip()]
    return chunks or [reply]


def create_openai_reply(prompt: str) -> str:
    """Generate a chat reply through the OpenAI Responses API."""

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured on the server.",
        )

    client = OpenAI(api_key=settings.openai_api_key)

    try:
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
    except RateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail="OpenAI API quota is unavailable. Check API billing and quota settings.",
        ) from exc
    except APIError as exc:
        raise HTTPException(
            status_code=502,
            detail="OpenAI API request failed.",
        ) from exc

    reply = response.output_text.strip()
    if not reply:
        raise HTTPException(status_code=502, detail="Model returned an empty reply.")

    return reply


def create_codex_reply(prompt: str) -> str:
    """Generate a chat reply through the local Codex CLI provider."""

    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp_file:
        output_path = Path(temp_file.name)

    command = [
        settings.codex_cli_path,
        "exec",
        prompt,
        "-C",
        settings.codex_workdir,
        "--skip-git-repo-check",
        "--color",
        "never",
        "-o",
        str(output_path),
    ]

    try:
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=90,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="Codex CLI is not available on the server.",
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail="Codex CLI timed out while generating a reply.",
        ) from exc

    try:
        reply = output_path.read_text(encoding="utf-8").strip()
    finally:
        output_path.unlink(missing_ok=True)

    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "Codex CLI request failed."
        raise HTTPException(status_code=502, detail=detail)

    if not reply:
        raise HTTPException(status_code=502, detail="Codex CLI returned an empty reply.")

    return reply


def stream_chat_reply(payload: ChatRequest, db: Session) -> Iterator[str]:
    """Yield status, tool, chunk, and done events for the chat SSE endpoint."""

    yield format_sse_event("status", {"message": "正在读取财务数据"})

    sections = select_context_sections(payload.message)
    snapshot = build_analysis_snapshot(db, payload.user_id, payload.year, payload.month)
    context: dict[str, Any] = {}

    tool_builders: dict[str, tuple[str, Any]] = {
        "overview": ("财务快照", build_overview_context),
        "saving_goal": ("储蓄目标分析", analyze_saving_goal),
        "spending_breakdown": ("支出结构分析", analyze_spending_breakdown),
        "projection": ("全年预测分析", build_projection),
        "recommendation_input": ("建议输入准备", build_recommendation_input),
    }

    for section in sections:
        if section == "what_if":
            yield format_sse_event(
                "tool",
                {"name": section, "status": "started", "label": "情景模拟开始"},
            )
            adjustments = parse_what_if_adjustments(payload.message)
            context[section] = simulate_financial_scenario(
                snapshot,
                income_delta=int(adjustments["income_delta"] or 0),
                expense_delta=int(adjustments["expense_delta"] or 0),
                saving_target=(
                    int(adjustments["saving_target"])
                    if adjustments["saving_target"] is not None
                    else None
                ),
            )
            yield format_sse_event(
                "tool",
                {"name": section, "status": "done", "label": "情景模拟完成"},
            )
            continue

        if section not in tool_builders:
            continue

        label, builder = tool_builders[section]
        yield format_sse_event(
            "tool",
            {"name": section, "status": "started", "label": f"{label}开始"},
        )
        context[section] = builder(snapshot)
        yield format_sse_event(
            "tool",
            {"name": section, "status": "done", "label": f"{label}完成"},
        )

    yield format_sse_event("status", {"message": "正在生成回复"})
    prompt = build_model_prompt(payload.message, context)

    provider = settings.chat_provider.lower()
    if provider == "codex":
        reply = create_codex_reply(prompt)
    elif provider == "openai":
        reply = create_openai_reply(prompt)
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Unsupported chat provider: {settings.chat_provider}",
        )

    for chunk in split_reply_chunks(reply):
        yield format_sse_event("chunk", {"text": chunk})

    yield format_sse_event("done", {"reply": reply})


@chat_router.post("", response_model=ChatResponse)
def create_chat_reply(
    payload: ChatRequest,
    db: Session = Depends(get_db),
) -> ChatResponse:
    """Answer the user's question after enriching it with computed financial context."""

    provider = settings.chat_provider.lower()
    context = build_chat_context(payload, db)
    prompt = build_model_prompt(payload.message, context)

    if provider == "codex":
        reply = create_codex_reply(prompt)
    elif provider == "openai":
        reply = create_openai_reply(prompt)
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Unsupported chat provider: {settings.chat_provider}",
        )

    return ChatResponse(reply=reply)


@chat_router.post("/stream")
def create_streaming_chat_reply(
    payload: ChatRequest,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Stream chat execution progress and the final answer through SSE."""

    def event_generator() -> Iterator[str]:
        try:
            yield from stream_chat_reply(payload, db)
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, str) else "请求失败"
            yield format_sse_event("error", {"message": detail})
        except Exception:
            yield format_sse_event("error", {"message": "服务暂时不可用，请稍后重试"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
