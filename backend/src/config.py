import os

from dotenv import load_dotenv

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Local development reads the repo-root .env; on the server systemd provides
# the environment and load_dotenv never overrides variables that are already set.
load_dotenv(os.path.join(BACKEND_DIR, "..", ".env"))

DB_PATH = os.getenv("DB_PATH", os.path.join(BACKEND_DIR, "salons.db"))
PHOTO_CACHE_DIR = os.getenv("PHOTO_CACHE_DIR", os.path.join(BACKEND_DIR, "photo_cache"))
PLACES_API_KEY = os.getenv("PLACES_API_KEY", "")

# Hard caps on Google Places calls per day. The total covers photo downloads and
# photo-name refreshes; keep it below the quota set in Google Cloud (50/day).
# A cover costs 2 calls the first time (refresh + download), so 45 fits a full
# page of 18 covers. Photo downloads alone stay under ~1000/month, the free tier.
PLACES_DAILY_BUDGET = int(os.getenv("PLACES_DAILY_BUDGET", "45"))
PLACES_DAILY_PHOTO_BUDGET = int(os.getenv("PLACES_DAILY_PHOTO_BUDGET", "33"))

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if o.strip()
]
