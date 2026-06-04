import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("PLACES_API_KEY")

if not API_KEY:
    raise RuntimeError("Missing PLACES_API_KEY in .env")

DETAIL_FIELD_MASK = (
    "id,displayName,formattedAddress,addressComponents,"
    "rating,userRatingCount,websiteUri,regularOpeningHours,"
    "reviews,primaryType,internationalPhoneNumber,"
    "priceLevel,businessStatus,editorialSummary,"
    "googleMapsUri,photos,types,location"
)


def fetch_salons(query_text: str, max_results: int = 20) -> list:
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,nextPageToken",
    }
    payload = {
        "textQuery": query_text,
        "languageCode": "pl",
        "maxResultCount": 20,
    }

    all_places = []

    while len(all_places) < max_results:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            print(f"  [ERROR] Search failed: {response.status_code}")
            break

        data = response.json()
        places = data.get("places", [])
        all_places.extend(places)

        next_token = data.get("nextPageToken")
        if not next_token:
            break

        payload["pageToken"] = next_token
        time.sleep(2)

    return all_places[:max_results]


def get_place_details(place_id: str) -> dict:
    url = f"https://places.googleapis.com/v1/places/{place_id}"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": DETAIL_FIELD_MASK,
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise RuntimeError(f"Details error [{place_id}]: {response.status_code}")

    return response.json()
