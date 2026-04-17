from fastapi import APIRouter

from app.api.chat import chat_router

api_router = APIRouter()
api_router.include_router(chat_router)


@api_router.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
