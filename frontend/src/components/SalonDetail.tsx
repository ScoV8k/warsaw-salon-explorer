"use client";

import { useState, useEffect, useCallback } from "react";
import { Salon, SalonUpdate, Review, PhotoInfo } from "@/lib/types";
import { fetchSalon, updateSalon, getPhotoUrl } from "@/lib/api";

interface SalonDetailProps {
  placeId: string;
  onClose: () => void;
  onUpdated: () => void;
}

function InfoRow({ icon, label, value, id }: { icon: React.ReactNode; label: string; value: React.ReactNode; id: string }) {
  if (!value) return null;
  return (
    <div id={id} className="flex items-start gap-3 py-2 group/row hover:bg-surface-hover -mx-3 px-3 rounded-lg transition-colors">
      <span className="text-muted mt-0.5 flex-shrink-0 group-hover/row:text-accent transition-colors">{icon}</span>
      <div className="min-w-0 w-full">
        <span className="text-[11px] text-muted uppercase tracking-widest">{label}</span>
        <div className="text-sm text-foreground mt-0.5 break-words leading-relaxed">{value}</div>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-surface-hover/50 rounded-lg p-3.5 transition-colors hover:bg-surface-hover">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-foreground">{review.author}</span>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <svg key={i} className="w-2.5 h-2.5" viewBox="0 0 20 20">
              <path
                d="M10 1l2.39 4.84L17.82 6.7l-3.91 3.81.92 5.39L10 13.27 5.17 15.9l.92-5.39L2.18 6.7l5.43-.86L10 1z"
                fill={i < review.rating ? "var(--accent)" : "var(--border-color)"}
              />
            </svg>
          ))}
        </div>
      </div>
      {review.text && <p className="text-xs text-muted leading-relaxed">{review.text}</p>}
      <span className="text-[10px] text-muted/50 mt-1.5 block">
        {new Date(review.publish_time).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
      </span>
    </div>
  );
}

