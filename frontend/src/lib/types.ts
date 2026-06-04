export interface Salon {
  google_place_id: string;
  name: string;
  address: string;
  search_district: string;
  actual_district: string;
  phone: string;
  website: string;
  google_maps_url: string;
  rating: number | null;
  reviews_count: number | null;
  price_level: string;
  primary_type: string;
  business_status: string;
  opening_hours: string;
  services: string;
  editorial_summary: string;
  top_reviews: Review[] | string;
  photos_json: PhotoInfo[] | string;
  reviews?: Review[];
  lat?: number;
  lng?: number;
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  publish_time: string;
  language: string;
}

export interface PhotoInfo {
  name: string;
  width: number;
  height: number;
}

export interface PaginatedResponse {
  data: Salon[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface District {
  district: string;
  count: number;
  avg_rating: number | null;
}

export interface Stats {
  total_salons: number;
  total_districts: number;
  avg_rating: number | null;
  total_reviews: number;
}

export interface SalonUpdate {
  name?: string;
  address?: string;
  actual_district?: string;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  rating?: number;
  reviews_count?: number;
  price_level?: string;
  primary_type?: string;
  business_status?: string;
  opening_hours?: string;
  services?: string;
  editorial_summary?: string;
}
