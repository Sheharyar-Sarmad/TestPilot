# backend/app/routes/__init__.py
from app.routes.health import router as health_router
from app.routes.processes import router as processes_router
from app.routes.rate_limit import router as rate_limit_router

__all__ = ["health_router", "processes_router", "rate_limit_router"]