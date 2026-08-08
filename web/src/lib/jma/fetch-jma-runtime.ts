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
import { buildWeatherEntry } from "./parse-jma-forecast";
import { parseEarthquakeList } from "./parse-jma-earthquakes";
import {
  parseJmaEarthquakeResponse,
  parseJmaForecastResponse,
  inspectJmaWarningResponse,
  warningPayloadFingerprint,
} from "./jma-runtime-schema";
import type {
  JmaEarthquakesFile,
  JmaSourceIssue,
  JmaWarningEntry,
  JmaWarningsFile,
  JmaWeatherEntry,
  JmaWeatherFile,
} from "./jma-data";

const REVALIDATE_SECONDS = 600; // 10分: UIの15分鮮度上限内で再取得する
const USER_AGENT = "safe-ai-portal-signage-jma/1.0 (+https://www.anzen-ai-portal.jp/about)";
const FETCH_TIMEOUT_MS = 8000;

async function fetchJson(url: string): Promise<unknown | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: ac.signal,
    });
    if (!res.ok) return null;
    return await res.json() as unknown;
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

export async function fetchWarningsLive(): Promise<JmaWarningsFile> {
  const byIso: JmaWarningsFile["byIso"] = {};
  const now = new Date();
  const liveFetchedAt = now.toISOString();
  const requests = iso3166List().flatMap((iso) =>
    jmaWarningJsonCodesForIso2(iso).map((code) => ({ iso, code })),
  );
  type WarningFetchResult =
    | { iso: string; code: string; payload: JmaWarningPayload; issue: null }
    | {
        iso: string;
        code: string;
        payload: null;
        issue: Exclude<JmaSourceIssue, "unverified">;
      };
  const results: WarningFetchResult[] = await Promise.all(requests.map(async ({ iso, code }) => {
    const raw = await fetchJson(jmaWarningJsonUrl(code));
    if (raw === null) {
      return {
        iso,
        code,
        payload: null,
        issue: "fetch-failed" as const,
      };
    }
    const inspected = inspectJmaWarningResponse(raw, now);
    return inspected.ok
      ? { iso, code, payload: inspected.payload, issue: null }
      : { iso, code, payload: null, issue: inspected.issue };
  }));

  const valid = results.filter(
    (
      result,
    ): result is {
      iso: string;
      code: string;
      payload: JmaWarningPayload;
      issue: null;
    } => result.payload !== null,
  );
  const uniformEmpty = valid.length === requests.length && valid.length > 1 &&
    new Set(valid.map((result) => warningPayloadFingerprint(result.payload))).size === 1 &&
    valid.every((result) => {
      const summary = summarizeWarningPayload(result.payload);
      return summary.level === "none" && summary.warnings.length === 0;
    });
  const accepted = uniformEmpty ? [] : valid;
  const acceptedKeys = new Set(accepted.map(({ iso, code }) => `${iso}:${code}`));
  const issues: JmaSourceIssue[] = [
    ...new Set<JmaSourceIssue>([
      ...results.flatMap((result) => result.issue === null ? [] : [result.issue]),
      ...(uniformEmpty ? (["unverified"] as const) : []),
    ]),
  ];

  for (const iso of iso3166List()) {
    const codes = jmaWarningJsonCodesForIso2(iso);
    const entries: JmaWarningEntry[] = [];
    for (const code of codes) {
      if (!acceptedKeys.has(`${iso}:${code}`)) continue;
      const payload = accepted.find((result) => result.iso === iso && result.code === code)?.payload;
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
    if (entries.length === codes.length && codes.length > 0) {
      byIso[iso] = {
        level: mergeJmaLevels(entries.map((entry) => entry.level)),
        entries,
        sourceStatus: "live",
        sourceFetchedAt: liveFetchedAt,
      };
    } else {
      const fallback = (warningsFallback as JmaWarningsFile).byIso[iso];
      if (fallback) {
        const regionIssue = uniformEmpty
          ? "unverified"
          : results.find(
              (result) => result.iso === iso && result.issue !== null,
            )?.issue ?? "fetch-failed";
        byIso[iso] = {
          ...fallback,
          sourceStatus: "fallback",
          sourceFetchedAt: (warningsFallback as JmaWarningsFile).fetchedAt,
          sourceIssue: regionIssue,
        };
      }
    }
  }

  const attempted = requests.length;
  const succeeded = accepted.length;
  const failed = attempted - succeeded;
  if (succeeded === 0) {
    return {
      ...(warningsFallback as JmaWarningsFile),
      byIso,
      quality: {
        status: "fallback",
        attempted,
        succeeded,
        failed,
        issues,
      },
    };
  }
  const degraded = failed > 0 || Object.keys(byIso).length !== 47;
  return {
    fetchedAt: degraded
      ? (warningsFallback as JmaWarningsFile).fetchedAt
      : liveFetchedAt,
    byIso,
    quality: {
      status: degraded ? "degraded" : "live",
      attempted,
      succeeded,
      failed,
      ...(issues.length > 0 ? { issues } : {}),
    },
  };
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

export async function fetchWeatherLive(): Promise<JmaWeatherFile> {
  const byIso: Record<string, JmaWeatherEntry> = {};
  let succeeded = 0;
  await Promise.all(
    FORECAST_OFFICES.map(async (office) => {
      const url = `https://www.jma.go.jp/bosai/forecast/data/forecast/${office.code}.json`;
      const reports = parseJmaForecastResponse(await fetchJson(url));
      if (reports) {
        succeeded += 1;
        byIso[office.iso] = buildWeatherEntry(office.label, reports);
        return;
      }
      const fallback = (weatherFallback as JmaWeatherFile).byIso[office.iso];
      if (fallback) byIso[office.iso] = fallback;
    })
  );

  const attempted = FORECAST_OFFICES.length;
  const failed = attempted - succeeded;
  if (succeeded === 0) {
    return {
      ...(weatherFallback as JmaWeatherFile),
      quality: { status: "fallback", attempted, succeeded, failed },
    };
  }
  const degraded = failed > 0;
  return {
    fetchedAt: degraded
      ? (weatherFallback as JmaWeatherFile).fetchedAt
      : new Date().toISOString(),
    byIso,
    quality: { status: degraded ? "degraded" : "live", attempted, succeeded, failed },
  };
}

const QUAKE_LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";

export async function fetchEarthquakesLive(): Promise<JmaEarthquakesFile> {
  const raw = parseJmaEarthquakeResponse(await fetchJson(QUAKE_LIST_URL));
  if (raw === null) {
    return {
      ...(earthquakesFallback as JmaEarthquakesFile),
      quality: { status: "fallback", attempted: 1, succeeded: 0, failed: 1 },
    };
  }
  return {
    fetchedAt: new Date().toISOString(),
    items: parseEarthquakeList(raw),
    quality: { status: "live", attempted: 1, succeeded: 1, failed: 0 },
  };
}

// Bump the cache generation whenever accepted upstream warning semantics
// change. Vercel's Data Cache is shared across deployments, so reusing the
// previous key could serve output computed by the old strict parser.
export const getJmaWarningsRuntime = unstable_cache(fetchWarningsLive, ["signage-jma-warnings-runtime-r8-v2"], {
  revalidate: REVALIDATE_SECONDS,
});

export const getJmaWeatherRuntime = unstable_cache(fetchWeatherLive, ["signage-jma-weather-runtime-v3"], {
  revalidate: REVALIDATE_SECONDS,
});

export const getJmaEarthquakesRuntime = unstable_cache(
  fetchEarthquakesLive,
  ["signage-jma-earthquakes-runtime-v3"],
  { revalidate: REVALIDATE_SECONDS }
);
