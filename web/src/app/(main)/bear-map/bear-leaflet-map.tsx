"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { BearSighting } from "@/data/bear-sightings";
import "leaflet/dist/leaflet.css";

// Leaflet default icon fix for Next.js
const hiGumaIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">🔴</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});
const tsukinowaIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">🟠</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function BearLeafletMap({ sightings }: { sightings: BearSighting[] }) {
  useEffect(() => {
    // Fix default icon paths
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);

  return (
    <MapContainer
      center={[38.5, 137.5]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {sightings.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={s.bearType === "ヒグマ" ? hiGumaIcon : tsukinowaIcon}
        >
          <Popup>
            <div className="min-w-[180px]">
              <p className="font-bold text-slate-900">
                {s.prefecture} {s.city}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{s.date}</p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                  s.bearType === "ヒグマ" ? "bg-red-600" : "bg-amber-600"
                }`}
              >
                {s.bearType}
              </span>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{s.detail}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
