from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AnnualExpenseItem, AnnualIncomeItem, AnnualPlan, AssetItem


@dataclass
class AnalysisSnapshot:
    """Normalized financial snapshot used by chat-oriented analysis functions."""

    year: int
    month: int
    income_items: list[AnnualIncomeItem]
    expense_items: list[AnnualExpenseItem]
    asset_items: list[AssetItem]
    saving_target: int
    current_saving: int
    annual_income_total: int
    annual_expense_total: int
    current_income_total: int
    current_expense_total: int
    current_saved_total: int
    monthly_income_total: int
    monthly_expense_total: int
    monthly_saving_velocity: int
    current_asset_total: int


def to_annual_amount(item: AnnualIncomeItem | AnnualExpenseItem | AssetItem) -> int:
    """Convert a yearly or monthly item into its annualized amount."""

    period = getattr(item, "period", "year")
    return item.amount * 12 if period == "month" else item.amount


def to_current_amount(
    item: AnnualIncomeItem | AnnualExpenseItem, elapsed_months: int
) -> int:
    """Convert an item into the amount that should have occurred by the current month."""

    period = getattr(item, "period", "year")
    return item.amount * elapsed_months if period == "month" else item.amount


def build_analysis_snapshot(
    db: Session,
    user_id: str,
    year: int,
    month: int | None = None,
) -> AnalysisSnapshot:
    """Load raw financial records and compute a reusable snapshot for analysis."""

    reference_month = month or datetime.now().month
    elapsed_months = max(1, min(reference_month, 12))

    income_items = db.scalars(
        select(AnnualIncomeItem)
        .where(AnnualIncomeItem.user_id == user_id, AnnualIncomeItem.year == year)
        .order_by(AnnualIncomeItem.id.asc())
    ).all()
    expense_items = db.scalars(
        select(AnnualExpenseItem)
        .where(AnnualExpenseItem.user_id == user_id, AnnualExpenseItem.year == year)
        .order_by(AnnualExpenseItem.id.asc())
    ).all()
    asset_items = db.scalars(
        select(AssetItem).where(AssetItem.user_id == user_id).order_by(AssetItem.id.asc())
    ).all()
    plan = db.scalar(
        select(AnnualPlan).where(AnnualPlan.user_id == user_id, AnnualPlan.year == year)
    )

    annual_income_total = sum(to_annual_amount(item) for item in income_items)
    annual_expense_total = sum(to_annual_amount(item) for item in expense_items)
    current_income_total = sum(to_current_amount(item, elapsed_months) for item in income_items)
    current_expense_total = sum(
        to_current_amount(item, elapsed_months) for item in expense_items
    )
    current_saved_total = max(current_income_total - current_expense_total, 0)
    current_asset_total = sum(item.amount for item in asset_items)

    saving_target = 0 if plan is None else plan.saving_target
    current_saving = 0 if plan is None else plan.current_saving

    return AnalysisSnapshot(
        year=year,
        month=reference_month,
        income_items=income_items,
        expense_items=expense_items,
        asset_items=asset_items,
        saving_target=saving_target,
        current_saving=current_saving,
        annual_income_total=annual_income_total,
        annual_expense_total=annual_expense_total,
        current_income_total=current_income_total,
        current_expense_total=current_expense_total,
        current_saved_total=current_saved_total,
        monthly_income_total=round(annual_income_total / 12),
        monthly_expense_total=round(annual_expense_total / 12),
        monthly_saving_velocity=round(current_saved_total / elapsed_months),
        current_asset_total=current_asset_total,
    )


def build_overview_context(snapshot: AnalysisSnapshot) -> dict:
    """Return the top-level overview used for quick chat context injection."""

    projected_year_saving = snapshot.monthly_saving_velocity * 12
    target_gap = max(snapshot.saving_target - projected_year_saving, 0)
    return {
        "year": snapshot.year,
        "current_income": snapshot.current_income_total,
        "current_expense": snapshot.current_expense_total,
        "current_saving": snapshot.current_saved_total,
        "saving_target": snapshot.saving_target,
        "saving_progress_rate": 0
        if snapshot.saving_target == 0
        else min(100, round((snapshot.current_saved_total / snapshot.saving_target) * 100)),
        "current_assets": snapshot.current_asset_total,
        "projected_year_expense": snapshot.annual_expense_total,
        "projected_year_saving": projected_year_saving,
        "target_gap": target_gap,
    }


