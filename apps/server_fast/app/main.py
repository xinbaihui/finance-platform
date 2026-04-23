from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.router import api_router
from app.core.config import settings
from app.db import Base, engine
from app import models  # noqa: F401

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

if engine.url.get_backend_name() == "sqlite":
    with engine.begin() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("annual_plans")}
        if "current_saving" not in columns:
            connection.execute(text("ALTER TABLE annual_plans ADD COLUMN current_saving INTEGER DEFAULT 0"))
        income_columns = {
            column["name"] for column in inspect(connection).get_columns("annual_income_items")
        }
        if "period" not in income_columns:
            connection.execute(
                text("ALTER TABLE annual_income_items ADD COLUMN period TEXT DEFAULT 'year'")
            )
        expense_columns = {
            column["name"] for column in inspect(connection).get_columns("annual_expense_items")
        }
        if "period" not in expense_columns:
            connection.execute(
                text("ALTER TABLE annual_expense_items ADD COLUMN period TEXT DEFAULT 'year'")
            )

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"message": "Finance Agent server scaffold is ready."}
