"""Photo endpoint tests with a mocked Google API (no real requests, no cost).

Run from backend/:  python -m unittest discover -s tests
"""
import asyncio
import json
import os
import sqlite3
import sys
import tempfile
import unittest
from datetime import datetime, timedelta

import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.app import create_app  # noqa: E402
from src.services.api_budget import ApiBudget, QUOTA_TZ  # noqa: E402

JPEG = b"\xff\xd8\xff\xe0 fake jpeg"


def make_db(path: str) -> None:
    conn = sqlite3.connect(path)
    conn.executescript("""
        CREATE TABLE salons (
            google_place_id TEXT PRIMARY KEY, name TEXT, address TEXT, search_district TEXT,
            actual_district TEXT, phone TEXT, website TEXT, google_maps_url TEXT, rating REAL,
            reviews_count INTEGER, price_level TEXT, primary_type TEXT, business_status TEXT,
            opening_hours TEXT, services TEXT, top_reviews TEXT, editorial_summary TEXT,
            photos_json TEXT, lat REAL, lng REAL, raw_json TEXT, fetched_at TIMESTAMP,
            photos_refreshed_at TEXT
        );
        CREATE TABLE salon_reviews (id INTEGER PRIMARY KEY, google_place_id TEXT, author TEXT, rating REAL, text TEXT, publish_time TEXT, language TEXT);
    """)
    refreshed = "2026-11-01 10:00:00"
    rows = [
        ("good", [{"name": "places/good/photos/p0"}, {"name": "places/good/photos/p1"}], refreshed),
        ("stale", [{"name": "places/stale/photos/old0"}], refreshed),  # refreshed before, since expired
        ("scraped", [{"name": "places/scraped/photos/old0"}], None),  # straight from the scraper
        ("none", [], refreshed),
    ]
    conn.executemany(
        "INSERT INTO salons (google_place_id, name, photos_json, photos_refreshed_at, lat, lng)"
        " VALUES (?, ?, ?, ?, 52.2, 21.0)",
        [(pid, pid, json.dumps(p), r) for pid, p, r in rows],
    )
    conn.commit()
    conn.close()


class FakeGoogle:
    def __init__(self, delay: float = 0.0):
        self.calls: list[str] = []
        self.delay = delay

    async def __call__(self, request: httpx.Request) -> httpx.Response:
        self.calls.append(request.url.path)
        if self.delay:
            await asyncio.sleep(self.delay)
        path = request.url.path
        if path.endswith("/media"):
            if "/old" in path:
                return httpx.Response(400, json={"error": {"message": "The photo resource in the request is invalid."}})
            return httpx.Response(200, content=JPEG, headers={"content-type": "image/jpeg"})
        place = path.removeprefix("/v1/places/")
        if place in ("stale", "scraped"):
            return httpx.Response(200, json={"photos": [{"name": f"places/{place}/photos/new0", "widthPx": 10, "heightPx": 10}]})
        return httpx.Response(404)


class PhotoEndpointTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = os.path.join(self.tmp.name, "test.db")
        make_db(self.db)
        self.google = FakeGoogle(delay=0.05)
        self.app = self._app(budget=10)

    def _app(self, budget: int, photo_budget: int = 100):
        return create_app(
            db_path=self.db,
            photo_cache_dir=os.path.join(self.tmp.name, "cache"),
            places_api_key="test-key",
            daily_budget=budget,
            daily_photo_budget=photo_budget,
            http_client=httpx.AsyncClient(transport=httpx.MockTransport(self.google)),
        )

    async def asyncTearDown(self):
        self.tmp.cleanup()

    def client(self, app=None):
        return httpx.AsyncClient(transport=httpx.ASGITransport(app=app or self.app), base_url="http://test")

    async def used(self, c) -> int:
        return (await c.get("/api/health")).json()["photo_budget"]["used"]

    async def test_cache_only_never_calls_google(self):
        async with self.client() as c:
            r = await c.get("/api/photos/good/0")
            self.assertEqual(r.status_code, 404)
            self.assertEqual(r.headers["cache-control"], "no-store")
            self.assertEqual(self.google.calls, [])
            self.assertEqual(await self.used(c), 0)

    async def test_fetch_downloads_once_then_serves_from_cache(self):
        async with self.client() as c:
            r = await c.get("/api/photos/good/0?fetch=1")
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.content, JPEG)
            self.assertEqual(r.headers["content-type"], "image/jpeg")
            self.assertIn("immutable", r.headers["cache-control"])
            self.assertNotIn("content-encoding", r.headers)

            # The list view (no fetch) now gets the cached file.
            self.assertEqual((await c.get("/api/photos/good/0")).status_code, 200)
            self.assertEqual((await c.get("/api/photos/good/0?fetch=1")).status_code, 200)
            self.assertEqual(len(self.google.calls), 1)
            self.assertEqual(await self.used(c), 1)

    async def test_concurrent_requests_share_one_download(self):
        async with self.client() as c:
            rs = await asyncio.gather(*[c.get("/api/photos/good/1?fetch=1") for _ in range(5)])
            self.assertEqual([r.status_code for r in rs], [200] * 5)
            self.assertEqual(len(self.google.calls), 1)

    async def test_expired_name_refreshes_once_and_retries(self):
        async with self.client() as c:
            r = await c.get("/api/photos/stale/0?fetch=1")
            self.assertEqual(r.status_code, 200)
            self.assertEqual(
                self.google.calls,
                ["/v1/places/stale/photos/old0/media", "/v1/places/stale", "/v1/places/stale/photos/new0/media"],
            )
            self.assertEqual(await self.used(c), 3)
        conn = sqlite3.connect(self.db)
        stored = json.loads(conn.execute("SELECT photos_json FROM salons WHERE google_place_id='stale'").fetchone()[0])
        conn.close()
        self.assertEqual(stored[0]["name"], "places/stale/photos/new0")

    async def test_scraper_names_are_refreshed_without_a_wasted_call(self):
        async with self.client() as c:
            self.assertEqual((await c.get("/api/photos/scraped/0?fetch=1")).status_code, 200)
            self.assertEqual(self.google.calls, ["/v1/places/scraped", "/v1/places/scraped/photos/new0/media"])
            self.assertEqual(await self.used(c), 2)
        conn = sqlite3.connect(self.db)
        refreshed_at = conn.execute("SELECT photos_refreshed_at FROM salons WHERE google_place_id='scraped'").fetchone()[0]
        conn.close()
        self.assertIsNotNone(refreshed_at)

    async def test_missing_photo_is_not_retried(self):
        async with self.client() as c:
            for _ in range(3):
                self.assertEqual((await c.get("/api/photos/none/0?fetch=1")).status_code, 404)
            self.assertEqual(self.google.calls, [])

    async def test_budget_exhausted_stops_google_calls(self):
        app = self._app(budget=1)
        async with self.client(app) as c:
            self.assertEqual((await c.get("/api/photos/good/0?fetch=1")).status_code, 200)
            r = await c.get("/api/photos/good/1?fetch=1")
            self.assertEqual(r.status_code, 404)
            self.assertEqual(r.headers["x-photo-budget"], "exhausted")
            self.assertEqual(len(self.google.calls), 1)

    async def test_photo_sub_budget_caps_downloads(self):
        app = self._app(budget=10, photo_budget=1)
        async with self.client(app) as c:
            self.assertEqual((await c.get("/api/photos/good/0?fetch=1")).status_code, 200)
            self.assertEqual((await c.get("/api/photos/good/1?fetch=1")).status_code, 404)
            usage = (await c.get("/api/health")).json()["photo_budget"]
            self.assertEqual(usage["used"], 1)
            self.assertEqual(usage["by_kind"]["photo"], {"used": 1, "limit": 1})

    async def test_salon_payloads_expose_photo_count_not_names(self):
        async with self.client() as c:
            listed = (await c.get("/api/salons?sort_by=name")).json()["data"]
            mapped = (await c.get("/api/salons/map")).json()
            detail = (await c.get("/api/salons/good")).json()
        for salons in (listed, mapped):
            counts = {s["google_place_id"]: s["photo_count"] for s in salons}
            self.assertEqual(counts, {"good": 2, "stale": 1, "scraped": 1, "none": 0})
            self.assertTrue(all("photos_json" not in s and "raw_json" not in s for s in salons))
        self.assertEqual(detail["photo_count"], 2)
        self.assertNotIn("photos_json", detail)

    async def test_invalid_place_id_rejected(self):
        async with self.client() as c:
            self.assertEqual((await c.get("/api/photos/bad%20id/0?fetch=1")).status_code, 422)
            self.assertEqual((await c.get("/api/photos/good/99?fetch=1")).status_code, 422)
            self.assertEqual(self.google.calls, [])


class CorsTest(unittest.IsolatedAsyncioTestCase):
    async def test_vercel_origins_allowed_others_not(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "t.db")
            make_db(db)
            app = create_app(db_path=db, photo_cache_dir=os.path.join(tmp, "c"), places_api_key="")
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
                for origin, allowed in [
                    ("https://warsaw-salon-explorer-eta.vercel.app", True),
                    ("https://warsaw-salon-explorer-cywajdnub-scovs-projects.vercel.app", True),
                    ("http://localhost:3000", True),
                    ("https://evil.example.com", False),
                    ("https://warsaw-salon-explorer.vercel.app.evil.com", False),
                ]:
                    r = await c.get("/api/health", headers={"Origin": origin})
                    self.assertEqual(r.headers.get("access-control-allow-origin") == origin, allowed, origin)


class ApiBudgetTest(unittest.TestCase):
    def test_limit_and_daily_reset(self):
        with tempfile.TemporaryDirectory() as tmp:
            now = [datetime(2026, 11, 26, 23, 30, tzinfo=QUOTA_TZ)]
            budget = ApiBudget(os.path.join(tmp, "b.db"), daily_limit=3, kind_limits={"photo": 1}, now=lambda: now[0])
            self.assertTrue(budget.try_consume("photo"))
            self.assertFalse(budget.try_consume("photo"))  # kind limit
            self.assertEqual([budget.try_consume("details") for _ in range(3)], [True, True, False])  # total limit
            self.assertEqual(budget.usage()["used"], 3)

            now[0] += timedelta(hours=1)  # past midnight Pacific Time
            self.assertTrue(budget.try_consume("photo"))
            usage = budget.usage()
            self.assertEqual((usage["day"], usage["used"]), ("2026-11-27", 1))

    def test_legacy_counter_is_carried_over(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = os.path.join(tmp, "b.db")
            conn = sqlite3.connect(db)
            conn.execute("CREATE TABLE api_usage (day TEXT PRIMARY KEY, count INTEGER NOT NULL)")
            conn.execute("INSERT INTO api_usage VALUES ('2026-11-26', 4)")
            conn.commit()
            conn.close()
            now = lambda: datetime(2026, 11, 26, 12, 0, tzinfo=QUOTA_TZ)  # noqa: E731
            budget = ApiBudget(db, daily_limit=5, now=now)
            self.assertEqual(budget.usage()["used"], 4)
            self.assertEqual([budget.try_consume("photo") for _ in range(2)], [True, False])

    def test_zero_limit_blocks_everything(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertFalse(ApiBudget(os.path.join(tmp, "b.db"), daily_limit=0).try_consume("photo"))


if __name__ == "__main__":
    unittest.main()
