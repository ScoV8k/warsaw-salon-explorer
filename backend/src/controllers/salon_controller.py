from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from src.models.salon import SalonUpdate
from src.services.salon_service import SalonService


def create_salon_router(service: SalonService) -> APIRouter:
    router = APIRouter()

    @router.get("/salons")
    def get_salons(
        page: int = Query(1, ge=1),
        per_page: int = Query(20, ge=1, le=100),
        district: Optional[str] = None,
        min_rating: Optional[float] = None,
        search: Optional[str] = None,
        sort_by: str = "name",
        sort_order: str = "asc",
    ):
        return service.get_salons(
            page=page,
            per_page=per_page,
            district=district,
            min_rating=min_rating,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    @router.get("/salons/map")
    def get_map_salons():
        return service.get_map_salons()

    @router.get("/salons/{place_id:path}")
    def get_salon(place_id: str):
        salon = service.get_salon_by_id(place_id)
        if not salon:
            raise HTTPException(status_code=404, detail="Salon not found")
        return salon

    @router.patch("/salons/{place_id:path}")
    def update_salon(place_id: str, body: SalonUpdate):
        fields = body.model_dump(exclude_unset=True)
        if not fields:
            raise HTTPException(status_code=422, detail="No fields to update")
        salon = service.update_salon(place_id, fields)
        if not salon:
            raise HTTPException(status_code=404, detail="Salon not found")
        return salon

    @router.get("/districts")
    def get_districts():
        return service.get_districts()

    @router.get("/stats")
    def get_stats():
        return service.get_stats()

    @router.get("/search")
    def search_salons(
        q: str = Query(..., min_length=1),
        limit: int = Query(20, ge=1, le=100),
    ):
        return service.search(q, limit)

    return router
