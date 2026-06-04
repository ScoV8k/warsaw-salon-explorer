import sqlite3
import math
from typing import Optional


class SalonRepository:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def find_all(
        self,
        page: int = 1,
        per_page: int = 20,
        district: Optional[str] = None,
        min_rating: Optional[float] = None,
        search: Optional[str] = None,
        sort_by: str = "name",
        sort_order: str = "asc",
    ) -> tuple[list[dict], int]:
        conn = self._connect()

        where_clauses = []
        params = []

        if district:
            where_clauses.append("actual_district = ?")
            params.append(district)

        if min_rating is not None:
            where_clauses.append("rating >= ?")
            params.append(min_rating)

        if search:
            where_clauses.append("(name LIKE ? OR address LIKE ? OR services LIKE ?)")
            pattern = f"%{search}%"
            params.extend([pattern, pattern, pattern])

        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        allowed_sort = {"name", "rating", "reviews_count", "actual_district", "fetched_at"}
        if sort_by not in allowed_sort:
            sort_by = "name"
        if sort_order not in ("asc", "desc"):
            sort_order = "asc"

        count_row = conn.execute(f"SELECT COUNT(*) as cnt FROM salons{where_sql}", params).fetchone()
        total = count_row["cnt"]

        offset = (page - 1) * per_page
        rows = conn.execute(
            f"SELECT * FROM salons{where_sql} ORDER BY {sort_by} {sort_order} LIMIT ? OFFSET ?",
            params + [per_page, offset],
        ).fetchall()

        conn.close()
        return [dict(r) for r in rows], total

    def find_by_id(self, place_id: str) -> Optional[dict]:
        conn = self._connect()
        row = conn.execute("SELECT * FROM salons WHERE google_place_id = ?", (place_id,)).fetchone()
        conn.close()
        return dict(row) if row else None

    def find_reviews(self, place_id: str) -> list[dict]:
        conn = self._connect()
        rows = conn.execute(
            "SELECT * FROM salon_reviews WHERE google_place_id = ? ORDER BY rating DESC",
            (place_id,),
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_districts(self) -> list[dict]:
        conn = self._connect()
        rows = conn.execute("""
            SELECT actual_district as district, COUNT(*) as count, ROUND(AVG(rating), 2) as avg_rating
            FROM salons
            WHERE actual_district != ''
            GROUP BY actual_district
            ORDER BY count DESC
        """).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_stats(self) -> dict:
        conn = self._connect()
        row = conn.execute("""
            SELECT
                COUNT(*) as total_salons,
                COUNT(DISTINCT actual_district) as total_districts,
                ROUND(AVG(rating), 2) as avg_rating,
                SUM(reviews_count) as total_reviews
            FROM salons
        """).fetchone()
        conn.close()
        return dict(row)

    def search_salons(self, query: str, limit: int = 20) -> list[dict]:
        conn = self._connect()
        pattern = f"%{query}%"
        rows = conn.execute(
            """SELECT google_place_id, name, actual_district, rating, reviews_count
               FROM salons
               WHERE name LIKE ? OR services LIKE ? OR address LIKE ?
               ORDER BY rating DESC
               LIMIT ?""",
            (pattern, pattern, pattern, limit),
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_all_for_map(self) -> list[dict]:
        conn = self._connect()
        rows = conn.execute(
            """SELECT google_place_id, name, actual_district, rating, reviews_count,
                      primary_type, lat, lng, photos_json
               FROM salons
               WHERE lat IS NOT NULL AND lng IS NOT NULL"""
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    UPDATABLE_COLUMNS = {
        "name", "address", "actual_district", "phone", "website",
        "google_maps_url", "rating", "reviews_count", "price_level",
        "primary_type", "business_status", "opening_hours", "services",
        "editorial_summary",
    }

    def update(self, place_id: str, fields: dict) -> Optional[dict]:
        safe_fields = {k: v for k, v in fields.items() if k in self.UPDATABLE_COLUMNS}
        if not safe_fields:
            return self.find_by_id(place_id)

        set_clause = ", ".join(f"{col} = ?" for col in safe_fields)
        values = list(safe_fields.values()) + [place_id]

        conn = self._connect()
        conn.execute(
            f"UPDATE salons SET {set_clause} WHERE google_place_id = ?",
            values,
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM salons WHERE google_place_id = ?", (place_id,)
        ).fetchone()
        conn.close()
        return dict(row) if row else None
