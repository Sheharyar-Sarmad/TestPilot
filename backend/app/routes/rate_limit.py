# backend/app/routes/rate_limit.py
from fastapi import APIRouter, Depends, Response

from app.services.rate_limit import RateLimitInfo, current_rate_limit

router = APIRouter(prefix="/api/v1/rate-limit", tags=["rate-limit"])


@router.get("/status")
async def status(
    response: Response,
    info: RateLimitInfo = Depends(current_rate_limit),
):
    for k, v in info.to_headers().items():
        response.headers[k] = v
    return {
        "limit": info.limit,
        "remaining": info.remaining,
        "reset_at": info.reset_at,
        "window": info.window,
    }