function PhotoGallery({ photos }: { photos: PhotoInfo[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div id="photo-gallery" className="mb-5">
        <div className="flex overflow-x-auto pb-2 -mx-6 sm:-mx-8 px-6 sm:px-8">
          <div className="flex-shrink-0 rounded-lg overflow-hidden border border-border">
            <img
              src="/placeholder.png"
              alt="Brak zdjęć"
              className="h-[120px] w-[180px] object-cover"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="photo-gallery" className="mb-5">
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-6 sm:-mx-8 px-6 sm:px-8 snap-x snap-mandatory">
          {photos.map((photo, i) => (
            <button
              key={photo.name}
              onClick={() => setLightboxIdx(i)}
              className="flex-shrink-0 snap-start rounded-lg overflow-hidden
                         transition-all duration-200 cursor-pointer group
                         hover:ring-2 hover:ring-accent/30"
            >
              <img
                src={getPhotoUrl(photo.name, 400)}
                alt={`Photo ${i + 1}`}
                width={photo.width > photo.height ? 180 : 120}
                height={120}
                className="h-[120px] w-auto object-cover transition-transform duration-300
                           group-hover:scale-[1.03]"
                loading="lazy"
              />
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted mt-1">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
      </div>

      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-lg
                     animate-[fadeIn_150ms_ease-out]"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white/70 hover:text-white
                       hover:bg-white/20 transition-all cursor-pointer z-10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx - 1 + photos.length) % photos.length);
                }}
                className="absolute left-4 p-2.5 rounded-full bg-white/10 text-white/70 hover:text-white
                           hover:bg-white/20 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx + 1) % photos.length);
                }}
                className="absolute right-4 p-2.5 rounded-full bg-white/10 text-white/70 hover:text-white
                           hover:bg-white/20 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <img
            src={getPhotoUrl(photos[lightboxIdx].name, 1200)}
            alt={`Photo ${lightboxIdx + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl
                       animate-[slideUp_200ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          />

          <span className="absolute bottom-6 text-white/40 text-xs font-mono">
            {lightboxIdx + 1} / {photos.length}
          </span>
        </div>
      )}
    </>
  );
}

function parseOpeningHours(hoursStr: string | undefined): string[] {
  if (!hoursStr) return [];
  try {
    const parsed = JSON.parse(hoursStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    if (hoursStr.includes("|")) return hoursStr.split("|").map(s => s.trim()).filter(Boolean);
    if (hoursStr.includes(",")) return hoursStr.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [hoursStr];
}

function renderOpeningHours(hoursStr: string | undefined) {
  if (!hoursStr) return null;
  const parsed = parseOpeningHours(hoursStr);
  if (parsed.length <= 1) return hoursStr;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full">
      {parsed.map((entry, idx) => {
        const parts = entry.split(/:\s(.+)/);
        const day = parts[0];
        const time = parts[1] || "";
        return (
          <div key={idx} className="flex justify-between items-center bg-background rounded-lg p-2.5 border border-border/50">
            <span className="text-xs font-medium text-muted">{day}</span>
            <span className="text-xs font-semibold text-foreground">{time}</span>
          </div>
        );
      })}
    </div>
  );
}

const EDITABLE_FIELDS: { key: keyof SalonUpdate; label: string; type?: string }[] = [
  { key: "name", label: "Name" },
  { key: "address", label: "Address" },
  { key: "actual_district", label: "District" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "services", label: "Services" },
  { key: "opening_hours", label: "Opening hours" },
  { key: "business_status", label: "Business status" },
  { key: "editorial_summary", label: "Summary" },
  { key: "rating", label: "Rating", type: "number" },
  { key: "reviews_count", label: "Reviews count", type: "number" },
  { key: "price_level", label: "Price level" },
];

export default function SalonDetail({ placeId, onClose, onUpdated }: SalonDetailProps) {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<SalonUpdate>({});

  useEffect(() => {
    setLoading(true);
    fetchSalon(placeId)
      .then((s) => {
        setSalon(s);
        setForm(buildForm(s));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [placeId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  function buildForm(s: Salon): SalonUpdate {
    const f: SalonUpdate = {};
    EDITABLE_FIELDS.forEach(({ key }) => {
      const v = s[key as keyof Salon];
      if (v !== null && v !== undefined) {
        (f as Record<string, unknown>)[key] = v;
      }
    });
    return f;
  }

  async function handleSave() {
    if (!salon) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const changed: SalonUpdate = {};
      EDITABLE_FIELDS.forEach(({ key, type }) => {
        const newVal = (form as Record<string, unknown>)[key];
        const oldVal = (salon as unknown as Record<string, unknown>)[key];
        if (newVal !== oldVal && newVal !== undefined) {
          (changed as Record<string, unknown>)[key] =
            type === "number" ? Number(newVal) : newVal;
        }
      });

      if (Object.keys(changed).length === 0) {
        setSaveMsg({ type: "success", text: "No changes to save" });
        setSaving(false);
        return;
      }

      const updated = await updateSalon(placeId, changed);
      setSalon({ ...salon, ...updated });
      setForm(buildForm({ ...salon, ...updated }));
      setEditing(false);
      setSaveMsg({ type: "success", text: "Saved successfully" });
      onUpdated();
    } catch (err) {
      setSaveMsg({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  const reviews: Review[] = salon?.reviews
    ? salon.reviews
    : Array.isArray(salon?.top_reviews)
    ? salon.top_reviews
    : [];

  return (
    <div
      id="salon-detail-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm
                 overflow-y-auto py-8 px-4 animate-[fadeIn_150ms_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-surface rounded-2xl border border-border/60
                   shadow-xl shadow-black/[0.08]
                   animate-[slideUp_250ms_ease-out]"
      >
        <button
          id="close-detail"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 p-1.5 rounded-lg bg-surface-hover
                     text-muted hover:text-foreground transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : !salon ? (
          <div className="p-8 text-center text-muted text-sm">Salon not found</div>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="mb-5">
              <div className="flex items-start gap-2 mb-1">
                {salon.business_status === "OPERATIONAL" && (
                  <span className="mt-2 w-2 h-2 rounded-full bg-success flex-shrink-0" />
                )}
                <h2 id="salon-name" className="text-lg sm:text-xl font-bold text-foreground leading-snug pr-8">
                  {salon.name}
                </h2>
              </div>
              <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                {salon.rating !== null && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20">
                      <path
                        d="M10 1l2.39 4.84L17.82 6.7l-3.91 3.81.92 5.39L10 13.27 5.17 15.9l.92-5.39L2.18 6.7l5.43-.86L10 1z"
                        fill="var(--accent)"
                      />
                    </svg>
                    {salon.rating.toFixed(1)}
                  </span>
                )}
                {salon.reviews_count !== null && (
                  <span className="text-xs text-muted">{salon.reviews_count} reviews</span>
                )}
                {salon.primary_type && (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-accent-soft text-accent">
                    {salon.primary_type.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>

            {(() => {
              const photos: PhotoInfo[] = Array.isArray(salon.photos_json) ? salon.photos_json : [];
              return <PhotoGallery photos={photos} />;
            })()}

            <div className="border-t border-border/60 pt-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-widest">Details</h3>
                <div className="flex items-center gap-2">
                  {saveMsg && (
                    <span
                      className={`text-[11px] font-medium ${
                        saveMsg.type === "success" ? "text-success" : "text-red-500"
                      } animate-[fadeIn_200ms]`}
                    >
                      {saveMsg.text}
                    </span>
                  )}
                  {editing ? (
                    <>
                      <button
                        id="cancel-edit"
                        onClick={() => {
                          setEditing(false);
                          if (salon) setForm(buildForm(salon));
                          setSaveMsg(null);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted
                                   hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        id="save-edit"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-accent
                                   hover:bg-accent-hover disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {saving ? "Saving..." : "Save changes"}
                      </button>
                    </>
                  ) : (
                    <button
                      id="edit-salon"
                      onClick={() => { setEditing(true); setSaveMsg(null); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted
                                 hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {editing ? (
                <div className="grid gap-2.5">
                  {EDITABLE_FIELDS.map(({ key, label, type }) => (
                    <div key={key}>
                      <label className="text-[11px] text-muted uppercase tracking-widest mb-1 block">{label}</label>
                      <input
                        id={`edit-${key}`}
                        type={type || "text"}
                        step={type === "number" ? "0.1" : undefined}
                        value={String((form as Record<string, unknown>)[key] ?? "")}
                        onChange={(e) =>
                          setForm({ ...form, [key]: type === "number" ? e.target.value : e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-surface-hover border-0 text-sm
                                   text-foreground transition-all
                                   focus:ring-2 focus:ring-accent/20 focus:bg-surface"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-0.5">
                  <InfoRow
                    id="info-address"
                    icon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    }
                    label="Address"
                    value={salon.address}
                  />
                  <InfoRow
                    id="info-phone"
                    icon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    }
                    label="Phone"
                    value={salon.phone}
                  />
                  <InfoRow
                    id="info-website"
                    icon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                    }
                    label="Website"
                    value={salon.website}
                  />
                  <InfoRow
                    id="info-services"
                    icon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                      </svg>
                    }
                    label="Services"
                    value={salon.services}
                  />
                  <InfoRow
                    id="info-hours"
                    icon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    label="Opening Hours"
                    value={renderOpeningHours(salon.opening_hours)}
                  />
                  <InfoRow
                    id="info-summary"
                    icon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                      </svg>
                    }
                    label="Summary"
                    value={salon.editorial_summary}
                  />
                </div>
              )}
            </div>

            {salon.google_maps_url && (
              <a
                id="maps-link"
                href={salon.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent
                           font-medium transition-colors mb-5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Open in Google Maps
              </a>
            )}

            {reviews.length > 0 && (
              <div className="border-t border-border/60 pt-4">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
                  Reviews ({reviews.length})
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {reviews.map((r, i) => (
                    <ReviewCard key={`${r.author}-${i}`} review={r} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
