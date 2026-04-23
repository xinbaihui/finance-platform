from __future__ import annotations

from typing import Optional, TypeVar

from flask import jsonify, request
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)


def error_response(detail: str, status_code: int):
    """Return a JSON error payload that matches the existing mobile expectations."""

    return jsonify({"detail": detail}), status_code


def parse_year() -> tuple[Optional[int], Optional[tuple]]:
    """Parse and validate the required year query parameter."""

    raw_year = request.args.get("year")
    if raw_year is None:
        return None, error_response("Missing required query parameter: year", 400)

    try:
        year = int(raw_year)
    except ValueError:
        return None, error_response("year must be an integer.", 400)

    if year < 2000 or year > 2100:
        return None, error_response("year must be between 2000 and 2100.", 400)

    return year, None


def parse_optional_month() -> tuple[Optional[int], Optional[tuple]]:
    """Parse and validate the optional month query parameter."""

    raw_month = request.args.get("month")
    if raw_month is None:
        return None, None

    try:
        month = int(raw_month)
    except ValueError:
        return None, error_response("month must be an integer.", 400)

    if month < 1 or month > 12:
        return None, error_response("month must be between 1 and 12.", 400)

    return month, None


def parse_json_body(model_cls: type[T]) -> tuple[Optional[T], Optional[tuple]]:
    """Validate a JSON request body with Pydantic inside a Flask route."""

    payload = request.get_json(silent=True) or {}
    try:
        return model_cls.model_validate(payload), None
    except ValidationError as exc:
        return None, error_response(exc.errors()[0]["msg"], 400)
