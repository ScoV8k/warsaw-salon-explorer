from fastapi import FastAPI

from src.controllers.salon_controller import create_salon_router
from src.controllers.photo_controller import create_photo_router
from src.services.photo_service import PhotoService
from src.services.salon_service import SalonService


def register_routes(app: FastAPI, service: SalonService, photos: PhotoService):
    app.include_router(create_salon_router(service), prefix="/api")
    app.include_router(create_photo_router(photos), prefix="/api")
