"use client";

import { useEffect, useMemo, useState } from "react";
import {
  japanRegionMeta,
  type JapanRegionId,
  type MapAlertLevel,
} from "@/data/mock/japan-weather-map-mock";
import { JapanMapSvg } from "@/components/signage/japan-map-svg";
import { JapanPrefectureWarningMap } from "@/components/signage/japan-prefecture-warning-map";
import type { WeatherForecastApiResponse, RegionForecast, ForecastDay } from "@/app/api/weather-forecast/route";

// ────────────────────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────────────────────

const JMA_REGIONS = [
  { iso: "JP-01", prefName: "北海道", regionId: "hokkaido" },
  { iso: "JP-02", prefName: "青森県", regionId: "tohoku" },
  { iso: "JP-03", prefName: "岩手県", regionId: "tohoku" },
  { iso: "JP-04", prefName: "宮城県", regionId: "tohoku" },
  { iso: "JP-05", prefName: "秋田県", regionId: "tohoku" },
  { iso: "JP-06", prefName: "山形県", regionId: "tohoku" },
  { iso: "JP-07", prefName: "福島県", regionId: "tohoku" },
  { iso: "JP-08", prefName: "茨城県", regionId: "kanto" },
  { iso: "JP-09", prefName: "栃木県", regionId: "kanto" },
  { iso: "JP-10", prefName: "群馬県", regionId: "kanto" },
  { iso: "JP-11", prefName: "埼玉県", regionId: "kanto" },
  { iso: "JP-12", prefName: "千葉県", regionId: "kanto" },
  { iso: "JP-13", prefName: "東京都", regionId: "kanto" },
  { iso: "JP-14", prefName: "神奈川県", regionId: "kanto" },
  { iso: "JP-15", prefName: "新潟県", regionId: "chubu" },
  { iso: "JP-16", prefName: "富山県", regionId: "chubu" },
  { iso: "JP-17", prefName: "石川県", regionId: "chubu" },
  { iso: "JP-18", prefName: "福井県", regionId: "chubu" },
  { iso: "JP-19", prefName: "山梨県", regionId: "chubu" },
  { iso: "JP-20", prefName: "長野県", regionId: "chubu" },
  { iso: "JP-21", prefName: "岐阜県", regionId: "chubu" },
  { iso: "JP-22", prefName: "静岡県", regionId: "chubu" },
  { iso: "JP-23", prefName: "愛知県", regionId: "chubu" },
  { iso: "JP-24", prefName: "三重県", regionId: "kinki" },
  { iso: "JP-25", prefName: "滋賀県", regionId: "kinki" },
  { iso: "JP-26", prefName: "京都府", regionId: "kinki" },
  { iso: "JP-27", prefName: "大阪府", regionId: "kinki" },
  { iso: "JP-28", prefName: "兵庫県", regionId: "kinki" },
  { iso: "JP-29", prefName: "奈良県", regionId: "kinki" },
  { iso: "JP-30", prefName: "和歌山県", regionId: "kinki" },
  { iso: "JP-31", prefName: "鳥取県", regionId: "chugoku" },
  { iso: "JP-32", prefName: "島根県", regionId: "chugoku" },
  { iso: "JP-33", prefName: "岡山県", regionId: "chugoku" },
  { iso: "JP-34", prefName: "広島県", regionId: "chugoku" },
  { iso: "JP-35", prefName: "山口県", regionId: "chugoku" },
  { iso: "JP-36", prefName: "徳島県", regionId: "shikoku" },
  { iso: "JP-37", prefName: "香川県", regionId: "shikoku" },
  { iso: "JP-38", prefName: "愛媛県", regionId: "shikoku" },
  { iso: "JP-39", prefName: "高知県", regionId: "shikoku" },
  { iso: "JP-40", prefName: "福岡県", regionId: "kyushu" },
  { iso: "JP-41", prefName: "佐賀県", regionId: "kyushu" },
  { iso: "JP-42", prefName: "長崎県", regionId: "kyushu" },
  { iso: "JP-43", prefName: "熊本県", regionId: "kyushu" },
  { iso: "JP-44", prefName: "大分県", regionId: "kyushu" },
  { iso: "JP-45", prefName: "宮崎県", regionId: "kyushu" },
  { iso: "JP-46", prefName: "鹿児島県", regionId: "kyushu" },
  { iso: "JP-47", prefName: "沖縄県", regionId: "kyushu" },
];

// 代表都市（市区町村単位の詳細情報として表示）
const REGION_CITIES: Record<string, string[]> = {
  hokkaido: ["札幌市", "旭川市", "函館市", "釧路市", "帯広市", "北見市", "小樽市", "苫小牧市"],
  tohoku: ["仙台市", "青森市", "盛岡市", "秋田市", "山形市", "福島市", "郡山市", "いわき市"],
  kanto: ["新宿区", "横浜市", "さいたま市", "千葉市", "宇都宮市", "前橋市", "水戸市"],
  chubu: ["名古屋市", "静岡市", "新潟市", "長野市", "岐阜市", "金沢市", "富山市", "浜松市"],
  kinki: ["大阪市", "京都市", "神戸市", "奈良市", "大津市", "和歌山市", "津市"],
  chugoku: ["広島市", "岡山市", "松江市", "鳥取市", "山口市", "下関市"],
  shikoku: ["高松市", "松山市", "高知市", "徳島市"],
  kyushu: ["福岡市", "北九州市", "熊本市", "鹿児島市", "大分市", "長崎市", "宮崎市", "佐賀市", "那覇市"],
};

