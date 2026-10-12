# app/services/rate_limit.py
"""
Fixed-window rate limiter backed by Redis INCR + EXPIRE.

Attaches rate-limit headers to every response so the frontend can show
remaining quota. Raises `RateLimitExceeded` (handled globally in main.py)
when the limit is exceeded.
"""
from __future__ import annotations

import time
from dataclasses import dataclass

from fastapi import Request, Response

from config.redis_config import RedisManager
from security.settings import get_settings

settings = get_settings()


# ============================================================================
# Exception
# ============================================================================

class RateLimitExceeded(Exception):
    """
    Raised when a client exceeds the rate limit.

    Carries a RateLimitInfo so the global exception handler in main.py
    can attach the correct X-RateLimit-* headers to the 429 response.
    """

    def __init__(self, message: str, info: "RateLimitInfo") -> None:
        super().__init__(message)
        self.message = message
        self.info = info


# ============================================================================
# Info payload
# ============================================================================

@dataclass
class RateLimitInfo:
    limit: int
    remaining: int
    reset_at: int  # unix seconds
    window: int    # seconds

    def to_headers(self) -> dict[str, str]:
        return {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(self.remaining),
            "X-RateLimit-Reset": str(self.reset_at),
            "X-RateLimit-Window": str(self.window),
        }


# ============================================================================
# Helpers
# ============================================================================

def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _bump(key: str, window: int) -> tuple[int, int]:
    """INCR the counter, set TTL on first hit, return (count, ttl)."""
    redis = RedisManager.get_client()
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window)
    ttl = await redis.ttl(key)
    if ttl < 0:
        ttl = window
    return count, ttl


# ============================================================================
# Dependencies
# ============================================================================

async def enforce_rate_limit(request: Request, response: Response) -> None:
    """
    FastAPI dependency. Increments the per-IP counter, attaches X-RateLimit-*
    headers to the response, and raises RateLimitExceeded on overflow.
    """
    ip = client_ip(request)
    now = int(time.time())

    # --- per-IP window ---
    ip_bucket = now // settings.PER_IP_WINDOW_SECONDS
    ip_key = f"ratelimit:ip:{ip}:{ip_bucket}"
    count, ttl = await _bump(ip_key, settings.PER_IP_WINDOW_SECONDS)

    info = RateLimitInfo(
        limit=settings.PER_IP_LIMIT,
        remaining=max(0, settings.PER_IP_LIMIT - count),
        reset_at=now + ttl,
        window=settings.PER_IP_WINDOW_SECONDS,
    )

    # Always attach headers, even on success
    for k, v in info.to_headers().items():
        response.headers[k] = v

    if count > settings.PER_IP_LIMIT:
        raise RateLimitExceeded(
            f"Rate limit exceeded. Retry in {ttl}s.",
            info,
        )

    # --- global window (hard ceiling, no headers) ---
    global_bucket = now // settings.GLOBAL_WINDOW_SECONDS
    global_key = f"ratelimit:global:{global_bucket}"
    global_count, _ = await _bump(global_key, settings.GLOBAL_WINDOW_SECONDS)

    if global_count > settings.GLOBAL_LIMIT:
        raise RateLimitExceeded(
            "Global rate limit reached. Try again later.",
            info,
        )


async def current_rate_limit(request: Request) -> RateLimitInfo:
    """Read the current counter without incrementing. Used by /status endpoint."""
    ip = client_ip(request)
    now = int(time.time())
    ip_bucket = now // settings.PER_IP_WINDOW_SECONDS
    ip_key = f"ratelimit:ip:{ip}:{ip_bucket}"

    redis = RedisManager.get_client()
    raw = await redis.get(ip_key)
    count = int(raw) if raw else 0
    ttl = await redis.ttl(ip_key)
    if ttl < 0:
        ttl = settings.PER_IP_WINDOW_SECONDS

    return RateLimitInfo(
        limit=settings.PER_IP_LIMIT,
        remaining=max(0, settings.PER_IP_LIMIT - count),
        reset_at=now + ttl,
        window=settings.PER_IP_WINDOW_SECONDS,
    )