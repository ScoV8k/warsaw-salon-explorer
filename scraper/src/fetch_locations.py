import sqlite3
import requests
import os
import time
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
API_KEY = os.getenv("PLACES_API_KEY")

if not API_KEY:
    raise RuntimeError("Missing PLACES_API_KEY in .env")

def fetch_locations(db_path: str):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    rows = conn.execute("SELECT google_place_id FROM salons WHERE lat IS NULL OR lng IS NULL").fetchall()
    print(f"Found {len(rows)} salons without location. Fetching...")
    
    updated = 0
    for row in rows:
        place_id = row["google_place_id"]
        url = f"https://places.googleapis.com/v1/places/{place_id}"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": "location",
        }
        
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            location = data.get("location")
            if location:
                lat = location.get("latitude")
                lng = location.get("longitude")
                if lat and lng:
                    conn.execute("UPDATE salons SET lat = ?, lng = ? WHERE google_place_id = ?", (lat, lng, place_id))
                    conn.commit()
                    updated += 1
                    print(f"Updated {place_id} -> {lat}, {lng}")
        else:
            print(f"Error for {place_id}: {response.status_code}")
            
        time.sleep(0.1) # Small delay to respect quota rates
        
    conn.close()
    print(f"Done. Updated {updated} salons.")

if __name__ == "__main__":
    db_path = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "db", "database.sqlite")
    fetch_locations(db_path)
