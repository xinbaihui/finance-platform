from __future__ import annotations

from flask import Blueprint, jsonify
from pydantic import BaseModel, Field
from typing import Optional

from app.api.helpers import parse_json_body, parse_optional_month, parse_year
from app.db import session_scope
from app.services.analysis import (
    analyze_saving_goal,
    analyze_spending_breakdown,
    build_analysis_snapshot,
    build_overview_context,
    build_projection,
    build_recommendation_input,
    simulate_financial_scenario,
)

chat_context_bp = Blueprint("chat_context", __name__)


class WhatIfPayload(BaseModel):
    """Input payload for simple what-if simulations."""

    year: int = Field(ge=2000, le=2100)
    month: Optional[int] = Field(default=None, ge=1, le=12)
    income_delta: int = 0
    expense_delta: int = 0
    saving_target: Optional[int] = Field(default=None, ge=0)


@chat_context_bp.get("/overview")
def get_overview_context(user_id: str):
    """Return the user's current financial overview for quick chat grounding."""

    year, error = parse_year()
    if error:
        return error

    month, month_error = parse_optional_month()
    if month_error:
        return month_error

    with session_scope() as db:
        snapshot = build_analysis_snapshot(db, user_id, year, month)
        return jsonify(build_overview_context(snapshot)), 200


@chat_context_bp.get("/saving-goal")
def get_saving_goal_context(user_id: str):
    """Return target-progress data for goal feasibility questions."""

    year, error = parse_year()
    if error:
        return error

    month, month_error = parse_optional_month()
    if month_error:
        return month_error

    with session_scope() as db:
        snapshot = build_analysis_snapshot(db, user_id, year, month)
        return jsonify(analyze_saving_goal(snapshot)), 200


@chat_context_bp.get("/spending-breakdown")
def get_spending_breakdown_context(user_id: str):
    """Return current spending composition for chat explanations about expense pressure."""

    year, error = parse_year()
    if error:
        return error

    month, month_error = parse_optional_month()
    if month_error:
        return month_error

    with session_scope() as db:
        snapshot = build_analysis_snapshot(db, user_id, year, month)
        return jsonify(analyze_spending_breakdown(snapshot)), 200


@chat_context_bp.get("/projection")
def get_projection_context(user_id: str):
    """Return year-end projections based on the user's current financial pace."""

    year, error = parse_year()
    if error:
        return error

    month, month_error = parse_optional_month()
    if month_error:
        return month_error

    with session_scope() as db:
        snapshot = build_analysis_snapshot(db, user_id, year, month)
        return jsonify(build_projection(snapshot)), 200


@chat_context_bp.get("/recommendation-input")
def get_recommendation_input_context(user_id: str):
    """Return a compact feature set that the chat model can turn into advice."""

    year, error = parse_year()
    if error:
        return error

    month, month_error = parse_optional_month()
    if month_error:
        return month_error

    with session_scope() as db:
        snapshot = build_analysis_snapshot(db, user_id, year, month)
        return jsonify(build_recommendation_input(snapshot)), 200


@chat_context_bp.post("/what-if")
def run_what_if_context(user_id: str):
    """Simulate a simple alternative scenario for the current financial plan."""

    payload, payload_error = parse_json_body(WhatIfPayload)
    if payload_error:
        return payload_error

    with session_scope() as db:
        snapshot = build_analysis_snapshot(db, user_id, payload.year, payload.month)
        return (
            jsonify(
                simulate_financial_scenario(
                    snapshot,
                    income_delta=payload.income_delta,
                    expense_delta=payload.expense_delta,
                    saving_target=payload.saving_target,
                )
            ),
            200,
        )
