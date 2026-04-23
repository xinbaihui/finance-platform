from __future__ import annotations

from flask import Blueprint, jsonify
from sqlalchemy import select

from app.db import session_scope
from app.models import AnnualExpenseItem, AnnualIncomeItem, AnnualPlan, AssetItem, User

admin_bp = Blueprint("admin", __name__)


def format_timestamp(value) -> str:
    """Format datetime values into a simple admin-friendly string."""

    if value is None:
        return "--"
    return value.strftime("%Y-%m-%d %H:%M")


def to_annual_amount(item) -> int:
    """Normalize one yearly or monthly record into an annual amount."""

    period = getattr(item, "period", "year")
    return item.amount * 12 if period == "month" else item.amount


@admin_bp.get("/users")
def list_users():
    """Return the user list used by the admin console."""

    with session_scope() as db:
        users = db.scalars(select(User).order_by(User.updated_at.desc(), User.created_at.desc())).all()
        items = [
            {
                "id": user.id,
                "name": user.name,
                "email": "--",
                "role": "Standard",
                "status": "Active",
                "createdAt": format_timestamp(user.created_at),
                "updatedAt": format_timestamp(user.updated_at),
            }
            for user in users
        ]

    return jsonify({"items": items, "total": len(items)}), 200


@admin_bp.get("/users/<string:user_id>")
def get_user_detail(user_id: str):
    """Return one user's finance summary for the admin detail panel."""

    year = 2026

    with session_scope() as db:
        user = db.get(User, user_id)
        if user is None:
            return jsonify({"detail": "User not found"}), 404

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

        annual_income = sum(to_annual_amount(item) for item in income_items)
        annual_expense = sum(to_annual_amount(item) for item in expense_items)
        asset_total = sum(item.amount for item in asset_items)
        saving_target = 0 if plan is None else plan.saving_target

        payload = {
            "id": user.id,
            "name": user.name,
            "year": year,
            "metrics": {
                "assetTotal": asset_total,
                "annualIncome": annual_income,
                "annualExpense": annual_expense,
                "savingTarget": saving_target,
            },
            "incomeItems": [
                {
                    "id": item.id,
                    "name": item.name,
                    "amount": item.amount,
                    "period": item.period,
                }
                for item in income_items
            ],
            "expenseItems": [
                {
                    "id": item.id,
                    "name": item.name,
                    "amount": item.amount,
                    "period": item.period,
                }
                for item in expense_items
            ],
        }

    return jsonify(payload), 200
