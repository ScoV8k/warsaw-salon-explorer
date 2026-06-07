import os
import re
import time

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
PLACES_API_KEY = os.getenv("PLACES_API_KEY", "")

PHOTO_NAME_RE = re.compile(r"^places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+$")

url_cache = {}
CACHE_TTL = 86400 

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

        cache_key = f"{photo_name}_{max_width}"
        current_time = time.time()

        if cache_key in url_cache:
            cached_url, expiry = url_cache[cache_key]
            if current_time < expiry:
                return RedirectResponse(
                    url=cached_url,
                    status_code=302,
                    headers={
                        "Cache-Control": "public, max-age=86400, immutable",
                    },
                )

        url = f"https://places.googleapis.com/v1/{photo_name}/media"
        params = {
            "maxWidthPx": max_width,
            "key": PLACES_API_KEY,
            "skipHttpRedirect": "true",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)

        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch photo URL from Google")

        data = resp.json()
        photo_uri = data.get("photoUri")

        if not photo_uri:
            raise HTTPException(status_code=404, detail="Photo URI not found")

        # 3. Zapisz w cache
        url_cache[cache_key] = (photo_uri, current_time + CACHE_TTL)

        return RedirectResponse(
            url=photo_uri,
            status_code=302,
            headers={
                "Cache-Control": "public, max-age=86400, immutable",
            },
        )

    return router