"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { Salon, PhotoInfo } from "@/lib/types";
import { getPhotoUrl } from "@/lib/api";

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapComponentProps {
  salons: Salon[];
  activeSalonId: string | null;
  onSalonSelect: (id: string | null) => void;
  onBoundsChanged: (bounds: MapBounds | null, zoom: number) => void;
  center: google.maps.LatLngLiteral;
  zoom: number;
  onCameraChange: (center: google.maps.LatLngLiteral, zoom: number) => void;
  onViewDetails: (id: string) => void;
}

export default function MapComponent({ 
  salons, 
  activeSalonId, 
  onSalonSelect, 
  onBoundsChanged,
  center,
  zoom,
  onCameraChange,
  onViewDetails
}: MapComponentProps) {
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const handleCameraChange = (ev: MapCameraChangedEvent) => {
    const { bounds, center: newCenter, zoom: newZoom } = ev.detail;
    
    // Update parent camera state to keep it controlled
    onCameraChange(newCenter, newZoom);

    // Provide bounds
    if (bounds) {
      onBoundsChanged({
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west
      }, newZoom);
    } else {
      onBoundsChanged(null, newZoom);
    }
  };

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        center={center}
        zoom={zoom}
        onCameraChanged={handleCameraChange}
        mapId="DEMO_MAP_ID"
        disableDefaultUI={false}
        className="w-full h-full z-0"
      >
        {salons.map((salon) => {
          if (!salon.lat || !salon.lng) return null;
          
          return (
            <AdvancedMarker
              key={salon.google_place_id}
              position={{ lat: salon.lat, lng: salon.lng }}
              onClick={() => onSalonSelect(salon.google_place_id)}
            />
          );
        })}

        {activeSalonId && (
          <InfoWindow
            position={{
              lat: salons.find((s) => s.google_place_id === activeSalonId)?.lat || 0,
              lng: salons.find((s) => s.google_place_id === activeSalonId)?.lng || 0,
            }}
            onCloseClick={() => onSalonSelect(null)}
          >
            {(() => {
              const salon = salons.find((s) => s.google_place_id === activeSalonId);
              if (!salon) return null;

              const photos: PhotoInfo[] = Array.isArray(salon.photos_json) ? salon.photos_json : [];
              const coverPhoto = photos.length > 0 ? photos[0] : null;

              return (
                <div className="flex flex-col gap-2 p-1 w-[200px]">
                  {coverPhoto ? (
                    <img
                      src={getPhotoUrl(coverPhoto.name, 200)}
                      alt=""
                      className="w-full h-24 object-cover rounded-md"
                    />
                  ) : (
                    <img
                      src="/placeholder.png"
                      alt=""
                      className="w-full h-24 object-cover rounded-md"
                    />
                  )}
                  <h3 className="text-sm font-semibold leading-tight text-gray-900">{salon.name}</h3>
                  
                  <div className="flex items-center gap-1.5 mt-1">
                    {salon.rating !== null && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900">
                        <svg className="w-3 h-3 text-accent" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 1l2.39 4.84L17.82 6.7l-3.91 3.81.92 5.39L10 13.27 5.17 15.9l.92-5.39L2.18 6.7l5.43-.86L10 1z" />
                        </svg>
                        {salon.rating.toFixed(1)}
                      </span>
                    )}
                    {salon.reviews_count !== null && (
                      <span className="text-[10px] text-gray-500">({salon.reviews_count})</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {salon.primary_type && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-soft text-accent">
                        {salon.primary_type.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(salon.google_place_id);
                    }}
                    className="mt-2 w-full py-1.5 bg-accent text-white rounded-md text-xs font-medium hover:bg-accent-hover transition-colors"
                  >
                    View Details
                  </button>
                </div>
              );
            })()}
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
