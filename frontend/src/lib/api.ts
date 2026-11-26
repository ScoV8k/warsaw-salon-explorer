import {
  PaginatedResponse,
  Salon,
  District,
  Stats,
  SalonUpdate,
} from "./types";

// Empty by default: requests go to same-origin /api/*, which next.config.ts proxies
// to the backend (API_PROXY_TARGET). Set NEXT_PUBLIC_API_URL only to bypass the proxy.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");


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

/**
 * Photo of a salon by position. Without `fetch` the backend serves only photos it
 * already has cached and never calls Google (free). `fetch: true` lets it download
 * a missing photo within the daily budget — use it only after an explicit user action.
 */
export function getPhotoUrl(placeId: string, index = 0, { fetch = false } = {}): string {
  return `${API_BASE}/api/photos/${placeId}/${index}${fetch ? "?fetch=1" : ""}`;
}

export const PLACEHOLDER_IMG = "/placeholder.png";

export function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.src.endsWith(PLACEHOLDER_IMG)) img.src = PLACEHOLDER_IMG;
}
