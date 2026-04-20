from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

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

chat_context_router = APIRouter(prefix="/users/{user_id}/chat-context", tags=["chat-context"])

class OverviewContextResponse(BaseModel):
    """High-level financial overview that is safe to inject into most chat prompts."""

    year: int
    current_income: int
    current_expense: int
    current_saving: int
    saving_target: int
    saving_progress_rate: int
    current_assets: int
    projected_year_expense: int
    projected_year_saving: int
    target_gap: int


class SavingGoalContextResponse(BaseModel):
    """Goal-tracking summary used to answer 'can I hit my target?' style questions."""

    year: int
    current_saving: int
    saving_target: int
    saving_progress_rate: int
    monthly_saving_velocity: int
    projected_year_saving: int
    goal_status: Literal["no_target", "on_track", "at_risk", "off_track"]
    target_gap: int
    required_monthly_saving: int
    remaining_months: int


class SpendingCategoryResponse(BaseModel):
    """Single spending category inside the chat-oriented breakdown response."""

    name: str
    amount: int
    ratio: int


class SpendingBreakdownResponse(BaseModel):
    """Current spending structure used by the model to explain overspending drivers."""

    year: int
    current_expense: int
    fixed_spending: int
    variable_spending: int
    top_category: str
    categories: list[SpendingCategoryResponse]


class ProjectionResponse(BaseModel):
    """Year-end projection that estimates where current income/spending pace leads."""

    year: int
    projected_year_income: int
    projected_year_expense: int
    projected_year_saving: int
    projected_overspend: int
    target_gap: int
    risk_level: Literal["low", "medium", "high"]


class RecommendationInputResponse(BaseModel):
    """Compact, model-friendly feature set used to generate actionable advice."""

    year: int
    current_income: int
    current_expense: int
    current_saving: int
    saving_target: int
    saving_gap: int
    top_category: str
    risk_level: Literal["low", "medium", "high"]
    priority_actions: list[str]


class WhatIfPayload(BaseModel):
    """Input payload for simple what-if simulations."""

    year: int = Field(ge=2000, le=2100)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    income_delta: int = 0
    expense_delta: int = 0
    saving_target: Optional[int] = Field(default=None, ge=0)


class WhatIfResponse(BaseModel):
    """Simulated result used by the chat model to answer hypothetical questions."""

    year: int
    current_income: int
    current_expense: int
    current_saving: int
    saving_target: int
    monthly_saving_velocity: int
    projected_year_saving: int
    target_gap: int
    can_hit_target: bool


@chat_context_router.get("/overview", response_model=OverviewContextResponse)
def get_overview_context(
    user_id: str,
    year: int = Query(ge=2000, le=2100),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
) -> OverviewContextResponse:
    """Return the user's current financial overview for quick chat grounding."""

    snapshot = build_analysis_snapshot(db, user_id, year, month)
    return OverviewContextResponse(**build_overview_context(snapshot))


@chat_context_router.get("/saving-goal", response_model=SavingGoalContextResponse)
def get_saving_goal_context(
    user_id: str,
    year: int = Query(ge=2000, le=2100),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
) -> SavingGoalContextResponse:
    """Return target-progress data for goal feasibility questions."""

    snapshot = build_analysis_snapshot(db, user_id, year, month)
    return SavingGoalContextResponse(**analyze_saving_goal(snapshot))


@chat_context_router.get("/spending-breakdown", response_model=SpendingBreakdownResponse)
def get_spending_breakdown_context(
    user_id: str,
    year: int = Query(ge=2000, le=2100),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
) -> SpendingBreakdownResponse:
    """Return current spending composition for chat explanations about expense pressure."""

    snapshot = build_analysis_snapshot(db, user_id, year, month)
    return SpendingBreakdownResponse(**analyze_spending_breakdown(snapshot))


@chat_context_router.get("/projection", response_model=ProjectionResponse)
def get_projection_context(
    user_id: str,
    year: int = Query(ge=2000, le=2100),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
) -> ProjectionResponse:
    """Return year-end projections based on the user's current financial pace."""

    snapshot = build_analysis_snapshot(db, user_id, year, month)
    return ProjectionResponse(**build_projection(snapshot))


@chat_context_router.get(
    "/recommendation-input", response_model=RecommendationInputResponse
)
def get_recommendation_input_context(
    user_id: str,
    year: int = Query(ge=2000, le=2100),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
) -> RecommendationInputResponse:
    """Return a compact feature set that the chat model can turn into advice."""

    snapshot = build_analysis_snapshot(db, user_id, year, month)
    return RecommendationInputResponse(**build_recommendation_input(snapshot))


@chat_context_router.post("/what-if", response_model=WhatIfResponse)
def run_what_if_context(
    user_id: str,
    payload: WhatIfPayload,
    db: Session = Depends(get_db),
) -> WhatIfResponse:
    """Simulate a simple alternative scenario for the current financial plan."""

    snapshot = build_analysis_snapshot(db, user_id, payload.year, payload.month)
    return WhatIfResponse(
        **simulate_financial_scenario(
            snapshot,
            income_delta=payload.income_delta,
            expense_delta=payload.expense_delta,
            saving_target=payload.saving_target,
        )
    )
