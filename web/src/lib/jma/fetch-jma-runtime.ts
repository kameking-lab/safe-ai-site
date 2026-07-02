/**
 * /api/signage/jma のランタイムデータ取得。
 *
 * 旧実装は @/data/jma/*.json を静的 import（force-static）していたため、
 * Vercel が再デプロイされない限り値が更新されなかった（本番で18日凍結を実測）。
 * ここでは気象庁 bosai JSON をリクエスト時に直接 fetch し、unstable_cache で
 * REVALIDATE_SECONDS ごとに再取得する。デプロイ有無に関わらず鮮度が保たれる。
 *
 * 全件取得に失敗した場合のみ、GitHub Actions (jma-data-update.yml) がコミットする
 * 静的スナップショットへフォールバックする（完全な JMA 障害時の保険）。
 */

import { unstable_cache } from "next/cache";
import warningsFallback from "@/data/jma/warnings.json";
import weatherFallback from "@/data/jma/weather.json";
import earthquakesFallback from "@/data/jma/earthquakes.json";
import { jmaWarningJsonCodesForIso2, jmaWarningJsonUrl } from "./jma-warning-codes";
import { summarizeWarningPayload, mergeJmaLevels, type JmaWarningPayload } from "./parse-jma-warning";
import { buildWeatherEntry, type JmaForecastReport } from "./parse-jma-forecast";
import { parseEarthquakeList } from "./parse-jma-earthquakes";
import type {
  JmaEarthquakesFile,
  JmaWarningEntry,
  JmaWarningsFile,
  JmaWeatherEntry,
  JmaWeatherFile,
} from "./jma-data";

const REVALIDATE_SECONDS = 1800; // 30分: 防災系ランタイム取得の鮮度目標（診断書T1）
const USER_AGENT = "safe-ai-portal-signage-jma/1.0 (+https://www.anzen-ai-portal.jp/about)";
const FETCH_TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string): Promise<T | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: ac.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function iso3166List(): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 47; i += 1) {
    out.push(`JP-${String(i).padStart(2, "0")}`);
  }
  return out;
}

async function fetchWarningsLive(): Promise<JmaWarningsFile> {
  const byIso: JmaWarningsFile["byIso"] = {};
  await Promise.all(
    iso3166List().map(async (iso) => {
      const codes = jmaWarningJsonCodesForIso2(iso);
      const entries: JmaWarningEntry[] = [];
      for (const code of codes) {
        const payload = await fetchJson<JmaWarningPayload>(jmaWarningJsonUrl(code));
        if (!payload) continue;
        const summary = summarizeWarningPayload(payload);
        entries.push({
          sourceCode: code,
          level: summary.level,
          headline: summary.headline,
          reportDatetime: summary.reportDatetime,
          publishingOffice: summary.publishingOffice,
          warnings: summary.warnings,
        });
      }
      byIso[iso] = { level: mergeJmaLevels(entries.map((e) => e.level)), entries };
    })
  );

  // 全都道府県が空 = JMA 側の広範な障害とみなし、直近の既知データへ退避
  if (Object.keys(byIso).length === 0) {
    return warningsFallback as JmaWarningsFile;
  }
  return { fetchedAt: new Date().toISOString(), byIso };
}

// 代表7地域（地方区分の天気予報）。scripts/fetch-jma-data.mjs の FORECAST_OFFICES と同一。
const FORECAST_OFFICES: Array<{ code: string; label: string; iso: string }> = [
  { code: "016000", label: "北海道（石狩・空知・後志）", iso: "JP-01" },
  { code: "040000", label: "宮城県", iso: "JP-04" },
  { code: "130000", label: "東京都", iso: "JP-13" },
  { code: "230000", label: "愛知県", iso: "JP-23" },
  { code: "270000", label: "大阪府", iso: "JP-27" },
  { code: "340000", label: "広島県", iso: "JP-34" },
  { code: "400000", label: "福岡県", iso: "JP-40" },
];

async function fetchWeatherLive(): Promise<JmaWeatherFile> {
  const byIso: Record<string, JmaWeatherEntry> = {};
  await Promise.all(
    FORECAST_OFFICES.map(async (office) => {
      const url = `https://www.jma.go.jp/bosai/forecast/data/forecast/${office.code}.json`;
      const reports = await fetchJson<JmaForecastReport[]>(url);
      if (!reports) return;
      byIso[office.iso] = buildWeatherEntry(office.label, reports);
    })
  );

  if (Object.keys(byIso).length === 0) {
    return weatherFallback as JmaWeatherFile;
  }
  return { fetchedAt: new Date().toISOString(), byIso };
}

const QUAKE_LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";

async function fetchEarthquakesLive(): Promise<JmaEarthquakesFile> {
  const raw = await fetchJson<unknown[]>(QUAKE_LIST_URL);
  if (raw === null) {
    return earthquakesFallback as JmaEarthquakesFile;
  }
  return { fetchedAt: new Date().toISOString(), items: parseEarthquakeList(raw) };
}

export const getJmaWarningsRuntime = unstable_cache(fetchWarningsLive, ["signage-jma-warnings-runtime-v1"], {
  revalidate: REVALIDATE_SECONDS,
});

export const getJmaWeatherRuntime = unstable_cache(fetchWeatherLive, ["signage-jma-weather-runtime-v1"], {
  revalidate: REVALIDATE_SECONDS,
});

export const getJmaEarthquakesRuntime = unstable_cache(
  fetchEarthquakesLive,
  ["signage-jma-earthquakes-runtime-v1"],
  { revalidate: REVALIDATE_SECONDS }
);
