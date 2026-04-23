from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional, Union

from flask import Blueprint, jsonify, request
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.helpers import error_response, parse_json_body, parse_optional_month, parse_year
from app.db import session_scope
from app.models import AnnualExpenseItem, AnnualIncomeItem, AnnualPlan, AssetItem, User

finance_bp = Blueprint("finance", __name__)


class NamedAmountCreate(BaseModel):
    """Input payload used by income, expense, and asset creation routes."""

    name: str = Field(min_length=1, max_length=100)
    amount: int = Field(ge=0)
    period: str = Field(default="year", pattern="^(year|month)$")


class SavingTargetPayload(BaseModel):
    """Input payload used to set the annual saving target."""

    year: int = Field(ge=2000, le=2100)
    amount: int = Field(ge=0)


class SavingOverviewPayload(BaseModel):
    """Input payload used by the savings overview route."""

    year: int = Field(ge=2000, le=2100)
    target_amount: int = Field(ge=0)
    current_amount: int = Field(ge=0)


def get_or_create_user(db, user_id: str) -> User:
    """Load an existing user or create a lightweight demo user on demand."""

    user = db.get(User, user_id)
    if user is None:
        user = User(id=user_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def to_named_amount_response(
    items: list[Union[AnnualIncomeItem, AnnualExpenseItem, AssetItem]]
) -> list[dict[str, Union[int, str]]]:
    """Serialize ORM items into the JSON shape used by the mobile app."""

    return [
        {
            "id": item.id,
            "name": item.name,
            "amount": item.amount,
            "period": getattr(item, "period", "year"),
        }
        for item in items
    ]


def to_annual_amount(item: Union[AnnualIncomeItem, AnnualExpenseItem, AssetItem]) -> int:
    """Normalize a yearly or monthly record into an annual amount."""

    period = getattr(item, "period", "year")
    return item.amount * 12 if period == "month" else item.amount


def to_monthly_amount(item: Union[AnnualIncomeItem, AnnualExpenseItem]) -> int:
    """Normalize a yearly or monthly record into a monthly amount."""

    period = getattr(item, "period", "year")
    return item.amount if period == "month" else round(item.amount / 12)


def to_current_income_amount(item: AnnualIncomeItem, elapsed_months: int) -> int:
    """Convert income into the amount that should have been received so far this year."""

    return item.amount * elapsed_months if item.period == "month" else item.amount


def to_current_expense_amount(item: AnnualExpenseItem, elapsed_months: int) -> int:
    """Convert expense into the amount that should have been spent so far this year."""

    return item.amount * elapsed_months if item.period == "month" else item.amount


@finance_bp.get("")
def get_user_profile(user_id: str):
    """Return the lightweight user profile used by the mobile 'My' page."""

    with session_scope() as db:
        user = get_or_create_user(db, user_id)
        return jsonify({"id": user.id, "name": user.name}), 200


@finance_bp.get("/analysis")
def get_analysis(user_id: str):
    """Return the yearly or monthly financial analysis used by the analysis tab."""

    year, error = parse_year()
    if error:
        return error

    scope = request.args.get("scope", "yearly")
    if scope not in {"yearly", "monthly"}:
        return error_response("scope must be 'yearly' or 'monthly'.", 400)

    month, month_error = parse_optional_month()
    if month_error:
        return month_error

    with session_scope() as db:
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
        plan = db.scalar(
            select(AnnualPlan).where(AnnualPlan.user_id == user_id, AnnualPlan.year == year)
        )

        reference_month = month or datetime.now().month
        elapsed_months = max(1, min(reference_month, 12))
        annual_income_total = sum(to_annual_amount(item) for item in income_items)
        annual_expense_total = sum(to_annual_amount(item) for item in expense_items)
        current_income_total = sum(
            to_current_income_amount(item, elapsed_months) for item in income_items
        )
        current_expense_total = sum(
            to_current_expense_amount(item, elapsed_months) for item in expense_items
        )
        saving_target = 0 if plan is None else plan.saving_target
        monthly_income_total = round(annual_income_total / 12)
        monthly_expense_total = round(annual_expense_total / 12)
        current_saved_total = max(current_income_total - current_expense_total, 0)
        monthly_saving_velocity = round(current_saved_total / elapsed_months)
        target_rate = (
            0
            if saving_target == 0
            else min(100, round((current_saved_total / saving_target) * 100))
        )

        category_buckets: dict[str, int] = {}
        for item in expense_items:
            amount = (
                to_current_expense_amount(item, elapsed_months)
                if scope == "yearly"
                else to_monthly_amount(item)
            )
            category_buckets[item.name] = category_buckets.get(item.name, 0) + amount

        total_category_amount = sum(category_buckets.values())
        categories = [
            {
                "name": name,
                "amount": amount,
                "ratio": (
                    0 if total_category_amount == 0 else round((amount / total_category_amount) * 100)
                ),
            }
            for name, amount in sorted(
                category_buckets.items(), key=lambda bucket: bucket[1], reverse=True
            )
        ]

        projected_year_expense = annual_expense_total
        projected_year_saving = monthly_saving_velocity * 12
        affordable_expense = max(annual_income_total - saving_target, 0)
        projected_overspend = max(projected_year_expense - affordable_expense, 0)
        target_gap = max(saving_target - projected_year_saving, 0)

        top_category = categories[0]["name"] if categories else "支出"
        top_category_ratio = categories[0]["ratio"] if categories else 0
        if saving_target == 0:
            saving_message = "还未设置储蓄目标，建议先补充目标储蓄。"
        elif projected_year_saving >= saving_target:
            saving_message = "按当前储蓄速度，年底大概率可以达到储蓄目标。"
        else:
            saving_message = "按当前储蓄速度，年底仍有较大概率达不到储蓄目标。"

        if projected_overspend > 0:
            expense_message = (
                f"若保持当前支出结构，全年支出预计会超出可承受范围 {projected_overspend} 元。"
            )
        else:
            expense_message = "当前支出节奏整体可控，暂未出现明显超支风险。"

        return (
            jsonify(
                {
                    "scope": scope,
                    "year": year,
                    "month": reference_month if scope == "monthly" else None,
                    "metrics": {
                        "income": current_income_total if scope == "yearly" else monthly_income_total,
                        "expense": current_expense_total
                        if scope == "yearly"
                        else monthly_expense_total,
                        "saved": current_saved_total if scope == "yearly" else monthly_saving_velocity,
                        "target_rate": target_rate,
                    },
                    "categories": categories,
                    "forecast": {
                        "projected_year_expense": projected_year_expense,
                        "projected_overspend": projected_overspend,
                        "projected_year_saving": projected_year_saving,
                        "target_gap": target_gap,
                    },
                    "insights": [
                        f"{top_category}是当前占比最高的支出项，占总支出的 {top_category_ratio}%。",
                        expense_message,
                        saving_message,
                    ],
                }
            ),
            200,
        )


@finance_bp.get("/annual-income")
def get_annual_income(user_id: str):
    """Return yearly income items and their annualized total."""

    year, error = parse_year()
    if error:
        return error

    with session_scope() as db:
        items = db.scalars(
            select(AnnualIncomeItem)
            .where(AnnualIncomeItem.user_id == user_id, AnnualIncomeItem.year == year)
            .order_by(AnnualIncomeItem.id.asc())
        ).all()
        return (
            jsonify(
                {
                    "year": year,
                    "total_amount": sum(to_annual_amount(item) for item in items),
                    "items": to_named_amount_response(items),
                }
            ),
            200,
        )


@finance_bp.post("/annual-income")
def add_annual_income(user_id: str):
    """Create one yearly income item."""

    year, error = parse_year()
    if error:
        return error

    payload, payload_error = parse_json_body(NamedAmountCreate)
    if payload_error:
        return payload_error

    with session_scope() as db:
        get_or_create_user(db, user_id)
        item = AnnualIncomeItem(
            user_id=user_id,
            year=year,
            name=payload.name,
            amount=payload.amount,
            period=payload.period,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return jsonify({"id": item.id, "name": item.name, "amount": item.amount, "period": item.period}), 201


@finance_bp.get("/annual-expenses")
def get_annual_expenses(user_id: str):
    """Return yearly expense items and their annualized total."""

    year, error = parse_year()
    if error:
        return error

    with session_scope() as db:
        items = db.scalars(
            select(AnnualExpenseItem)
            .where(AnnualExpenseItem.user_id == user_id, AnnualExpenseItem.year == year)
            .order_by(AnnualExpenseItem.id.asc())
        ).all()
        return (
            jsonify(
                {
                    "year": year,
                    "total_amount": sum(to_annual_amount(item) for item in items),
                    "items": to_named_amount_response(items),
                }
            ),
            200,
        )


@finance_bp.post("/annual-expenses")
def add_annual_expense(user_id: str):
    """Create one yearly expense item."""

    year, error = parse_year()
    if error:
        return error

    payload, payload_error = parse_json_body(NamedAmountCreate)
    if payload_error:
        return payload_error

    with session_scope() as db:
        get_or_create_user(db, user_id)
        item = AnnualExpenseItem(
            user_id=user_id,
            year=year,
            name=payload.name,
            amount=payload.amount,
            period=payload.period,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return jsonify({"id": item.id, "name": item.name, "amount": item.amount, "period": item.period}), 201


@finance_bp.get("/annual-saving-target")
def get_annual_saving_target(user_id: str):
    """Return the annual saving target for one user and year."""

    year, error = parse_year()
    if error:
        return error

    with session_scope() as db:
        plan = db.scalar(
            select(AnnualPlan).where(AnnualPlan.user_id == user_id, AnnualPlan.year == year)
        )
        return jsonify({"year": year, "amount": 0 if plan is None else plan.saving_target}), 200


@finance_bp.put("/annual-saving-target")
def set_annual_saving_target(user_id: str):
    """Set the annual saving target."""

    payload, payload_error = parse_json_body(SavingTargetPayload)
    if payload_error:
        return payload_error

    with session_scope() as db:
        get_or_create_user(db, user_id)
        plan = db.scalar(
            select(AnnualPlan).where(
                AnnualPlan.user_id == user_id, AnnualPlan.year == payload.year
            )
        )
        if plan is None:
            plan = AnnualPlan(user_id=user_id, year=payload.year, saving_target=payload.amount)
            db.add(plan)
        else:
            plan.saving_target = payload.amount
        db.commit()
        return jsonify({"year": payload.year, "amount": payload.amount}), 200


@finance_bp.get("/annual-saving")
def get_annual_saving(user_id: str):
    """Return the annual savings overview used by the savings page."""

    year, error = parse_year()
    if error:
        return error

    with session_scope() as db:
        plan = db.scalar(
            select(AnnualPlan).where(AnnualPlan.user_id == user_id, AnnualPlan.year == year)
        )
        if plan is None:
            return jsonify({"year": year, "target_amount": 0, "current_amount": 0}), 200
        return (
            jsonify(
                {
                    "year": year,
                    "target_amount": plan.saving_target,
                    "current_amount": plan.current_saving,
                }
            ),
            200,
        )


@finance_bp.put("/annual-saving")
def set_annual_saving(user_id: str):
    """Set target and current savings together."""

    payload, payload_error = parse_json_body(SavingOverviewPayload)
    if payload_error:
        return payload_error

    with session_scope() as db:
        get_or_create_user(db, user_id)
        plan = db.scalar(
            select(AnnualPlan).where(
                AnnualPlan.user_id == user_id, AnnualPlan.year == payload.year
            )
        )
        if plan is None:
            plan = AnnualPlan(
                user_id=user_id,
                year=payload.year,
                saving_target=payload.target_amount,
                current_saving=payload.current_amount,
            )
            db.add(plan)
        else:
            plan.saving_target = payload.target_amount
            plan.current_saving = payload.current_amount
        db.commit()
        return (
            jsonify(
                {
                    "year": payload.year,
                    "target_amount": payload.target_amount,
                    "current_amount": payload.current_amount,
                }
            ),
            200,
        )


@finance_bp.get("/assets")
def get_assets(user_id: str):
    """Return all fixed assets for one user."""

    with session_scope() as db:
        items = db.scalars(
            select(AssetItem).where(AssetItem.user_id == user_id).order_by(AssetItem.id.asc())
        ).all()
        return (
            jsonify(
                {
                    "year": None,
                    "total_amount": sum(item.amount for item in items),
                    "items": to_named_amount_response(items),
                }
            ),
            200,
        )


@finance_bp.post("/assets")
def add_asset(user_id: str):
    """Create one asset item."""

    payload, payload_error = parse_json_body(NamedAmountCreate)
    if payload_error:
        return payload_error

    with session_scope() as db:
        get_or_create_user(db, user_id)
        item = AssetItem(user_id=user_id, name=payload.name, amount=payload.amount)
        db.add(item)
        db.commit()
        db.refresh(item)
        return jsonify({"id": item.id, "name": item.name, "amount": item.amount, "period": "year"}), 201


@finance_bp.get("/assets/current-value")
def get_current_asset_value(user_id: str):
    """Return the summed asset value used by the 'My' page."""

    with session_scope() as db:
        items = db.scalars(select(AssetItem).where(AssetItem.user_id == user_id)).all()
        return jsonify({"total_amount": sum(item.amount for item in items)}), 200


@finance_bp.delete("/annual-income/<int:item_id>")
def delete_annual_income(user_id: str, item_id: int):
    """Delete one income item if it belongs to the current user."""

    with session_scope() as db:
        item = db.get(AnnualIncomeItem, item_id)
        if item is None or item.user_id != user_id:
            return error_response("Income item not found.", 404)
        db.delete(item)
        db.commit()
        return "", 204


@finance_bp.delete("/annual-expenses/<int:item_id>")
def delete_annual_expense(user_id: str, item_id: int):
    """Delete one expense item if it belongs to the current user."""

    with session_scope() as db:
        item = db.get(AnnualExpenseItem, item_id)
        if item is None or item.user_id != user_id:
            return error_response("Expense item not found.", 404)
        db.delete(item)
        db.commit()
        return "", 204


@finance_bp.delete("/assets/<int:item_id>")
def delete_asset(user_id: str, item_id: int):
    """Delete one asset item if it belongs to the current user."""

    with session_scope() as db:
        item = db.get(AssetItem, item_id)
        if item is None or item.user_id != user_id:
            return error_response("Asset item not found.", 404)
        db.delete(item)
        db.commit()
        return "", 204
