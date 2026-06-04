import json
import math
from typing import Optional

from src.repositories.salon_repository import SalonRepository


class SalonService:
    def __init__(self, repository: SalonRepository):
        self.repo = repository

    def get_salons(
        self,
        page: int = 1,
        per_page: int = 20,
        district: Optional[str] = None,
        min_rating: Optional[float] = None,
        search: Optional[str] = None,
        sort_by: str = "name",
        sort_order: str = "asc",
    ) -> dict:
        per_page = min(max(per_page, 1), 100)
        page = max(page, 1)

        rows, total = self.repo.find_all(
            page=page,
            per_page=per_page,
            district=district,
            min_rating=min_rating,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        salons = [self._enrich_salon(r) for r in rows]

        return {
            "data": salons,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page else 0,
        }

    def get_salon_by_id(self, place_id: str) -> Optional[dict]:
        row = self.repo.find_by_id(place_id)
        if not row:
            return None

        salon = self._enrich_salon(row)
        salon["reviews"] = self.repo.find_reviews(place_id)
        return salon

    def get_districts(self) -> list[dict]:
        return self.repo.get_districts()

    def get_stats(self) -> dict:
        return self.repo.get_stats()

    def search(self, query: str, limit: int = 20) -> list[dict]:
        return self.repo.search_salons(query, limit)

    def get_map_salons(self) -> list[dict]:
        rows = self.repo.get_all_for_map()
        return [self._enrich_salon(r) for r in rows]

    def update_salon(self, place_id: str, fields: dict) -> Optional[dict]:
        if not self.repo.find_by_id(place_id):
            return None
        row = self.repo.update(place_id, fields)
        return self._enrich_salon(row) if row else None
    def _enrich_salon(self, row: dict) -> dict:
        for json_field in ("top_reviews", "photos_json"):
            if row.get(json_field) and isinstance(row[json_field], str):
                try:
                    row[json_field] = json.loads(row[json_field])
                except (json.JSONDecodeError, TypeError):
                    pass

        row.pop("raw_json", None)
        return row
