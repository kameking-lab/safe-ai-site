/**
 * Vercel REST API client for usage monitoring.
 *
 * Vercel has moved their team-usage endpoint between /v1, /v9, and the
 * undocumented /api/web/v1/teams/:id/usage path multiple times. Rather
 * than hard-code a single URL that will rot, we call the documented
 * `GET /v1/usage?teamId=...` endpoint from the task brief and fall back
 * to a mock snapshot when:
 *   - VERCEL_TOKEN is unset, or
 *   - the API returns a non-2xx status, or
 *   - the response shape is unrecognized.
 *
 * The dashboard surfaces the `source` field so the user knows whether
 * they are looking at live data, a cached snapshot, mock data, or a
 * stale fallback after an API outage.
 */

import { fetchWithTimeout } from "@/lib/external/fetch-with-timeout";
import { DEFAULT_TTL_MS, getCached, getStale, setCached } from "./cache";
import { HOBBY_LIMITS, QUOTA_ORDER } from "./limits";
import { buildMockSnapshot } from "./mock";
import { currentBillingPeriod } from "./period";
import type {
  QuotaKey,
  UsageSnapshot,
  UsageSource,
  UsageTrendPoint,
} from "./types";

const VERCEL_API_BASE = "https://api.vercel.com";
const REQUEST_TIMEOUT_MS = 6_000;

interface VercelUsageRawSample {
  metric?: string;
  name?: string;
  value?: number;
  used?: number;
  total?: number;
}

interface VercelUsageRawTrendDay {
  date?: string;
  day?: string;
  metric?: string;
  value?: number;
}

interface VercelUsageRawResponse {
  usage?: VercelUsageRawSample[];
  trend?: VercelUsageRawTrendDay[];
  // The /v1/usage endpoint has historically nested data under different
  // keys; we tolerate any of them.
  data?: VercelUsageRawSample[];
}

export interface FetchUsageOptions {
  cacheKey?: string;
  ttlMs?: number;
  /** Force a live fetch even if a cached snapshot is fresh. */
  force?: boolean;
  /** Inject a clock for tests. */
  now?: Date;
}

export async function fetchUsageSnapshot(
  options: FetchUsageOptions = {}
): Promise<UsageSnapshot> {
  const now = options.now ?? new Date();
  const cacheKey = options.cacheKey ?? "default";
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

  if (!options.force) {
    const cached = getCached(cacheKey, now.getTime());
    if (cached) return { ...cached, source: "cache" };
  }

  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    const mock = buildMockSnapshot(now);
    setCached(cacheKey, mock, ttlMs, now.getTime());
    return mock;
  }

  try {
    const live = await fetchLive({ token, teamId, now });
    setCached(cacheKey, live, ttlMs, now.getTime());
    return live;
  } catch (err) {
    const stale = getStale(cacheKey);
    if (stale) {
      return {
        ...stale,
        source: "fallback",
        warningMessage: `Vercel API 呼び出し失敗のため直近キャッシュを表示中: ${errorMessage(err)}`,
      };
    }
    const mock = buildMockSnapshot(now);
    return {
      ...mock,
      source: "fallback",
      warningMessage: `Vercel API 呼び出し失敗のためモックを表示中: ${errorMessage(err)}`,
    };
  }
}

async function fetchLive({
  token,
  teamId,
  now,
}: {
  token: string;
  teamId?: string;
  now: Date;
}): Promise<UsageSnapshot> {
  const url = new URL(`${VERCEL_API_BASE}/v1/usage`);
  if (teamId) url.searchParams.set("teamId", teamId);

  const res = await fetchWithTimeout(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    timeoutMs: REQUEST_TIMEOUT_MS,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = (await res.json()) as VercelUsageRawResponse;
  return normalizeUsageResponse(json, now, "live");
}

export function normalizeUsageResponse(
  json: VercelUsageRawResponse,
  now: Date,
  source: UsageSource
): UsageSnapshot {
  const period = currentBillingPeriod(now);
  const rawSamples = json.usage ?? json.data ?? [];

  const valueByKey = new Map<QuotaKey, number>();
  for (const raw of rawSamples) {
    const key = mapMetricKey(raw.metric ?? raw.name);
    if (!key) continue;
    const value = raw.value ?? raw.used ?? 0;
    valueByKey.set(key, value);
  }

  const samples = QUOTA_ORDER.map((key) => {
    const spec = HOBBY_LIMITS[key];
    const current = valueByKey.get(key) ?? 0;
    const limit = spec.hobbyLimit;
    const percent = limit && limit > 0 ? (current / limit) * 100 : null;
    return { key, spec, current, limit, percent };
  });

  const trendRaw = json.trend ?? [];
  const trendByDate = new Map<string, UsageTrendPoint>();
  for (const point of trendRaw) {
    const date = (point.date ?? point.day ?? "").slice(0, 10);
    if (!date) continue;
    const key = mapMetricKey(point.metric);
    if (!key) continue;
    const value = point.value ?? 0;
    const existing = trendByDate.get(date) ?? { date, values: {} };
    existing.values[key] = (existing.values[key] ?? 0) + value;
    trendByDate.set(date, existing);
  }
  const trend = [...trendByDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  return {
    generatedAt: now.toISOString(),
    source,
    period,
    samples,
    trend,
  };
}

function mapMetricKey(metric: string | undefined): QuotaKey | null {
  if (!metric) return null;
  const normalized = metric.toLowerCase();
  if (normalized.includes("bandwidth")) return "bandwidth";
  if (normalized.includes("function") && normalized.includes("invoc")) {
    return "functionInvocations";
  }
  if (normalized.includes("invocation")) return "functionInvocations";
  if (normalized.includes("build")) return "buildExecutionMinutes";
  if (normalized.includes("edge") && normalized.includes("request")) {
    return "edgeRequests";
  }
  if (normalized.includes("isr")) return "isrWrites";
  if (normalized.includes("image")) return "imageOptimization";
  if (normalized.includes("fast") || normalized.includes("origin")) {
    return "fastOriginTransfer";
  }
  return null;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
