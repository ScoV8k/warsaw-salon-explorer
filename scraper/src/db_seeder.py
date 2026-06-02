import json
import sqlite3


def init_database(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS salons (
            google_place_id   TEXT PRIMARY KEY,
            name              TEXT,
            address           TEXT,
            search_district   TEXT,
            actual_district   TEXT,
            phone             TEXT,
            website           TEXT,
            google_maps_url   TEXT,
            rating            REAL,
            reviews_count     INTEGER,
            price_level       TEXT,
            primary_type      TEXT,
            business_status   TEXT,
            opening_hours     TEXT,
            services          TEXT,
            top_reviews       TEXT,
            editorial_summary TEXT,
            photos_json       TEXT,
            raw_json          TEXT,
            fetched_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS salon_reviews (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            google_place_id   TEXT NOT NULL,
            author            TEXT,
            rating            REAL,
            text              TEXT,
            publish_time      TEXT,
            language          TEXT,
            FOREIGN KEY (google_place_id) REFERENCES salons(google_place_id)
        );
    """)
    conn.commit()
    return conn


def get_existing_ids(conn: sqlite3.Connection) -> set:
    rows = conn.execute("SELECT google_place_id FROM salons").fetchall()
    return {row[0] for row in rows}


def upsert_salon(conn: sqlite3.Connection, record: dict):
    conn.execute("""
        INSERT INTO salons (
            google_place_id, name, address, search_district, actual_district,
            phone, website, google_maps_url, rating, reviews_count,
            price_level, primary_type, business_status, opening_hours,
            services, top_reviews, editorial_summary, photos_json, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(google_place_id) DO UPDATE SET
            name = excluded.name,
            address = excluded.address,
            actual_district = excluded.actual_district,
            phone = excluded.phone,
            website = excluded.website,
            google_maps_url = excluded.google_maps_url,
            rating = excluded.rating,
            reviews_count = excluded.reviews_count,
            price_level = excluded.price_level,
            primary_type = excluded.primary_type,
            business_status = excluded.business_status,
            opening_hours = excluded.opening_hours,
            services = excluded.services,
            top_reviews = excluded.top_reviews,
            editorial_summary = excluded.editorial_summary,
            photos_json = excluded.photos_json,
            raw_json = excluded.raw_json,
            fetched_at = CURRENT_TIMESTAMP
    """, (
        record["google_place_id"],
        record["name"],
        record["address"],
        record["search_district"],
        record["actual_district"],
        record["phone"],
        record["website"],
        record["google_maps_url"],
        record["rating"],
        record["reviews_count"],
        record["price_level"],
        record["primary_type"],
        record["business_status"],
        record["opening_hours"],
        record["services"],
        json.dumps(record["top_reviews"], ensure_ascii=False),
        record["editorial_summary"],
        json.dumps(record["photos"], ensure_ascii=False),
        json.dumps(record["raw_json"], ensure_ascii=False),
    ))


def upsert_reviews(conn: sqlite3.Connection, place_id: str, reviews: list):
    conn.execute("DELETE FROM salon_reviews WHERE google_place_id = ?", (place_id,))
    for r in reviews:
        conn.execute("""
            INSERT INTO salon_reviews (google_place_id, author, rating, text, publish_time, language)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            place_id,
            r.get("author"),
            r.get("rating"),
            r.get("text"),
            r.get("publish_time"),
            r.get("language"),
        ))


def print_db_summary(db_path: str):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    total = conn.execute("SELECT COUNT(*) FROM salons").fetchone()[0]
    by_district = conn.execute("""
        SELECT actual_district, COUNT(*) as cnt, ROUND(AVG(rating), 2) as avg_rating
        FROM salons
        WHERE actual_district != ''
        GROUP BY actual_district
        ORDER BY cnt DESC
    """).fetchall()

    print(f"\nDB: {total} salons\n")
    print(f"{'District':<25} {'Count':>6} {'Avg Rating':>10}")
    print("-" * 43)
    for row in by_district:
        print(f"{row['actual_district']:<25} {row['cnt']:>6} {row['avg_rating'] or 'n/a':>10}")

    conn.close()


def export_to_json(db_path: str, output_path: str = "salons_export.json"):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    rows = conn.execute("SELECT * FROM salons ORDER BY actual_district, name").fetchall()
    data = [dict(row) for row in rows]

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)

    print(f"Exported {len(data)} salons to {output_path}")
    conn.close()
