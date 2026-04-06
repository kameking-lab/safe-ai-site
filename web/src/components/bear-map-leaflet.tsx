"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import type { BearSighting, BearSightingType } from "@/data/bear-sightings-real";

const TYPE_COLORS: Record<BearSightingType, string> = {
  目撃: "#f59e0b",
  被害: "#ef4444",
  捕獲: "#3b82f6",
  痕跡: "#22c55e",
};

interface Props {
  sightings: BearSighting[];
  onSelectSighting: (s: BearSighting) => void;
  selectedSighting: BearSighting | null;
}

// フィルター変更時に地図の中心をリセット
function MapRecenter({ sightings }: { sightings: BearSighting[] }) {
  const map = useMap();
  useEffect(() => {
    if (sightings.length > 0) {
      const lats = sightings.map((s) => s.lat);
      const lngs = sightings.map((s) => s.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      map.fitBounds(
        [
          [minLat - 0.1, minLng - 0.1],
          [maxLat + 0.1, maxLng + 0.1],
        ],
        { animate: true, maxZoom: 10 }
      );
    }
  }, [sightings, map]);
  return null;
}

export default function BearMapLeaflet({ sightings, onSelectSighting, selectedSighting }: Props) {
  return (
    <MapContainer
      center={[37.5, 138.5]}
      zoom={6}
      style={{ height: "480px", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={60}
        showCoverageOnHover={false}
      >
        {sightings.map((s) => (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={selectedSighting?.id === s.id ? 12 : 8}
            pathOptions={{
              color: TYPE_COLORS[s.type],
              fillColor: TYPE_COLORS[s.type],
              fillOpacity: selectedSighting?.id === s.id ? 0.95 : 0.75,
              weight: selectedSighting?.id === s.id ? 3 : 1.5,
            }}
            eventHandlers={{
              click: () => onSelectSighting(s),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <p className="font-bold text-sm">
                  {s.prefecture} {s.city}
                </p>
                <p className="text-xs text-gray-600">{s.location}</p>
                <p className="text-xs mt-1">
                  <span
                    className="font-semibold"
                    style={{ color: TYPE_COLORS[s.type] }}
                  >
                    [{s.type}]
                  </span>{" "}
                  {s.date}
                </p>
                <p className="text-xs mt-1 text-gray-700">{s.description}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MarkerClusterGroup>
      <MapRecenter sightings={sightings} />
    </MapContainer>
  );
}
