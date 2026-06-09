import logging
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import get_settings
from app.middleware.error_handler import register_error_handlers
from app.utils.security import check_rate_limit, add_security_headers, _rate_limit_store
from app.api.routes import (
    risk,
    heatmap,
    sos,
    chat,
    health,
    reports,
)

logger = logging.getLogger("avana")
START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Avana AI backend starting (environment: %s)", settings.environment)
    yield
    logger.info("Avana AI backend shutting down")
    _rate_limit_store.clear()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Avana AI Backend API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs" if settings.debug else None,
        redoc_url="/api/redoc" if settings.debug else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def security_middleware(request: Request, call_next):
        if not check_rate_limit(request):
            return JSONResponse(
                status_code=429,
                content={"error": "Too many requests. Please try again later."},
            )
        response = await call_next(request)
        add_security_headers(response)
        return response

    register_error_handlers(app)

    app.include_router(health.router)
    app.include_router(risk.router)
    app.include_router(heatmap.router)
    app.include_router(sos.router)
    app.include_router(chat.router)
    app.include_router(reports.router)

    @app.get("/")
    async def root():
        return {
            "service": "Avana AI Backend",
            "status": "running",
            "version": "1.0.0",
            "uptime": time.time() - START_TIME,
            "documentation": f"/api/docs" if settings.debug else None,
        }

    @app.get("/api")
    async def api_root():
        return {
            "service": "Avana AI Backend API",
            "version": "1.0.0",
            "endpoints": [
                "GET  /",
                "GET  /health",
                "GET  /api/health",
                "POST /api/risk",
                "POST /api/assess-risk",
                "GET  /api/heatmap",
                "POST /api/sos",
                "POST /api/sos-alert",
                "POST /api/chat",
                "GET  /api/chat/test",
                "POST /api/analyze-report",
                "GET  /api/reports",
            ],
        }

    return app


app = create_app()


if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug,
    )
