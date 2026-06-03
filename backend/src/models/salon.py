from dataclasses import dataclass, field, asdict
from typing import Optional

from pydantic import BaseModel


@dataclass
class Salon:
    google_place_id: str
    name: str
    address: str
    search_district: str
    actual_district: str
    phone: str
    website: str
    google_maps_url: str
    rating: Optional[float]
    reviews_count: Optional[int]
    price_level: str
    primary_type: str
    business_status: str
    opening_hours: str
    services: str
    top_reviews: str
    editorial_summary: str
    photos_json: str
    raw_json: str
    fetched_at: str

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_row(row: dict) -> "Salon":
        return Salon(**{k: row[k] for k in Salon.__dataclass_fields__})


@dataclass
class SalonReview:
    id: int
    google_place_id: str
    author: Optional[str]
    rating: Optional[float]
    text: Optional[str]
    publish_time: Optional[str]
    language: Optional[str]

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PaginatedResponse:
    data: list
    total: int
    page: int
    per_page: int
    total_pages: int

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class DistrictStats:
    district: str
    count: int
    avg_rating: Optional[float]

    def to_dict(self) -> dict:
        return asdict(self)


class SalonUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    actual_district: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    google_maps_url: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    price_level: Optional[str] = None
    primary_type: Optional[str] = None
    business_status: Optional[str] = None
    opening_hours: Optional[str] = None
    services: Optional[str] = None
    editorial_summary: Optional[str] = None
