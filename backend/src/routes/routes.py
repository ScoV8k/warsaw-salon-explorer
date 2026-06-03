from fastapi import FastAPI

from src.controllers.salon_controller import create_salon_router
from src.controllers.photo_controller import create_photo_router
from src.services.salon_service import SalonService


def register_routes(app: FastAPI, service: SalonService):
    salon_router = create_salon_router(service)
    photo_router = create_photo_router()
    app.include_router(salon_router, prefix="/api")
    app.include_router(photo_router, prefix="/api")
