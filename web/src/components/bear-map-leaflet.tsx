"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { BearSighting, BearSightingType } from "@/data/bear-sightings-real";

// 種別ごとの色（目撃=緑大、被害=赤大、捕獲=青、痕跡=灰）
const TYPE_COLORS: Record<BearSightingType, string> = {
  目撃: "#22c55e",
  被害: "#ef4444",
  捕獲: "#3b82f6",
  痕跡: "#9ca3af",
};

// 種別ごとのデフォルト半径（目撃・被害は大きく）
const TYPE_RADIUS: Record<BearSightingType, number> = {
  目撃: 10,
  被害: 10,
  捕獲: 7,
  痕跡: 7,
};

// 都道府県の表示範囲（bounds）
const PREFECTURE_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  富山県: [[36.4, 136.7], [37.1, 137.7]],
  秋田県: [[38.9, 139.7], [40.5, 141.1]],
  石川県: [[36.1, 136.2], [37.6, 137.4]],
  長野県: [[35.2, 137.4], [37.0, 138.6]],
  新潟県: [[36.8, 137.6], [38.6, 139.8]],
};

interface Props {
  sightings: BearSighting[];
  onSelectSighting: (s: BearSighting) => void;
  selectedSighting: BearSighting | null;
  focusPrefecture?: string | null;
}

// フィルター変更時に地図の表示範囲を更新
function MapController({
  sightings,
  focusPrefecture,
}: {
  sightings: BearSighting[];
  focusPrefecture?: string | null;
}) {
  const map = useMap();

  // 都道府県選択時はその都道府県にズーム
  useEffect(() => {
    if (focusPrefecture && PREFECTURE_BOUNDS[focusPrefecture]) {
      const bounds = PREFECTURE_BOUNDS[focusPrefecture];
      map.fitBounds(bounds, { animate: true, maxZoom: 10 });
      return;
    }
    // 都道府県未指定またはデータあり → データに合わせてフィット
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
  }, [sightings, map, focusPrefecture]);

  return null;
}

export default function BearMapLeaflet({
  sightings,
  onSelectSighting,
  selectedSighting,
  focusPrefecture,
}: Props) {
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
        {sightings.map((s) => {
          const isSelected = selectedSighting?.id === s.id;
          const baseRadius = TYPE_RADIUS[s.type];
          return (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={isSelected ? baseRadius + 5 : baseRadius}
              pathOptions={{
                color: TYPE_COLORS[s.type],
                fillColor: TYPE_COLORS[s.type],
                fillOpacity: isSelected ? 0.95 : 0.8,
                weight: isSelected ? 3 : 1.5,
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
          );
        })}
      </MarkerClusterGroup>
      <MapController sightings={sightings} focusPrefecture={focusPrefecture} />
    </MapContainer>
  );
}
