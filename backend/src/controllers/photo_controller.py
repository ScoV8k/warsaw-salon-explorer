import os
import re

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
PLACES_API_KEY = os.getenv("PLACES_API_KEY", "")

PHOTO_NAME_RE = re.compile(r"^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$")


def create_photo_router() -> APIRouter:
    router = APIRouter()

    @router.get("/photos/{photo_name:path}")
    async def get_photo(
        photo_name: str,
        max_width: int = Query(800, ge=100, le=4800),
    ):
        if not PLACES_API_KEY:
            raise HTTPException(status_code=503, detail="Photo service unavailable")

        if not PHOTO_NAME_RE.match(photo_name):
            raise HTTPException(status_code=400, detail="Invalid photo reference")

        url = f"https://places.googleapis.com/v1/{photo_name}/media"
        params = {
            "maxWidthPx": max_width,
            "key": PLACES_API_KEY,
        }

        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            resp = await client.get(url, params=params)

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch photo from Google")

        content_type = resp.headers.get("content-type", "image/jpeg")

        return Response(
            content=resp.content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=86400, immutable",
            },
        )

    return router
