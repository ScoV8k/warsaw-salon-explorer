import asyncio
import hashlib
import os
import time
from pathlib import Path
from typing import Optional

import httpx

from src.repositories.salon_repository import SalonRepository
from src.services.api_budget import ApiBudget

# One size for thumbnails and the lightbox: every photo costs at most one Google call.
PHOTO_WIDTH = 800
MAX_PHOTOS = 5

PERMANENT_FAILURE_TTL = 24 * 3600
TRANSIENT_FAILURE_TTL = 5 * 60


class PhotoUnavailable(Exception):
    def __init__(self, status: int = 404, reason: str = "Photo unavailable", headers: Optional[dict] = None):
        super().__init__(reason)
        self.status = status
        self.reason = reason
        self.headers = headers or {}


class BudgetExhausted(PhotoUnavailable):
    def __init__(self):
        super().__init__(404, "Daily photo budget exhausted", {"X-Photo-Budget": "exhausted"})


class PhotoService:
    """Serves salon photos from a disk cache and fetches missing ones from
    Google only on explicit request, within the daily ApiBudget.

    Photos are addressed by (place_id, index) instead of Google's photo name,
    because those names expire. An expired name triggers one refresh of the
    salon's photo list, after which the same index is retried.
    """

    def __init__(
        self,
        repo: SalonRepository,
        budget: ApiBudget,
        api_key: str,
        cache_dir: str,
        client: Optional[httpx.AsyncClient] = None,
    ):
        self.repo = repo
        self.budget = budget
        self.api_key = api_key
        self.cache_dir = Path(cache_dir)
        self._client = client
        self._failures: dict[str, float] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    @property
    def client(self) -> httpx.AsyncClient:
        # Shared client keeps the TLS connection to Google alive between requests.
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=10.0, follow_redirects=True)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    # --- cache ---------------------------------------------------------------

    def _key(self, place_id: str, index: int) -> str:
        return f"{place_id}/{index}/{PHOTO_WIDTH}"

    def _path(self, key: str) -> Path:
        return self.cache_dir / (hashlib.sha256(key.encode()).hexdigest() + ".img")

    def cached_path(self, place_id: str, index: int) -> Optional[Path]:
        path = self._path(self._key(place_id, index))
        return path if path.exists() else None

    def _failed_recently(self, key: str) -> bool:
        until = self._failures.get(key)
        if until is None:
            return False
        if time.time() < until:
            return True
        self._failures.pop(key, None)
        return False

    def _fail(self, key: str, permanent: bool, status: int = 404) -> PhotoUnavailable:
        self._failures[key] = time.time() + (PERMANENT_FAILURE_TTL if permanent else TRANSIENT_FAILURE_TTL)
        return PhotoUnavailable(status)

    # --- fetching ------------------------------------------------------------

    async def fetch(self, place_id: str, index: int) -> Path:
        key = self._key(place_id, index)
        path = self._path(key)
        if path.exists():
            return path
        if self._failed_recently(key):
            raise PhotoUnavailable()
        if not self.api_key:
            raise PhotoUnavailable(503, "Photo service unavailable")

        # Concurrent requests for the same photo wait for a single download.
        lock = self._locks.setdefault(key, asyncio.Lock())
        try:
            async with lock:
                if not path.exists():
                    if self._failed_recently(key):
                        raise PhotoUnavailable()
                    await self._fetch_into(place_id, index, key, path)
        finally:
            self._locks.pop(key, None)
        return path

    async def _fetch_into(self, place_id: str, index: int, key: str, path: Path) -> None:
        refs = self.repo.get_photos(place_id)
        if refs is None:
            raise self._fail(key, permanent=True)
        photos, refreshed_at = refs

        tried = None
        if refreshed_at is not None:
            if index >= len(photos):
                raise self._fail(key, permanent=True)
            tried = photos[index].get("name")
            if await self._download(tried, key, path):
                return

        # Names saved by the scraper are long expired, so those are refreshed without
        # wasting a call on them; otherwise Google just rejected the stored name.
        photos = await self._refreshed_photos(place_id, index, tried)
        if index >= len(photos) or not await self._download(photos[index].get("name"), key, path):
            raise self._fail(key, permanent=True)

    async def _refreshed_photos(self, place_id: str, index: int, tried: Optional[str]) -> list[dict]:
        # Another request may have refreshed this salon while we waited.
        async with self._locks.setdefault(f"refresh:{place_id}", asyncio.Lock()):
            photos, refreshed_at = self.repo.get_photos(place_id) or ([], None)
            current = photos[index].get("name") if index < len(photos) else None
            if refreshed_at is None or (tried is not None and current == tried):
                photos = await self._refresh_photos(place_id)
            return photos

    async def _download(self, photo_name: Optional[str], key: str, path: Path) -> bool:
        """True when saved, False when Google says the photo name is invalid."""
        if not photo_name:
            return False
        if not self.budget.try_consume():
            raise BudgetExhausted()
        try:
            resp = await self.client.get(
                f"https://places.googleapis.com/v1/{photo_name}/media",
                params={"maxWidthPx": PHOTO_WIDTH, "key": self.api_key},
            )
        except httpx.HTTPError as e:
            # The request URL carries the API key, so log only the error type.
            print(f"Photo download failed: {type(e).__name__}")
            raise self._fail(key, permanent=False, status=502)

        content_type = resp.headers.get("content-type", "")
        if resp.status_code == 200 and content_type.startswith("image/"):
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(".tmp")
            tmp.write_bytes(resp.content)
            os.replace(tmp, path)
            return True
        if resp.status_code in (400, 404):
            return False
        print(f"Google photo error {resp.status_code}: {resp.text[:200]}")
        raise self._fail(key, permanent=False, status=502)

    async def _refresh_photos(self, place_id: str) -> list[dict]:
        if not self.budget.try_consume():
            raise BudgetExhausted()
        try:
            resp = await self.client.get(
                f"https://places.googleapis.com/v1/places/{place_id}",
                headers={"X-Goog-Api-Key": self.api_key, "X-Goog-FieldMask": "photos"},
            )
        except httpx.HTTPError as e:
            print(f"Photo refresh failed: {type(e).__name__}")
            raise PhotoUnavailable(502)
        if resp.status_code != 200:
            print(f"Google details error {resp.status_code}: {resp.text[:200]}")
            raise PhotoUnavailable(502)

        photos = [
            {"name": p.get("name"), "width": p.get("widthPx"), "height": p.get("heightPx")}
            for p in resp.json().get("photos", [])[:MAX_PHOTOS]
        ]
        self.repo.update_photos(place_id, photos)
        return photos
