"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { JmaMapLevel } from "@/lib/jma/parse-jma-warning";

const PREFECTURE_LABELS: Record<string, string> = Object.fromEntries(
  [
    "北海道",
    "青森県",
    "岩手県",
    "宮城県",
    "秋田県",
    "山形県",
    "福島県",
    "茨城県",
    "栃木県",
    "群馬県",
    "埼玉県",
    "千葉県",
    "東京都",
    "神奈川県",
    "新潟県",
    "富山県",
    "石川県",
    "福井県",
    "山梨県",
    "長野県",
    "岐阜県",
    "静岡県",
    "愛知県",
    "三重県",
    "滋賀県",
    "京都府",
    "大阪府",
    "兵庫県",
    "奈良県",
    "和歌山県",
    "鳥取県",
    "島根県",
    "岡山県",
    "広島県",
    "山口県",
    "徳島県",
    "香川県",
    "愛媛県",
    "高知県",
    "福岡県",
    "佐賀県",
    "長崎県",
    "熊本県",
    "大分県",
    "宮崎県",
    "鹿児島県",
    "沖縄県",
  ].map((label, index) => [`JP-${String(index + 1).padStart(2, "0")}`, label]),
);

const LEVEL_LABEL: Record<JmaMapLevel, string> = {
  none: "発表なし",
  advisory: "注意報",
  warning: "警報",
  special: "特別警報",
};

const FILL: Record<JmaMapLevel | "unknown", string> = {
  none: "#64748b",
  advisory: "#facc15",
  warning: "#ef4444",
  special: "#7f1d1d",
  unknown: "#334155",
};

export type PrefectureWarningMapStatus = "fresh" | "loading" | "error" | "stale" | "partial";

type JapanPrefectureWarningMapProps = {
  levelsByIso: Record<string, JmaMapLevel>;
  status: PrefectureWarningMapStatus;
  highlightIso?: string;
};

function unavailableMessage(status: Exclude<PrefectureWarningMapStatus, "fresh">): string {
  if (status === "loading") return "気象庁警報データを取得中です。警報の有無はまだ判定できません。";
  if (status === "stale") return "気象庁警報データが古いため、地図表示を停止しています。";
  if (status === "partial") return "47都道府県すべてを確認できないため、地図表示を停止しています。";
  return "気象庁警報データを取得できないため、警報の有無は判定できません。";
}

function MapUnavailable({ status }: { status: Exclude<PrefectureWarningMapStatus, "fresh"> }) {
  return (
    <div
      role={status === "loading" ? "status" : "alert"}
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950"
    >
      <p>{unavailableMessage(status)}</p>
      <a
        href="https://www.jma.go.jp/bosai/warning/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex min-h-11 items-center underline underline-offset-2"
      >
        気象庁の警報・注意報で確認する
      </a>
    </div>
  );
}

/**
 * 気象庁の47都道府県データが完全かつ新鮮な場合だけ描画する。
 * 色だけに依存せず、模様・都道府県名のテキスト一覧・SVG title でも状態を伝える。
 */
