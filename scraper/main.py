import os
import time

from src.api_client import fetch_salons, get_place_details
from src.data_cleaner import build_salon_record, deduplicate
from src.db_seeder import init_database, get_existing_ids, upsert_salon, upsert_reviews, print_db_summary

WARSAW_DISTRICTS = [
    "Bemowo", "Białołęka", "Bielany", "Mokotów", "Ochota",
    "Praga-Południe", "Praga-Północ", "Rembertów", "Śródmieście",
    "Targówek", "Ursus", "Ursynów", "Wawer", "Wesoła",
    "Wilanów", "Włochy", "Wola", "Żoliborz",
]

SEARCH_KEYWORDS = [
    "salon fryzjerski",
    "salon kosmetyczny",
]

DB_PATH = os.path.join(os.path.dirname(__file__), "salons.db")


def process_salons():
    conn = init_database(DB_PATH)
    seen_ids: set[str] = set()
    stats = {"searched": 0, "fetched": 0, "duplicates": 0, "errors": 0}

    already_in_db = get_existing_ids(conn)
    print(f"Existing in DB: {len(already_in_db)}\n")

    for district in WARSAW_DISTRICTS:
        for keyword in SEARCH_KEYWORDS:
            query = f"{keyword} {district} Warszawa"
            print(f"[SEARCH] {query}")

            try:
                places = fetch_salons(query, max_results=60)
            except Exception as e:
                print(f"  [ERROR] {e}")
                stats["errors"] += 1
                continue

            stats["searched"] += len(places)

            for place in places:
                place_id = place.get("id")
                name = place.get("displayName", {}).get("text", "?")

                if deduplicate(place_id, seen_ids, already_in_db):
                    stats["duplicates"] += 1
                    continue

                try:
                    details = get_place_details(place_id)
                    record = build_salon_record(details, search_district=district)
                    upsert_salon(conn, record)
                    upsert_reviews(conn, place_id, record["top_reviews"])
                    conn.commit()
                    stats["fetched"] += 1
                    print(f"  + {record['name']} | {record['actual_district']} | {record['rating']} ({record['reviews_count']})")
                except Exception as e:
                    print(f"  [ERROR] {name}: {e}")
                    stats["errors"] += 1

                time.sleep(0.3)

    conn.close()

    print(f"\n{'='*50}")
    print(f"SUMMARY")
    print(f"  Searched:    {stats['searched']}")
    print(f"  Fetched:     {stats['fetched']}")
    print(f"  Duplicates:  {stats['duplicates']}")
    print(f"  Errors:      {stats['errors']}")
    print(f"  Total in DB: {len(already_in_db) + stats['fetched']}")
    print(f"  DB path:     {DB_PATH}")

    return stats


if __name__ == "__main__":
    process_salons()
    print_db_summary(DB_PATH)
