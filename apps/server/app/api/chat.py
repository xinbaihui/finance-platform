import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from openai import APIError, OpenAI, RateLimitError
from pydantic import BaseModel

from app.core.config import settings

chat_router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


SYSTEM_PROMPT = """
You are a personal finance copilot inside a budgeting app.
Give concise, practical answers in Simplified Chinese.
Focus on spending analysis, yearly projection, savings goals, and concrete next steps.
Avoid legal or investment-advisory framing. Be helpful, grounded, and specific.
""".strip()


def create_openai_reply(message: str) -> str:
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
                {"role": "user", "content": payload.message},
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


def create_codex_reply(message: str) -> str:
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        "Reply in Simplified Chinese. Keep the answer concise and practical.\n\n"
        f"User message: {message}"
    )

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


@chat_router.post("", response_model=ChatResponse)
def create_chat_reply(payload: ChatRequest) -> ChatResponse:
    provider = settings.chat_provider.lower()

    if provider == "codex":
        reply = create_codex_reply(payload.message)
    elif provider == "openai":
        reply = create_openai_reply(payload.message)
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Unsupported chat provider: {settings.chat_provider}",
        )

    return ChatResponse(reply=reply)
