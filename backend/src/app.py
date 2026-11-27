from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src import config
from src.repositories.salon_repository import SalonRepository
from src.services.api_budget import ApiBudget
from src.services.photo_service import PHOTO, PhotoService
from src.services.salon_service import SalonService
from src.routes.routes import register_routes


class JSONGZipMiddleware(GZipMiddleware):
    """Gzip API responses, but leave already-compressed photos alone."""

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope["path"].startswith("/api/photos/"):
            await self.app(scope, receive, send)
            return
        await super().__call__(scope, receive, send)


def create_app(
    db_path: str = config.DB_PATH,
    photo_cache_dir: str = config.PHOTO_CACHE_DIR,
    places_api_key: str = config.PLACES_API_KEY,
    daily_budget: int = config.PLACES_DAILY_BUDGET,
    daily_photo_budget: int = config.PLACES_DAILY_PHOTO_BUDGET,
    http_client: Optional[httpx.AsyncClient] = None,
) -> FastAPI:
    repo = SalonRepository(db_path)
    budget = ApiBudget(db_path, daily_budget, kind_limits={PHOTO: daily_photo_budget})
    photos = PhotoService(repo, budget, places_api_key, photo_cache_dir, client=http_client)
    service = SalonService(repo)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        await photos.aclose()

    app = FastAPI(title="Beauty Salons API", lifespan=lifespan)

    app.add_middleware(JSONGZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.ALLOWED_ORIGINS,
        allow_origin_regex=config.ALLOWED_ORIGIN_REGEX or None,
        allow_methods=["GET", "PATCH", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    register_routes(app, service, photos)

    @app.get("/")
    def root():
        return {"status": "ok", "message": "Beauty Salons API"}

    @app.get("/api/health")
    def health():
        return {"status": "ok", "photo_budget": budget.usage()}

    return app