export function JapanPrefectureWarningMap({
  levelsByIso,
  status,
  highlightIso,
}: JapanPrefectureWarningMapProps) {
  const [fc, setFc] = useState<GeoJSON.FeatureCollection | null>(null);
  const [geometryStatus, setGeometryStatus] = useState<"loading" | "ready" | "error">("loading");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const patternPrefix = useId().replaceAll(":", "");
  const hasAllPrefectures =
    Object.keys(levelsByIso).length === 47 &&
    Object.keys(PREFECTURE_LABELS).every((iso) => levelsByIso[iso] !== undefined);
  const effectiveStatus: PrefectureWarningMapStatus =
    status === "fresh" && !hasAllPrefectures ? "partial" : status;
  const canRenderVerifiedRegions =
    effectiveStatus === "fresh" || effectiveStatus === "partial";

  useEffect(() => {
    if (!canRenderVerifiedRegions) return;
    const controller = new AbortController();
    void fetch("/geo/japan-prefectures-ne10m.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`geometry HTTP ${response.status}`);
        return response.json() as Promise<GeoJSON.FeatureCollection>;
      })
      .then((data) => {
        if (!Array.isArray(data.features) || data.features.length < 47) {
          throw new Error("geometry is incomplete");
        }
        setFc(data);
        setGeometryStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setGeometryStatus("error");
      });
    return () => controller.abort();
  }, [canRenderVerifiedRegions]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextWidth = entry.contentRect.width;
        if (nextWidth > 48) setWidth(nextWidth);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { paths, svgW, svgH } = useMemo(() => {
    if (!fc) {
      return {
        paths: [] as { d: string; iso: string; level: JmaMapLevel | "unknown"; key: string }[],
        svgW: width,
        svgH: 400,
      };
    }
    const padding = 12;
    const nextWidth = Math.max(280, Math.floor(width));
    const projection = geoMercator();
    const path = geoPath(projection);
    const geo = fc as unknown as GeoPermissibleObjects;

    projection.fitWidth(nextWidth - padding * 2, geo);
    const bounds = path.bounds(geo);
    const boundsHeight = Math.ceil(bounds[1][1] - bounds[0][1]);
    let nextHeight = Math.max(280, boundsHeight + padding * 2);
    const maxHeight = Math.round(nextWidth * 2.15);
    nextHeight = Math.min(Math.max(nextHeight, Math.round(nextWidth * 1.25)), maxHeight);

    projection.fitExtent(
      [
        [padding, padding],
        [nextWidth - padding, nextHeight - padding],
      ],
      geo,
    );

    const segments = fc.features.map((feature, index) => {
      const iso = (feature.properties as { iso_3166_2?: string } | null)?.iso_3166_2 ?? "";
      const level = levelsByIso[iso] ?? "unknown";
      const d = path(feature as unknown as GeoPermissibleObjects);
      return { d: d ?? "", iso, level, key: iso || `f-${index}` };
    });

    return { paths: segments, svgW: nextWidth, svgH: nextHeight };
  }, [fc, levelsByIso, width]);

  const activeWarnings = useMemo(
    () =>
      Object.entries(levelsByIso)
        .filter((entry): entry is [string, Exclude<JmaMapLevel, "none">] => entry[1] !== "none")
        .sort(([left], [right]) => left.localeCompare(right)),
    [levelsByIso],
  );

  if (effectiveStatus !== "fresh" && effectiveStatus !== "partial") {
    return <MapUnavailable status={effectiveStatus} />;
  }
  if (geometryStatus !== "ready" || !fc) {
    return <MapUnavailable status={geometryStatus === "error" ? "error" : "loading"} />;
  }

  return (
    <div ref={wrapperRef} className="w-full shrink-0">
      {effectiveStatus === "partial" ? (
        <div
          role="alert"
          className="mb-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950"
        >
          <p>
            {Object.keys(levelsByIso).length}都道府県は地域単位で現在の取得を確認できました。
            未確認地域は斜線表示とし、「警報なし」とは扱いません。
          </p>
          <a
            href="https://www.jma.go.jp/bosai/warning/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-11 items-center underline underline-offset-2"
          >
            気象庁で全国の警報・注意報を確認する
          </a>
        </div>
      ) : null}
      <div className="flex w-full justify-center">
        <svg
          width={svgW}
          height={svgH}
          className="max-w-full"
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-labelledby={`${patternPrefix}-title ${patternPrefix}-desc`}
        >
          <title id={`${patternPrefix}-title`}>気象庁の都道府県別警報・注意報</title>
          <desc id={`${patternPrefix}-desc`}>
            色と模様で注意報、警報、特別警報を示します。地図の後に同じ内容のテキスト一覧があります。
          </desc>
          <defs>
            <pattern id={`${patternPrefix}-none`} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill={FILL.none} />
            </pattern>
            <pattern id={`${patternPrefix}-advisory`} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill={FILL.advisory} />
              <path d="M-2 2L2-2M0 8L8 0M6 10L10 6" stroke="#713f12" strokeWidth="1.4" />
            </pattern>
            <pattern id={`${patternPrefix}-warning`} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill={FILL.warning} />
              <path d="M0 0L8 8M8 0L0 8" stroke="#fff" strokeWidth="1.2" />
            </pattern>
            <pattern id={`${patternPrefix}-special`} width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill={FILL.special} />
              <circle cx="3" cy="3" r="1.5" fill="#fff" />
            </pattern>
            <pattern id={`${patternPrefix}-unknown`} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill={FILL.unknown} />
              <path d="M0 4H8" stroke="#cbd5e1" strokeWidth="1.2" />
            </pattern>
          </defs>
          <rect width={svgW} height={svgH} className="fill-slate-950" rx={4} />
          {paths.map((pathItem) => (
            <path
              key={pathItem.key}
              d={pathItem.d}
              fill={`url(#${patternPrefix}-${pathItem.level})`}
              stroke={pathItem.iso === highlightIso ? "#4ade80" : "#0f172a"}
              strokeWidth={pathItem.iso === highlightIso ? 2.4 : 0.55}
            >
              <title>
                {PREFECTURE_LABELS[pathItem.iso] ?? pathItem.iso}:{" "}
                {pathItem.level === "unknown" ? "状態不明" : LEVEL_LABEL[pathItem.level]}
              </title>
            </path>
          ))}
        </svg>
      </div>

      <div aria-hidden="true" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-700">
        {(Object.keys(LEVEL_LABEL) as JmaMapLevel[]).map((level) => (
          <span key={level} className="flex items-center gap-1">
            <span
              className="h-3 w-5 rounded-sm border border-slate-700"
              style={{ background: FILL[level] }}
            />
            {LEVEL_LABEL[level]}
          </span>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900">
        <p className="font-bold">警報・注意報のテキスト一覧</p>
        {activeWarnings.length === 0 ? (
          <p className="mt-1">
            {effectiveStatus === "partial"
              ? "取得を確認できた地域には警報・注意報がありません。未確認地域の有無は判断できません。"
              : "取得時点で、都道府県単位の警報・注意報の発表はありません。"}
          </p>
        ) : (
          <ul className="mt-1 grid gap-1 sm:grid-cols-2" aria-label="警報・注意報が発表されている都道府県">
            {activeWarnings.map(([iso, level]) => (
              <li key={iso}>
                {PREFECTURE_LABELS[iso] ?? iso}: <strong>{LEVEL_LABEL[level]}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
