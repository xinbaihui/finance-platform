from fastapi import APIRouter

from app.api.chat import chat_router
from app.api.chat_context import chat_context_router
from app.api.finance import finance_router

api_router = APIRouter()
api_router.include_router(chat_router)
api_router.include_router(chat_context_router)
api_router.include_router(finance_router)


@api_router.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