function levelBgClass(level: MapAlertLevel | ForecastDay["alertLevel"]): string {
  if (level === "warning") return "bg-rose-100 text-rose-800 border-rose-200";
  if (level === "advisory") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-50 text-emerald-800 border-emerald-200";
}

function levelBadge(level: MapAlertLevel | ForecastDay["alertLevel"]): string {
  if (level === "warning") return "警報相当";
  if (level === "advisory") return "注意報相当";
  return "異常なし";
}

function weatherIcon(code: number): string {
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

// ────────────────────────────────────────────────────────────
// サブコンポーネント
// ────────────────────────────────────────────────────────────

function DayForecastCard({
  day,
  regionLabel,
}: {
  day: ForecastDay;
  regionLabel: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${levelBgClass(day.alertLevel)}`}>
      <div className="flex items-center justify-between">
        <p className="font-bold">{regionLabel}</p>
        <span className="text-xs font-semibold">{levelBadge(day.alertLevel)}</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className="text-2xl">{weatherIcon(day.weatherCode)}</span>
        <div>
          <p className="font-semibold">{day.weatherLabel}</p>
          <p className="text-xs">
            {day.maxTempC}℃ / {day.minTempC}℃ ／ 降水 {day.precipMm}mm ／ 風 {day.maxWindMs}m/s
          </p>
        </div>
      </div>
    </div>
  );
}

function MunicipalityDetail({
  regionId,
  regionLabel,
  dayLevel,
}: {
  regionId: string;
  regionLabel: string;
  dayLevel: ForecastDay["alertLevel"];
}) {
  const cities = REGION_CITIES[regionId] ?? [];
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">
        {regionLabel}ブロック — 主要市区町村
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        ※ 市区町村別の気象庁注意報・警報は気象庁公式サイトで確認してください。
        以下は地域ブロック予報に基づく目安です。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {cities.map((city) => (
          <div
            key={city}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${levelBgClass(dayLevel)}`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full border border-current opacity-60" />
            {city}
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// メインパネル
// ────────────────────────────────────────────────────────────

type ForecastMode = "today" | "week";

export function WeatherForecastPanel() {
  const [mode, setMode] = useState<ForecastMode>("today");
  const [forecast, setForecast] = useState<WeatherForecastApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // JMA Prefecture map のレベル (今日モード)
  const [jmaLevels, setJmaLevels] = useState<Record<string, import("@/lib/jma/parse-jma-warning").JmaMapLevel>>({});
  const [jmaLoading, setJmaLoading] = useState(true);

  useEffect(() => {
    // 気象庁の都道府県別警報データ（signage-weather API today mode 経由）
    void fetch("/api/signage-weather?mapMode=today")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { mapLevels?: Record<string, string> } | null) => {
        if (data?.mapLevels) {
          // 8ブロックのレベルを47都道府県の ISO コードにマッピング
          const levels: Record<string, import("@/lib/jma/parse-jma-warning").JmaMapLevel> = {};
          JMA_REGIONS.forEach(({ iso, regionId }) => {
            const blockLevel = data.mapLevels![regionId] as import("@/lib/jma/parse-jma-warning").JmaMapLevel | undefined;
            levels[iso] = blockLevel ?? "none";
          });
          setJmaLevels(levels);
        }
        setJmaLoading(false);
      })
      .catch(() => setJmaLoading(false));
  }, []);

  useEffect(() => {
    void fetch("/api/weather-forecast")
      .then((r) => {
        if (!r.ok) throw new Error("fetch error");
        return r.json() as Promise<WeatherForecastApiResponse>;
      })
      .then((data) => {
        setForecast(data);
        setLoading(false);
      })
      .catch(() => {
        setError("天気予報の取得に失敗しました。");
        setLoading(false);
      });
  }, []);

  // 選択日の8ブロック別レベル（週モード用）
  const weekDayMapLevels = useMemo((): Record<JapanRegionId, MapAlertLevel> => {
    if (!forecast) {
      return Object.fromEntries(japanRegionMeta.map((r) => [r.id, "none"])) as Record<JapanRegionId, MapAlertLevel>;
    }
    return Object.fromEntries(
      forecast.regions.map((r) => [r.regionId, r.days[selectedDayIndex]?.alertLevel ?? "none"])
    ) as Record<JapanRegionId, MapAlertLevel>;
  }, [forecast, selectedDayIndex]);

  const selectedRegionForecast: RegionForecast | null = useMemo(() => {
    if (!forecast || !selectedRegionId) return null;
    return forecast.regions.find((r) => r.regionId === selectedRegionId) ?? null;
  }, [forecast, selectedRegionId]);

  const days = useMemo(() => {
    if (!forecast?.regions[0]) return [];
    return forecast.regions[0].days;
  }, [forecast]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">気象警報マップ</h1>
        <p className="mt-1 text-sm text-slate-600">
          都道府県別の気象警報・注意報と向こう1週間の天気予報。
        </p>
      </div>

      {/* モード切り替え */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {[
          { key: "today", label: "今日の警報" },
          { key: "week",  label: "1週間予報" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMode(tab.key as ForecastMode)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 今日モード: JMA 都道府県警報マップ */}
      {mode === "today" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">都道府県別 気象警報・注意報</h2>
              {jmaLoading && (
                <span className="text-xs text-slate-400 animate-pulse">更新中…</span>
              )}
            </div>
            <JapanPrefectureWarningMap levelsByIso={jmaLevels} />
            <p className="mt-2 text-[11px] text-slate-400">
              ※ 8地域ブロック代表地点の予報から強風・降水の目安を色分けしています。
              気象庁の実際の警報・注意報は
              <a
                href="https://www.jma.go.jp/bosai/warning/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-emerald-600"
              >
                気象庁公式サイト
              </a>
              でご確認ください。
            </p>
          </div>

          {/* 地域ブロック一覧 */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          ) : forecast ? (
            <>
              <h2 className="text-sm font-bold text-slate-900">地域ブロック別（今日）</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {forecast.regions.map((region) => {
                  const today = region.days[0];
                  if (!today) return null;
                  return (
                    <button
                      key={region.regionId}
                      type="button"
                      onClick={() =>
                        setSelectedRegionId((prev) => (prev === region.regionId ? null : region.regionId))
                      }
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition hover:shadow-md ${
                        selectedRegionId === region.regionId
                          ? "ring-2 ring-emerald-400"
                          : ""
                      } ${levelBgClass(today.alertLevel)}`}
                    >
                      <p className="text-sm font-bold">{region.regionLabel}</p>
                      <p className="mt-1 text-xl">{weatherIcon(today.weatherCode)}</p>
                      <p className="text-xs font-semibold">{today.weatherLabel}</p>
                      <p className="mt-0.5 text-[10px]">{levelBadge(today.alertLevel)}</p>
                    </button>
                  );
                })}
              </div>

              {/* 市区町村詳細 */}
              {selectedRegionId && forecast && (() => {
                const region = forecast.regions.find((r) => r.regionId === selectedRegionId);
                const today = region?.days[0];
                if (!region || !today) return null;
                return (
                  <MunicipalityDetail
                    regionId={selectedRegionId}
                    regionLabel={region.regionLabel}
                    dayLevel={today.alertLevel}
                  />
                );
              })()}
            </>
          ) : null}
        </div>
      )}

      {/* 週間予報モード */}
      {mode === "week" && (
        <div className="space-y-4">
          {/* 日付セレクター */}
          {days.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              {days.map((day, idx) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-center transition ${
                    selectedDayIndex === idx
                      ? "border-emerald-500 bg-emerald-50 font-bold text-emerald-900 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-semibold">{formatDate(day.date)}</p>
                  <p className="text-base">{weatherIcon(day.weatherCode)}</p>
                </button>
              ))}
            </div>
          )}

          {/* 週間マップ */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-900">
              {days[selectedDayIndex] ? formatDate(days[selectedDayIndex].date) : "—"} の予報マップ
            </p>
            {loading ? (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <>
                <JapanMapSvg
                  levels={weekDayMapLevels}
                  className="mx-auto h-auto max-h-64 w-auto max-w-full"
                />
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-4 rounded bg-rose-500/50" />警報相当
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-4 rounded bg-amber-400/40" />注意報相当
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-4 rounded bg-slate-700/55" />概ね良好
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 地域別詳細カード */}
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          ) : forecast ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {forecast.regions.map((region) => {
                  const day = region.days[selectedDayIndex];
                  if (!day) return null;
                  return (
                    <button
                      key={region.regionId}
                      type="button"
                      onClick={() =>
                        setSelectedRegionId((prev) => (prev === region.regionId ? null : region.regionId))
                      }
                      className={`text-left transition hover:shadow-md ${
                        selectedRegionId === region.regionId ? "ring-2 ring-emerald-400 rounded-xl" : ""
                      }`}
                    >
                      <DayForecastCard day={day} regionLabel={region.regionLabel} />
                    </button>
                  );
                })}
              </div>

              {/* 市区町村詳細（週間モード） */}
              {selectedRegionId && selectedRegionForecast && (() => {
                const day = selectedRegionForecast.days[selectedDayIndex];
                if (!day) return null;
                return (
                  <MunicipalityDetail
                    regionId={selectedRegionId}
                    regionLabel={selectedRegionForecast.regionLabel}
                    dayLevel={day.alertLevel}
                  />
                );
              })()}
            </>
          ) : null}
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        天気予報データ: Open-Meteo（無料・オープンデータ）。気象警報は気象庁データを参照。
        予報は参考値です。現場では必ず最新の気象情報を確認してください。
      </p>
    </div>
  );
}
