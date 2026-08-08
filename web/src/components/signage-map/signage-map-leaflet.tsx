"use client";

// 地図を使わないページのrender-blocking CSSへ混ぜず、この動的chunkと同時に読む。
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { LEVEL_COLOR, levelLabel } from "@/lib/jma/jma-data";
import type {
  JmaEarthquake,
  JmaMapLevel,
  JmaWeatherEntry,
} from "@/lib/jma/jma-data";
import {
  PREFECTURE_CENTROIDS,
  centroidByIso,
} from "@/data/jma/prefecture-centroids";

export type SignagePin = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  createdAt: string;
};

type Props = {
  warningsByIso: Record<string, JmaMapLevel>;
  weatherByIso: Record<string, JmaWeatherEntry>;
  earthquakes: JmaEarthquake[];
  pins: SignagePin[];
  initialCenter: [number, number];
  initialZoom: number;
  onPinAdd?: (lat: number, lng: number) => void;
  onPinDelete?: (id: string) => void;
  onViewChange?: (lat: number, lng: number, zoom: number) => void;
};

const ATTRIBUTION =
  '出典：<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院（淡色地図）</a> / 警報・天気・地震データ：<a href="https://www.jma.go.jp/bosai/" target="_blank" rel="noreferrer">気象庁</a>';
const TILE_URL = "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png";

/** 円の半径（ズームに応じて拡大）。警報マーカー用。 */
function warningRadius(zoom: number): number {
  if (zoom <= 5) return 14;
  if (zoom <= 7) return 18;
  if (zoom <= 9) return 24;
  return 30;
}

/** 天気コード先頭1桁 → 絵文字（簡易マッピング） */
function weatherEmoji(code: string | null): string {
  if (!code) return "❔";
  const head = code[0];
  if (head === "1") return "☀️";
  if (head === "2") return "☁️";
  if (head === "3") return "🌧️";
  if (head === "4") return "❄️";
  return "❔";
}

function intensityColor(maxInt: string | null): string {
  if (!maxInt) return "#94a3b8";
  if (maxInt === "7") return "#7f1d1d";
  if (maxInt.startsWith("6")) return "#b91c1c";
  if (maxInt.startsWith("5")) return "#ea580c";
  if (maxInt === "4") return "#f59e0b";
  return "#fbbf24";
}

function ViewSync({
  initialCenter,
  initialZoom,
  onViewChange,
}: {
  initialCenter: [number, number];
  initialZoom: number;
  onViewChange?: (lat: number, lng: number, zoom: number) => void;
}) {
  const map = useMap();
  const lat = initialCenter[0];
  const lng = initialCenter[1];
  useEffect(() => {
    map.setView([lat, lng], initialZoom, { animate: false });
  }, [map, lat, lng, initialZoom]);

  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onViewChange?.(c.lat, c.lng, map.getZoom());
    },
  });
  return null;
}

