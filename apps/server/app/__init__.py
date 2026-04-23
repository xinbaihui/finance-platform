from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import inspect, text

from app.api.chat import chat_bp
from app.api.chat_context import chat_context_bp
from app.api.finance import finance_bp
from app.core.config import settings
from app.db import Base, engine
from app import models  # noqa: F401


def ensure_sqlite_columns() -> None:
    """Patch SQLite tables in-place for lightweight local development migrations."""

    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as connection:
        columns = {column["name"] for column in inspect(connection).get_columns("annual_plans")}
        if "current_saving" not in columns:
            connection.execute(
                text("ALTER TABLE annual_plans ADD COLUMN current_saving INTEGER DEFAULT 0")
            )

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


def create_app() -> Flask:
    """Create and configure the Flask application."""

    app = Flask(__name__)
    app.config["JSON_AS_ASCII"] = False
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    Base.metadata.create_all(bind=engine)
    ensure_sqlite_columns()

    @app.get("/")
    def root() -> tuple[dict[str, str], int]:
        return {"message": "Finance Agent Flask server is ready."}, 200

    @app.get("/api/health")
    def health_check() -> tuple[dict[str, str], int]:
        return {"status": "ok"}, 200

    @app.errorhandler(404)
    def not_found(_error: Exception) -> tuple[dict[str, str], int]:
        return {"detail": "Not Found"}, 404

    @app.errorhandler(405)
    def method_not_allowed(_error: Exception) -> tuple[dict[str, str], int]:
        return {"detail": "Method Not Allowed"}, 405

    @app.errorhandler(500)
    def internal_error(_error: Exception) -> tuple[dict[str, str], int]:
        return {"detail": "Internal Server Error"}, 500

    app.register_blueprint(finance_bp, url_prefix=f"{settings.api_prefix}/users/<string:user_id>")
    app.register_blueprint(
        chat_context_bp,
        url_prefix=f"{settings.api_prefix}/users/<string:user_id>/chat-context",
    )
    app.register_blueprint(chat_bp, url_prefix=f"{settings.api_prefix}/chat")

    return app


app = create_app()
