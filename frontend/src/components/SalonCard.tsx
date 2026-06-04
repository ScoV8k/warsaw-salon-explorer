"use client";

import { Salon, PhotoInfo } from "@/lib/types";
import { getPhotoUrl } from "@/lib/api";

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-muted text-xs">No rating</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20">
            <path
              d="M10 1l2.39 4.84L17.82 6.7l-3.91 3.81.92 5.39L10 13.27 5.17 15.9l.92-5.39L2.18 6.7l5.43-.86L10 1z"
              fill={i < Math.round(rating) ? "var(--accent)" : "var(--border-color)"}
            />
          </svg>
        ))}
      </span>
      <span className="text-xs font-semibold text-foreground tabular-nums">{rating.toFixed(1)}</span>
    </span>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "accent" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide ${
        variant === "accent"
          ? "bg-accent-soft text-accent"
          : "bg-surface-hover text-muted"
      }`}
    >
      {children}
    </span>
  );
}

interface SalonCardProps {
  salon: Salon;
  onClick: () => void;
}

export default function SalonCard({ salon, onClick }: SalonCardProps) {
  const photos: PhotoInfo[] = Array.isArray(salon.photos_json) ? salon.photos_json : [];
  const coverPhoto = photos.length > 0 ? photos[0] : null;

  return (
    <button
      id={`salon-card-${salon.google_place_id}`}
      onClick={onClick}
      className="group w-full text-left bg-surface rounded-xl overflow-hidden
                 border border-border/60
                 transition-all duration-200 ease-out
                 hover:shadow-lg hover:shadow-black/[0.04] hover:border-border
                 hover:-translate-y-px active:translate-y-0 cursor-pointer"
    >
      <div className="relative h-40 overflow-hidden bg-surface-hover flex items-center justify-center">
        <img
          src={coverPhoto ? getPhotoUrl(coverPhoto.name, 400) : "/placeholder.png"}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 ease-out
                     group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2
                         group-hover:text-accent transition-colors duration-200">
            {salon.name}
          </h3>
          {salon.business_status === "OPERATIONAL" && (
            <span className="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-success" />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted mb-3">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span className="truncate">{salon.actual_district || salon.search_district}</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <StarRating rating={salon.rating} />
          {salon.reviews_count !== null && salon.reviews_count > 0 && (
            <span className="text-[11px] text-muted tabular-nums">
              {salon.reviews_count.toLocaleString()} reviews
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {salon.primary_type && (
            <Badge variant="accent">
              {salon.primary_type.replace(/_/g, " ")}
            </Badge>
          )}
          {salon.services && salon.services.split(",").slice(0, 2).map((s) => (
            <Badge key={s.trim()}>{s.trim()}</Badge>
          ))}
        </div>
      </div>
    </button>
  );
}
