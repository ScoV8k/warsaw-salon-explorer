"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Salon } from "@/lib/types";
import { fetchMapSalons, getPhotoUrl } from "@/lib/api";
import SalonDetail from "@/components/SalonDetail";
import { MapBounds } from "@/components/MapComponent";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-hover flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
    </div>
  ),
});

function MapPageContent() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  
  // Map State
  const [center, setCenter] = useState({ lat: 52.237, lng: 21.011 }); // Warsaw center
  const [zoom, setZoom] = useState(11);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  
  const searchParams = useSearchParams();
  const search = searchParams.get("q")?.toLowerCase() || "";

  useEffect(() => {
    fetchMapSalons()
      .then((data) => setSalons(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredSalons = useMemo(() => {
    return salons.filter(s => {
      if (!search) return true;
      return (
        s.name.toLowerCase().includes(search) || 
        (s.actual_district && s.actual_district.toLowerCase().includes(search)) ||
        (s.services && s.services.toLowerCase().includes(search))
      );
    });
  }, [salons, search]);

  const visibleSalons = useMemo(() => {
    let visible: Salon[] = [];
    if (zoom >= 13 && bounds) {
      visible = filteredSalons.filter(s => {
        if (!s.lat || !s.lng) return false;
        return (
          s.lat <= bounds.north &&
          s.lat >= bounds.south &&
          s.lng <= bounds.east &&
          s.lng >= bounds.west
        );
      }).slice(0, 30); // Max 30 to keep the sidebar performant
    }
    
    // Fix: If a salon is selected, always keep it in visibleSalons so the map InfoWindow doesn't crash
    if (selectedId && !visible.find(s => s.google_place_id === selectedId)) {
      const active = salons.find(s => s.google_place_id === selectedId);
      if (active) visible.push(active);
    }
    
    return visible;
  }, [filteredSalons, bounds, zoom, selectedId, salons]);

  const handleSidebarClick = (salon: Salon) => {
    if (salon.lat && salon.lng) {
      setCenter({ lat: salon.lat, lng: salon.lng });
      setZoom(15);
      setSelectedId(salon.google_place_id);
    }
  };

  return (
    <div className="h-[calc(100vh-72px)] w-full flex overflow-hidden bg-background">
      
      {/* Sidebar Panel */}
      <div className="w-96 flex-shrink-0 border-r border-border bg-background flex flex-col z-10 shadow-xl">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Nearby
          </h2>
          <p className="text-xs text-muted mt-1">
            {zoom < 13 
              ? "Zoom in to see salon suggestions."
              : `Found ${visibleSalons.length} salons in this area`
            }
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {zoom < 13 ? (
            <div className="text-center text-muted text-sm py-10 px-4">
              Zoom into a specific area on the map to display nearby salons.
            </div>
          ) : visibleSalons.length === 0 ? (
            <div className="text-center text-muted text-sm py-10 px-4">
              No salons found in this area. Try panning or zooming the map.
            </div>
          ) : (
            visibleSalons.map(salon => {
              const cover = salon.photos_json && Array.isArray(salon.photos_json) && salon.photos_json.length > 0 
                ? salon.photos_json[0].name : null;
                
              return (
                <div 
                  key={salon.google_place_id}
                  onClick={() => handleSidebarClick(salon)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedId === salon.google_place_id 
                      ? "border-accent bg-accent-soft ring-1 ring-accent"
                      : "border-border bg-surface hover:border-accent/50 hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex gap-3">
                    {cover ? (
                      <img src={getPhotoUrl(cover, 100)} loading="lazy" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" alt="" />
                    ) : (
                      <img src="/placeholder.png" loading="lazy" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" alt="No photo" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate text-foreground">{salon.name}</h3>
                      <p className="text-xs text-muted truncate mt-0.5">{salon.address || salon.actual_district}</p>
                      {salon.rating && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 1l2.39 4.84L17.82 6.7l-3.91 3.81.92 5.39L10 13.27 5.17 15.9l.92-5.39L2.18 6.7l5.43-.86L10 1z" />
                          </svg>
                          <span className="text-xs font-semibold">{salon.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="w-full h-full bg-surface-hover flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <MapComponent 
            salons={visibleSalons} 
            activeSalonId={selectedId}
            onSalonSelect={setSelectedId} 
            onBoundsChanged={setBounds}
            center={center}
            zoom={zoom}
            onCameraChange={(c, z) => {
              setCenter(c);
              setZoom(z);
            }}
            onViewDetails={setDetailsId}
          />
        )}
      </div>

      {detailsId && (
        <SalonDetail
          placeId={detailsId}
          onClose={() => setDetailsId(null)}
          onUpdated={() => {}}
        />
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="w-full h-full bg-surface-hover flex items-center justify-center"><div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" /></div>}>
      <MapPageContent />
    </Suspense>
  );
}
