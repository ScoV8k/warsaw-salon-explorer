PRICE_LEVEL_MAP = {
    "PRICE_LEVEL_FREE": "Free",
    "PRICE_LEVEL_INEXPENSIVE": "Inexpensive ($)",
    "PRICE_LEVEL_MODERATE": "Moderate ($$)",
    "PRICE_LEVEL_EXPENSIVE": "Expensive ($$$)",
    "PRICE_LEVEL_VERY_EXPENSIVE": "Very Expensive ($$$$)",
}

SERVICE_TYPE_MAP = {
    "hair_salon": "Hair Salon",
    "hair_care": "Hair Care",
    "beauty_salon": "Beauty Salon",
    "nail_salon": "Nail Salon",
    "barber_shop": "Barber Shop",
    "spa": "SPA",
    "skin_care_clinic": "Skin Care Clinic",
    "massage": "Massage",
    "tattoo_parlor": "Tattoo Parlor",
}

REVIEW_SERVICE_KEYWORDS = [
    "strzyżenie", "koloryzacja", "balayage", "ombre", "keratyna",
    "manicure", "pedicure", "przedłużanie", "brwi", "rzęsy",
    "makijaż", "depilacja", "masaż", "peeling", "mezoterapia",
    "botox", "henna", "stylizacja", "modelowanie", "farbowanie",
    "trychologia", "laminacja", "lifting", "epilacja",
]


def extract_district(address_components: list) -> str:
    for component in address_components:
        types = component.get("types", [])
        if "sublocality_level_1" in types or "neighborhood" in types:
            return component.get("longText", "")
    for component in address_components:
        types = component.get("types", [])
        if "political" in types and "sublocality" in types:
            return component.get("longText", "")
    return ""


def extract_services_from_types(types: list) -> str:
    services = [SERVICE_TYPE_MAP[t] for t in (types or []) if t in SERVICE_TYPE_MAP]
    return ", ".join(services) if services else ""


def extract_services_from_reviews(reviews: list) -> list[str]:
    found = set()
    for review in (reviews or []):
        text = (review.get("text", {}).get("text") or "").lower()
        for kw in REVIEW_SERVICE_KEYWORDS:
            if kw in text:
                found.add(kw.capitalize())
    return sorted(found)


def format_opening_hours(hours_data: dict) -> str:
    if not hours_data:
        return ""
    periods = hours_data.get("weekdayDescriptions", [])
    return " | ".join(periods) if periods else ""


def build_salon_record(details: dict, search_district: str) -> dict:
    address_components = details.get("addressComponents", [])
    reviews_raw = details.get("reviews", [])
    types = details.get("types", [])

    services_from_types = extract_services_from_types(types)
    services_from_reviews = extract_services_from_reviews(reviews_raw)
    all_services_parts = []
    if services_from_types:
        all_services_parts.append(services_from_types)
    if services_from_reviews:
        all_services_parts.append("From reviews: " + ", ".join(services_from_reviews))
    services_text = " | ".join(all_services_parts)

    top_reviews = [
        {
            "author": r.get("authorAttribution", {}).get("displayName"),
            "rating": r.get("rating"),
            "text": r.get("text", {}).get("text"),
            "publish_time": r.get("publishTime"),
            "language": r.get("originalText", {}).get("languageCode", ""),
        }
        for r in reviews_raw[:3]
    ]

    photos = [
        {
            "name": p.get("name"),
            "width": p.get("widthPx"),
            "height": p.get("heightPx"),
        }
        for p in details.get("photos", [])[:5]
    ]

    return {
        "google_place_id": details.get("id"),
        "name": details.get("displayName", {}).get("text", ""),
        "address": details.get("formattedAddress", ""),
        "search_district": search_district,
        "actual_district": extract_district(address_components),
        "phone": details.get("internationalPhoneNumber", ""),
        "website": details.get("websiteUri", ""),
        "google_maps_url": details.get("googleMapsUri", ""),
        "rating": details.get("rating"),
        "reviews_count": details.get("userRatingCount"),
        "price_level": PRICE_LEVEL_MAP.get(details.get("priceLevel", ""), ""),
        "primary_type": details.get("primaryType", ""),
        "business_status": details.get("businessStatus", ""),
        "opening_hours": format_opening_hours(details.get("regularOpeningHours")),
        "services": services_text,
        "top_reviews": top_reviews,
        "editorial_summary": details.get("editorialSummary", {}).get("text", ""),
        "photos": photos,
        "raw_json": details,
    }


def deduplicate(place_id: str, seen_ids: set, already_in_db: set) -> bool:
    if place_id in seen_ids or place_id in already_in_db:
        return True
    seen_ids.add(place_id)
    return False
