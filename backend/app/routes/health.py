# app/routes/health.py
from fastapi import APIRouter
from config.redis_config import RedisManager

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    redis_ok = await RedisManager.is_healthy()
    return {
        "status": "ok" if redis_ok else "degraded",
        "checks": {"redis": "ok" if redis_ok else "unreachable"},
    }