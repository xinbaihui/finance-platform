from datetime import datetime
from typing import Annotated, Literal, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AnnualExpenseItem, AnnualIncomeItem, AnnualPlan, AssetItem, User

finance_router = APIRouter(prefix="/users/{user_id}", tags=["finance"])

YearParam = Annotated[int, Query(ge=2000, le=2100)]


class NamedAmountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: int = Field(ge=0)
    period: str = Field(default="year", pattern="^(year|month)$")


class NamedAmountResponse(BaseModel):
    id: int
    name: str
    amount: int
    period: str


class NamedAmountListResponse(BaseModel):
    year: Optional[int] = None
    total_amount: int
    items: list[NamedAmountResponse]


class SavingTargetPayload(BaseModel):
    year: int = Field(ge=2000, le=2100)
    amount: int = Field(ge=0)


class SavingTargetResponse(BaseModel):
    year: int
    amount: int


class SavingOverviewPayload(BaseModel):
    year: int = Field(ge=2000, le=2100)
    target_amount: int = Field(ge=0)
    current_amount: int = Field(ge=0)


class SavingOverviewResponse(BaseModel):
    year: int
    target_amount: int
    current_amount: int


class CurrentAssetValueResponse(BaseModel):
    total_amount: int


class UserProfileResponse(BaseModel):
    id: str
    name: str


class AnalysisCategoryResponse(BaseModel):
    name: str
    amount: int
    ratio: int


class AnalysisMetricsResponse(BaseModel):
    income: int
    expense: int
    saved: int
    target_rate: int


class AnalysisForecastResponse(BaseModel):
    projected_year_expense: int
    projected_overspend: int
    projected_year_saving: int
    target_gap: int


class AnalysisResponse(BaseModel):
    scope: Literal["yearly", "monthly"]
    year: int
    month: Optional[int] = None
    metrics: AnalysisMetricsResponse
    categories: list[AnalysisCategoryResponse]
    forecast: AnalysisForecastResponse
    insights: list[str]


