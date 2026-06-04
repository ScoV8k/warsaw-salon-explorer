import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.repositories.salon_repository import SalonRepository
from src.services.salon_service import SalonService
from src.routes.routes import register_routes

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "salons.db")


def create_app() -> FastAPI:
    app = FastAPI(title="Beauty Salons API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    repo = SalonRepository(DB_PATH)
    service = SalonService(repo)
    register_routes(app, service)

    @app.get("/")
    def health():
        return {"status": "ok", "message": "Beauty Salons API"}

    return app
