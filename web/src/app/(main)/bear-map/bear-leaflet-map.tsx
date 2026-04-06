"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { BearSighting, BearSightingType } from "@/data/bear-sightings-real";
import "leaflet/dist/leaflet.css";

// 種別ごとの色
const TYPE_COLORS: Record<BearSightingType, string> = {
  目撃: "#22c55e",
  被害: "#ef4444",
  捕獲: "#3b82f6",
  痕跡: "#9ca3af",
};

const TYPE_RADIUS = 9;

// 都道府県ごとの中心座標とズームレベル
export const PREFECTURE_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  富山県: { center: [36.7, 137.21], zoom: 9 },
  秋田県: { center: [39.72, 140.10], zoom: 8 },
  石川県: { center: [36.59, 136.63], zoom: 9 },
  長野県: { center: [36.65, 138.18], zoom: 8 },
  新潟県: { center: [37.49, 138.64], zoom: 8 },
};

// 地図ビューを制御するコンポーネント
function MapController({
  targetView,
}: {
  targetView: { center: [number, number]; zoom: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (targetView) {
      map.flyTo(targetView.center, targetView.zoom, { duration: 1.2 });
    }
  }, [map, targetView]);
  return null;
}

export default function BearLeafletMap({
  sightings,
  targetView,
}: {
  sightings: BearSighting[];
  targetView: { center: [number, number]; zoom: number } | null;
}) {
  useEffect(() => {
    // Fix default icon paths for Next.js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);

  return (
    <MapContainer
      center={[37.5, 137.8]}
      zoom={7}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController targetView={targetView} />
      {sightings.map((s) => {
        const color = TYPE_COLORS[s.type] ?? "#9ca3af";
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={TYPE_RADIUS}
            pathOptions={{
              color: "#fff",
              weight: 1.5,
              fillColor: color,
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <p className="font-bold text-slate-900">
                  {s.prefecture} {s.city}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{s.location}</p>
                <p className="text-xs text-slate-400">{s.date}</p>
                <span
                  className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {s.type}
                </span>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                  {s.description}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">出典: {s.source}</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
