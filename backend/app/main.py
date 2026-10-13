# backend/app/main.py
"""
FastAPI application factory for TestPilot AI.

Middleware order (outermost → innermost):
  1. CORS
  2. RequestID  (tags every response with X-Request-ID)
  3. RateLimit  (per-IP + global, skips CORS preflight)

Exception handlers:
  - RateLimitExceeded  → 429 with X-RateLimit-* headers
  - RequestValidationError → 422 with structured errors
  - Exception → 500 with a generic message
"""
from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from config.redis_config import RedisManager
from app.routes import health_router, processes_router, rate_limit_router
from app.services.rate_limit import (
    RateLimitExceeded,
    enforce_rate_limit,
)
from security.settings import get_settings

settings = get_settings()


# lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    await RedisManager.initialize()
    yield
    await RedisManager.close()


# app
app = FastAPI(
    title="TestPilot AI",
    version="0.1.0",
    description="AI-powered single-file code debugging, repair, and verification.",
    lifespan=lifespan,
)


# CORS
_allowed_origins = (
    ["*"] if settings.APP_ENV == "development" else [settings.FRONTEND_URL]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=[
        "X-Request-ID",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "X-RateLimit-Window",
    ],
)


# RequestID
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response


app.add_middleware(RequestIDMiddleware)


# RateLimit
class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Applies the rate limiter to every non-OPTIONS request.
    Copies X-RateLimit-* headers onto the real response and converts
    RateLimitExceeded into a 429 JSON response.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip CORS preflight and health checks
        if request.method == "OPTIONS" or request.url.path == "/health":
            return await call_next(request)

        # Use a throwaway Response to collect headers from enforce_rate_limit
        scratch = Response()

        try:
            await enforce_rate_limit(request, scratch)
        except RateLimitExceeded as exc:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"error": "rate_limited", "detail": exc.message},
                headers=exc.info.to_headers(),
            )

        response = await call_next(request)

        # Copy rate-limit headers from the scratch response
        for key, value in scratch.headers.items():
            if key.lower().startswith("x-ratelimit-"):
                response.headers[key] = value

        return response


app.add_middleware(RateLimitMiddleware)


# routers
app.include_router(health_router)
app.include_router(processes_router)
app.include_router(rate_limit_router)


# errors
@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"error": "rate_limited", "detail": exc.message},
        headers=exc.info.to_headers(),
    )


@app.exception_handler(RequestValidationError)
async def _validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "validation_error", "detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def _unhandled_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "internal_error", "detail": "An unexpected error occurred."},
    )