from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi import Path as PathParam
from fastapi.responses import FileResponse

from src.services.photo_service import PhotoService, PhotoUnavailable

IMMUTABLE_HEADERS = {"Cache-Control": "public, max-age=31536000, immutable"}


def _media_type(path: Path) -> str:
    with open(path, "rb") as f:
        head = f.read(12)
    if head.startswith(b"\x89PNG"):
        return "image/png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _serve(path: Path) -> FileResponse:
    return FileResponse(path, media_type=_media_type(path), headers=IMMUTABLE_HEADERS)


def create_photo_router(photos: PhotoService) -> APIRouter:
    router = APIRouter()

    @router.get("/photos/{place_id}/{index}")
    async def get_photo(
        place_id: str = PathParam(pattern=r"^[A-Za-z0-9_-]+$", max_length=200),
        index: int = PathParam(ge=0, le=9),
        fetch: bool = False,
    ):
        """Cached photo. Without `fetch=1` Google is never called, so lists and
        the map cost nothing; the salon detail view passes `fetch=1`."""
        path = photos.cached_path(place_id, index)
        if path:
            return _serve(path)
        if not fetch:
            raise HTTPException(404, "Photo not cached", headers={"Cache-Control": "no-store"})
        try:
            path = await photos.fetch(place_id, index)
        except PhotoUnavailable as e:
            raise HTTPException(e.status, e.reason, headers={"Cache-Control": "no-store", **e.headers})
        return _serve(path)

    return router