def get_or_create_user(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if user is None:
        user = User(id=user_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def to_named_amount_response(
    items: list[Union[AnnualIncomeItem, AnnualExpenseItem, AssetItem]]
) -> list[NamedAmountResponse]:
    return [
        NamedAmountResponse(
            id=item.id,
            name=item.name,
            amount=item.amount,
            period=getattr(item, "period", "year"),
        )
        for item in items
    ]


def to_annual_amount(item: Union[AnnualIncomeItem, AnnualExpenseItem, AssetItem]) -> int:
    period = getattr(item, "period", "year")
    return item.amount * 12 if period == "month" else item.amount


def to_monthly_amount(item: Union[AnnualIncomeItem, AnnualExpenseItem]) -> int:
    period = getattr(item, "period", "year")
    return item.amount if period == "month" else round(item.amount / 12)


def to_current_income_amount(item: AnnualIncomeItem, elapsed_months: int) -> int:
    return item.amount * elapsed_months if item.period == "month" else item.amount


def to_current_expense_amount(item: AnnualExpenseItem, elapsed_months: int) -> int:
    return item.amount * elapsed_months if item.period == "month" else item.amount


@finance_router.get("", response_model=UserProfileResponse)
def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
) -> UserProfileResponse:
    user = get_or_create_user(db, user_id)
    return UserProfileResponse(id=user.id, name=user.name)


@finance_router.get("/analysis", response_model=AnalysisResponse)
def get_analysis(
    user_id: str,
    year: YearParam,
    scope: Literal["yearly", "monthly"] = Query(default="yearly"),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
) -> AnalysisResponse:
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
    current_saving = 0 if plan is None else plan.current_saving
    monthly_income_total = round(annual_income_total / 12)
    monthly_expense_total = round(annual_expense_total / 12)
    current_saved_total = max(current_income_total - current_expense_total, 0)
    monthly_saving_velocity = round(current_saved_total / elapsed_months)
    target_rate = 0 if saving_target == 0 else min(
        100, round((current_saved_total / saving_target) * 100)
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
        AnalysisCategoryResponse(
            name=name,
            amount=amount,
            ratio=0 if total_category_amount == 0 else round((amount / total_category_amount) * 100),
        )
        for name, amount in sorted(
            category_buckets.items(), key=lambda item: item[1], reverse=True
        )
    ]

    projected_year_expense = annual_expense_total
    projected_year_saving = monthly_saving_velocity * 12
    affordable_expense = max(annual_income_total - saving_target, 0)
    projected_overspend = max(projected_year_expense - affordable_expense, 0)
    target_gap = max(saving_target - projected_year_saving, 0)

    top_category = categories[0].name if categories else "支出"
    top_category_ratio = categories[0].ratio if categories else 0
    if saving_target == 0:
        saving_message = "还未设置储蓄目标，建议先补充目标储蓄。"
    elif projected_year_saving >= saving_target:
        saving_message = "按当前储蓄速度，年底大概率可以达到储蓄目标。"
    else:
        saving_message = "按当前储蓄速度，年底仍有较大概率达不到储蓄目标。"

    if projected_overspend > 0:
        expense_message = f"若保持当前支出结构，全年支出预计会超出可承受范围 {projected_overspend} 元。"
    else:
        expense_message = "当前支出节奏整体可控，暂未出现明显超支风险。"

    insights = [
        f"{top_category}是当前占比最高的支出项，占总支出的 {top_category_ratio}%。",
        expense_message,
        saving_message,
    ]

    metrics = AnalysisMetricsResponse(
        income=current_income_total if scope == "yearly" else monthly_income_total,
        expense=current_expense_total if scope == "yearly" else monthly_expense_total,
        saved=current_saved_total if scope == "yearly" else monthly_saving_velocity,
        target_rate=target_rate,
    )

    forecast = AnalysisForecastResponse(
        projected_year_expense=projected_year_expense,
        projected_overspend=projected_overspend,
        projected_year_saving=projected_year_saving,
        target_gap=target_gap,
    )

    return AnalysisResponse(
        scope=scope,
        year=year,
        month=reference_month if scope == "monthly" else None,
        metrics=metrics,
        categories=categories,
        forecast=forecast,
        insights=insights,
    )


@finance_router.get("/annual-income", response_model=NamedAmountListResponse)
def get_annual_income(
    user_id: str,
    year: YearParam,
    db: Session = Depends(get_db),
) -> NamedAmountListResponse:
    items = db.scalars(
        select(AnnualIncomeItem)
        .where(AnnualIncomeItem.user_id == user_id, AnnualIncomeItem.year == year)
        .order_by(AnnualIncomeItem.id.asc())
    ).all()
    total_amount = sum(to_annual_amount(item) for item in items)
    return NamedAmountListResponse(
        year=year,
        total_amount=total_amount,
        items=to_named_amount_response(items),
    )


@finance_router.post("/annual-income", response_model=NamedAmountResponse, status_code=201)
def add_annual_income(
    user_id: str,
    year: YearParam,
    payload: NamedAmountCreate,
    db: Session = Depends(get_db),
) -> NamedAmountResponse:
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
    return NamedAmountResponse(id=item.id, name=item.name, amount=item.amount, period=item.period)


@finance_router.get("/annual-expenses", response_model=NamedAmountListResponse)
def get_annual_expenses(
    user_id: str,
    year: YearParam,
    db: Session = Depends(get_db),
) -> NamedAmountListResponse:
    items = db.scalars(
        select(AnnualExpenseItem)
        .where(AnnualExpenseItem.user_id == user_id, AnnualExpenseItem.year == year)
        .order_by(AnnualExpenseItem.id.asc())
    ).all()
    total_amount = sum(to_annual_amount(item) for item in items)
    return NamedAmountListResponse(
        year=year,
        total_amount=total_amount,
        items=to_named_amount_response(items),
    )


@finance_router.post("/annual-expenses", response_model=NamedAmountResponse, status_code=201)
def add_annual_expense(
    user_id: str,
    year: YearParam,
    payload: NamedAmountCreate,
    db: Session = Depends(get_db),
) -> NamedAmountResponse:
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
    return NamedAmountResponse(id=item.id, name=item.name, amount=item.amount, period=item.period)


@finance_router.get("/annual-saving-target", response_model=SavingTargetResponse)
def get_annual_saving_target(
    user_id: str,
    year: YearParam,
    db: Session = Depends(get_db),
) -> SavingTargetResponse:
    plan = db.scalar(
        select(AnnualPlan).where(AnnualPlan.user_id == user_id, AnnualPlan.year == year)
    )
    amount = 0 if plan is None else plan.saving_target
    return SavingTargetResponse(year=year, amount=amount)


@finance_router.put("/annual-saving-target", response_model=SavingTargetResponse)
def set_annual_saving_target(
    user_id: str,
    payload: SavingTargetPayload,
    db: Session = Depends(get_db),
) -> SavingTargetResponse:
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
    return SavingTargetResponse(year=payload.year, amount=payload.amount)


@finance_router.get("/annual-saving", response_model=SavingOverviewResponse)
def get_annual_saving(
    user_id: str,
    year: YearParam,
    db: Session = Depends(get_db),
) -> SavingOverviewResponse:
    plan = db.scalar(
        select(AnnualPlan).where(AnnualPlan.user_id == user_id, AnnualPlan.year == year)
    )
    if plan is None:
        return SavingOverviewResponse(year=year, target_amount=0, current_amount=0)
    return SavingOverviewResponse(
        year=year,
        target_amount=plan.saving_target,
        current_amount=plan.current_saving,
    )


@finance_router.put("/annual-saving", response_model=SavingOverviewResponse)
def set_annual_saving(
    user_id: str,
    payload: SavingOverviewPayload,
    db: Session = Depends(get_db),
) -> SavingOverviewResponse:
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
    return SavingOverviewResponse(
        year=payload.year,
        target_amount=payload.target_amount,
        current_amount=payload.current_amount,
    )


@finance_router.get("/assets", response_model=NamedAmountListResponse)
def get_assets(
    user_id: str,
    db: Session = Depends(get_db),
) -> NamedAmountListResponse:
    items = db.scalars(
        select(AssetItem).where(AssetItem.user_id == user_id).order_by(AssetItem.id.asc())
    ).all()
    total_amount = sum(item.amount for item in items)
    return NamedAmountListResponse(
        total_amount=total_amount,
        items=to_named_amount_response(items),
    )


@finance_router.post("/assets", response_model=NamedAmountResponse, status_code=201)
def add_asset(
    user_id: str,
    payload: NamedAmountCreate,
    db: Session = Depends(get_db),
) -> NamedAmountResponse:
    get_or_create_user(db, user_id)
    item = AssetItem(user_id=user_id, name=payload.name, amount=payload.amount)
    db.add(item)
    db.commit()
    db.refresh(item)
    return NamedAmountResponse(id=item.id, name=item.name, amount=item.amount, period="year")


@finance_router.get("/assets/current-value", response_model=CurrentAssetValueResponse)
def get_current_asset_value(
    user_id: str,
    db: Session = Depends(get_db),
) -> CurrentAssetValueResponse:
    items = db.scalars(select(AssetItem).where(AssetItem.user_id == user_id)).all()
    total_amount = sum(item.amount for item in items)
    return CurrentAssetValueResponse(total_amount=total_amount)


@finance_router.delete("/annual-income/{item_id}", status_code=204)
def delete_annual_income(
    user_id: str,
    item_id: int,
    db: Session = Depends(get_db),
) -> None:
    item = db.get(AnnualIncomeItem, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Income item not found.")
    db.delete(item)
    db.commit()


@finance_router.delete("/annual-expenses/{item_id}", status_code=204)
def delete_annual_expense(
    user_id: str,
    item_id: int,
    db: Session = Depends(get_db),
) -> None:
    item = db.get(AnnualExpenseItem, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Expense item not found.")
    db.delete(item)
    db.commit()


@finance_router.delete("/assets/{item_id}", status_code=204)
def delete_asset(
    user_id: str,
    item_id: int,
    db: Session = Depends(get_db),
) -> None:
    item = db.get(AssetItem, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Asset item not found.")
    db.delete(item)
    db.commit()