def analyze_saving_goal(snapshot: AnalysisSnapshot) -> dict:
    """Evaluate whether the user's current saving pace is enough to hit the target."""

    remaining_months = max(12 - snapshot.month, 0)
    projected_year_saving = snapshot.monthly_saving_velocity * 12
    target_gap = max(snapshot.saving_target - projected_year_saving, 0)
    required_monthly_saving = (
        0
        if remaining_months == 0
        else max(snapshot.saving_target - snapshot.current_saved_total, 0) // remaining_months
    )

    if snapshot.saving_target == 0:
        goal_status: Literal["no_target", "on_track", "at_risk", "off_track"] = "no_target"
    elif projected_year_saving >= snapshot.saving_target:
        goal_status = "on_track"
    elif projected_year_saving >= snapshot.saving_target * 0.9:
        goal_status = "at_risk"
    else:
        goal_status = "off_track"

    return {
        "year": snapshot.year,
        "current_saving": snapshot.current_saved_total,
        "saving_target": snapshot.saving_target,
        "saving_progress_rate": 0
        if snapshot.saving_target == 0
        else min(100, round((snapshot.current_saved_total / snapshot.saving_target) * 100)),
        "monthly_saving_velocity": snapshot.monthly_saving_velocity,
        "projected_year_saving": projected_year_saving,
        "goal_status": goal_status,
        "target_gap": target_gap,
        "required_monthly_saving": required_monthly_saving,
        "remaining_months": remaining_months,
    }


def analyze_spending_breakdown(snapshot: AnalysisSnapshot) -> dict:
    """Summarize current spending structure and identify the biggest pressure points."""

    category_buckets: dict[str, int] = {}
    for item in snapshot.expense_items:
        amount = to_current_amount(item, snapshot.month)
        category_buckets[item.name] = category_buckets.get(item.name, 0) + amount

    total_spending = sum(category_buckets.values())
    categories = [
        {
            "name": name,
            "amount": amount,
            "ratio": 0 if total_spending == 0 else round((amount / total_spending) * 100),
        }
        for name, amount in sorted(
            category_buckets.items(), key=lambda item: item[1], reverse=True
        )
    ]

    fixed_spending = sum(
        to_current_amount(item, snapshot.month)
        for item in snapshot.expense_items
        if item.period == "month"
    )
    variable_spending = max(total_spending - fixed_spending, 0)

    return {
        "year": snapshot.year,
        "current_expense": snapshot.current_expense_total,
        "fixed_spending": fixed_spending,
        "variable_spending": variable_spending,
        "top_category": categories[0]["name"] if categories else "",
        "categories": categories,
    }


def build_projection(snapshot: AnalysisSnapshot) -> dict:
    """Project the user's year-end outcome using current income and spending pace."""

    projected_year_saving = snapshot.monthly_saving_velocity * 12
    affordable_expense = max(snapshot.annual_income_total - snapshot.saving_target, 0)
    projected_overspend = max(snapshot.annual_expense_total - affordable_expense, 0)

    if snapshot.saving_target == 0 and projected_overspend == 0:
        risk_level: Literal["low", "medium", "high"] = "low"
    elif projected_overspend > 0 or projected_year_saving < snapshot.saving_target * 0.85:
        risk_level = "high"
    elif projected_year_saving < snapshot.saving_target:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "year": snapshot.year,
        "projected_year_income": snapshot.annual_income_total,
        "projected_year_expense": snapshot.annual_expense_total,
        "projected_year_saving": projected_year_saving,
        "projected_overspend": projected_overspend,
        "target_gap": max(snapshot.saving_target - projected_year_saving, 0),
        "risk_level": risk_level,
    }


def build_recommendation_input(snapshot: AnalysisSnapshot) -> dict:
    """Compress the most important financial facts into a model-friendly payload."""

    spending = analyze_spending_breakdown(snapshot)
    saving = analyze_saving_goal(snapshot)
    projection = build_projection(snapshot)
    return {
        "year": snapshot.year,
        "current_income": snapshot.current_income_total,
        "current_expense": snapshot.current_expense_total,
        "current_saving": snapshot.current_saved_total,
        "saving_target": snapshot.saving_target,
        "saving_gap": saving["target_gap"],
        "top_category": spending["top_category"],
        "risk_level": projection["risk_level"],
        "priority_actions": [
            "reduce_top_expense_category",
            "increase_monthly_saving_velocity",
            "review_fixed_costs",
        ],
    }


def simulate_financial_scenario(
    snapshot: AnalysisSnapshot,
    income_delta: int = 0,
    expense_delta: int = 0,
    saving_target: int | None = None,
) -> dict:
    """Run a simple what-if simulation for chat questions like 'what if I spend less?'."""

    adjusted_income = snapshot.current_income_total + income_delta * snapshot.month
    adjusted_expense = max(snapshot.current_expense_total + expense_delta * snapshot.month, 0)
    adjusted_current_saving = max(adjusted_income - adjusted_expense, 0)
    adjusted_target = snapshot.saving_target if saving_target is None else saving_target
    adjusted_monthly_velocity = round(adjusted_current_saving / max(snapshot.month, 1))
    projected_year_saving = adjusted_monthly_velocity * 12

    return {
        "year": snapshot.year,
        "current_income": adjusted_income,
        "current_expense": adjusted_expense,
        "current_saving": adjusted_current_saving,
        "saving_target": adjusted_target,
        "monthly_saving_velocity": adjusted_monthly_velocity,
        "projected_year_saving": projected_year_saving,
        "target_gap": max(adjusted_target - projected_year_saving, 0),
        "can_hit_target": projected_year_saving >= adjusted_target,
    }
