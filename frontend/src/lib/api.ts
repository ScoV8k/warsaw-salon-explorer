import {
  PaginatedResponse,
  Salon,
  District,
  Stats,
  SalonUpdate,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json();
}

export interface SalonListParams {
  page?: number;
  per_page?: number;
  district?: string;
  min_rating?: number;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}

export function fetchSalons(params: SalonListParams = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  return apiFetch<PaginatedResponse>(`/api/salons?${qs}`);
}

export function fetchSalon(placeId: string) {
  return apiFetch<Salon>(`/api/salons/${placeId}`);
}

export function fetchMapSalons() {
  return apiFetch<Salon[]>("/api/salons/map");
}

export function fetchDistricts() {
  return apiFetch<District[]>("/api/districts");
}

export function fetchStats() {
  return apiFetch<Stats>("/api/stats");
}

export function updateSalon(placeId: string, data: SalonUpdate) {
  return apiFetch<Salon>(`/api/salons/${placeId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function getPhotoUrl(photoName: string, maxWidth: number = 800): string {
  return `${API_BASE}/api/photos/${photoName}?max_width=${maxWidth}`;
}