function PinCreator({
  onPinAdd,
}: {
  onPinAdd?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    contextmenu: (e) => {
      onPinAdd?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function SignageMapLeaflet({
  warningsByIso,
  weatherByIso,
  earthquakes,
  pins,
  initialCenter,
  initialZoom,
  onPinAdd,
  onPinDelete,
  onViewChange,
}: Props) {
  const [tileStatus, setTileStatus] = useState<
    "loading" | "loaded" | "partial"
  >("loading");
  const tileErrorSeen = useRef(false);
  const pinIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<div style="font-size:24px;line-height:24px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));">📍</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 22],
      }),
    [],
  );

  return (
    <div className="relative h-full w-full">
      <p id="signage-map-keyboard-help" className="sr-only">
        地図にフォーカスして矢印キーで移動し、プラスキーとマイナスキーで拡大縮小できます。地図だけで安全判断を確定せず、表示された提供元の公式情報を確認してください。
      </p>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl
      >
        <MapAccessibility />
        <TileLayer
          url={TILE_URL}
          attribution={ATTRIBUTION}
          eventHandlers={{
            loading: () => {
              tileErrorSeen.current = false;
              setTileStatus("loading");
            },
            tileerror: () => {
              tileErrorSeen.current = true;
              setTileStatus("partial");
            },
            load: () => {
              setTileStatus(tileErrorSeen.current ? "partial" : "loaded");
            },
          }}
        />

        <ViewSync
          initialCenter={initialCenter}
          initialZoom={initialZoom}
          onViewChange={onViewChange}
        />
        <PinCreator onPinAdd={onPinAdd} />

        {/* 警報レイヤー：都道府県中心点に色付き円マーカー */}
        <WarningOverlay warningsByIso={warningsByIso} />

        {/* 天気アイコン：ズーム連動（県庁所在地のみ） */}
        <WeatherOverlay weatherByIso={weatherByIso} />

        {/* 地震マーカー */}
        {earthquakes.map((eq, idx) => {
          if (typeof eq.lat !== "number" || typeof eq.lng !== "number")
            return null;
          const color = intensityColor(eq.maxIntensity);
          return (
            <CircleMarker
              key={eq.eventId ?? idx}
              center={[eq.lat, eq.lng]}
              radius={Math.max(8, Number(eq.magnitude ?? 4) * 2)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.55,
                weight: 2,
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <p className="text-sm font-bold text-slate-900">
                    {eq.hypocenter ?? "震源不明"}
                  </p>
                  <p className="text-xs text-slate-700">
                    最大震度{" "}
                    <span className="font-bold">{eq.maxIntensity ?? "—"}</span>
                    {eq.magnitude ? ` / M${eq.magnitude}` : ""}
                  </p>
                  <p className="text-xs text-slate-600">
                    {eq.occurredAt ?? eq.reportDatetime ?? ""}
                  </p>
                  {eq.depth ? (
                    <p className="text-xs text-slate-600">深さ: {eq.depth}</p>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* ピン */}
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="text-sm font-bold text-slate-900">{p.label}</p>
                <p className="text-[11px] text-slate-600">
                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                </p>
                {onPinDelete ? (
                  <button
                    type="button"
                    onClick={() => onPinDelete(p.id)}
                    className="mt-2 inline-flex min-h-[44px] items-center rounded border border-rose-400 bg-rose-50 px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    このピンを削除
                  </button>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {tileStatus !== "loaded" ? (
        <div
          data-tile-status={tileStatus}
          role={tileStatus === "partial" ? "alert" : "status"}
          aria-live="polite"
          className={`pointer-events-none absolute bottom-10 left-1/2 z-[1050] w-[min(92%,34rem)] -translate-x-1/2 rounded-lg border px-3 py-2 text-center text-xs font-bold shadow ${
            tileStatus === "partial"
              ? "border-rose-300 bg-rose-950/95 text-rose-100"
              : "border-slate-500 bg-slate-950/90 text-slate-100"
          }`}
        >
          {tileStatus === "partial"
            ? "背景地図の一部または全部を取得できません。地図上の位置関係だけで判断せず、気象庁の公式情報を確認してください。"
            : "背景地図を取得中です。読み込み完了まで地図上の位置関係で判断しないでください。"}
        </div>
      ) : null}
    </div>
  );
}

function WarningOverlay({
  warningsByIso,
}: {
  warningsByIso: Record<string, JmaMapLevel>;
}) {
  const map = useMap();
  const zoom = map.getZoom();
  return (
    <>
      {PREFECTURE_CENTROIDS.map((c) => {
        const level = warningsByIso[c.iso] ?? "none";
        if (level === "none") return null;
        const color = LEVEL_COLOR[level];
        return (
          <CircleMarker
            key={`warn-${c.iso}`}
            center={[c.lat, c.lng]}
            radius={warningRadius(zoom)}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: level === "special" ? 0.55 : 0.4,
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="text-sm font-bold text-slate-900">{c.name}</p>
                <p className="text-xs font-semibold" style={{ color }}>
                  {levelLabel(level)}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

function WeatherOverlay({
  weatherByIso,
}: {
  weatherByIso: Record<string, JmaWeatherEntry>;
}) {
  const map = useMap();
  const zoom = map.getZoom();
  if (zoom < 6) return null;
  const isos = Object.keys(weatherByIso);
  return (
    <>
      {isos.map((iso) => {
        const w = weatherByIso[iso];
        const c = centroidByIso(iso);
        if (!w || !c) return null;
        const icon = L.divIcon({
          className: "",
          html: `<div style="font-size:${zoom >= 8 ? 28 : 22}px;line-height:1;">${weatherEmoji(w.todayWeatherCode)}</div>`,
          iconSize: [zoom >= 8 ? 28 : 22, zoom >= 8 ? 28 : 22],
          iconAnchor: [(zoom >= 8 ? 28 : 22) / 2, (zoom >= 8 ? 28 : 22) / 2],
        });
        return (
          <Marker key={`weather-${iso}`} position={[c.lat, c.lng]} icon={icon}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="text-sm font-bold text-slate-900">{w.label}</p>
                <p className="text-xs text-slate-700">
                  {w.todayWeatherText ?? "—"}
                </p>
                <p className="text-[10px] text-slate-500">
                  {w.publishingOffice ?? ""}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
function MapAccessibility() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("role", "region");
    container.setAttribute(
      "aria-label",
      "気象警報・地震・現場ピンを確認する操作可能な地図",
    );
    container.setAttribute("aria-describedby", "signage-map-keyboard-help");

    return () => {
      container.removeAttribute("role");
      container.removeAttribute("aria-label");
      container.removeAttribute("aria-describedby");
    };
  }, [map]);

  return null;
}
