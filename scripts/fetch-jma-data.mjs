#!/usr/bin/env node
/**
 * 気象庁の防災情報・天気予報・地震情報を取得して
 * web/src/data/jma/ に JSON 保存するバッチ。
 *
 * - 警報・注意報（都道府県別）: bosai/warning/data/warning/{code}.json
 * - 天気予報（地方）           : bosai/forecast/data/forecast/{code}.json
 * - 地震情報（直近）            : bosai/quake/data/list.json + 個別XML JSON
 *
 * 出力:
 *   web/src/data/jma/warnings.json     都道府県iso → 最大レベル + 都道府県別ヘッドライン
 *   web/src/data/jma/weather.json      代表都市の天気
 *   web/src/data/jma/earthquakes.json  直近の地震（震度3以上）
 *   web/src/data/jma/index.json        メタ（取得日時、出典）
 *
 * 取得失敗時は既存JSONを残し、index.json に試行結果を記録して終了コード1を返す。
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const OUT_DIR = join(REPO_ROOT, "web", "src", "data", "jma");

const USER_AGENT = "safe-ai-site-jma-batch/1.0 (+contact: ops@example.com)";
const FETCH_TIMEOUT_MS = 15_000;
export const FETCH_CONCURRENCY = 8;
const EXPECTED_PREFECTURE_COUNT = 47;

const PREFECTURE_CODES = [
  // 北海道は複数細分（特殊）、46/47も特殊だが、最大レベル算出だけなら 010000～470000 で代表させる
  // 実運用に合わせて全47都道府県のヘッドラインを取得
  "011000", "012000", "013000", "014100", "015000", "016000", "017000",
  "020000", "030000", "040000", "050000", "060000", "070000",
  "080000", "090000", "100000", "110000", "120000", "130000",
  "140000", "150000", "160000", "170000", "180000", "190000",
  "200000", "210000", "220000", "230000", "240000", "250000",
  "260000", "270000", "280000", "290000", "300000",
  "310000", "320000", "330000", "340000", "350000",
  "360000", "370000", "380000", "390000",
  "400000", "410000", "420000", "430000", "440000", "450000",
  "460040", "460100", "471000", "472000", "473000", "474000",
];

// 警報JSONコード → ISO 3166-2:JP マッピング
function isoFromWarningCode(code) {
  // 北海道: 011000〜017000 → JP-01
  if (code.startsWith("01")) return "JP-01";
  // 青森〜沖縄: 先頭2桁の数値が県番号と一致
  // ただし鹿児島(46x)・沖縄(47x)は特殊コード
  if (code.startsWith("460") || code === "460040" || code === "460100") return "JP-46";
  if (code.startsWith("47")) return "JP-47";
  const n = Number(code.slice(0, 2));
  if (Number.isFinite(n) && n >= 1 && n <= 47) {
    return `JP-${String(n).padStart(2, "0")}`;
  }
  return null;
}

function compactError(err) {
  return String(err?.message ?? err)
    .replace(/\s+/g, " ")
    .slice(0, 300);
}

export function createConcurrencyLimiter(maxConcurrency) {
  if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
    throw new TypeError("maxConcurrency must be a positive integer");
  }

  let active = 0;
  const queue = [];

  return async function limit(task) {
    if (active >= maxConcurrency) {
      await new Promise((resume) => queue.push(resume));
    }
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      queue.shift()?.();
    }
  };
}

export function createJsonFetcher({
  fetchImpl = globalThis.fetch,
  timeoutMs = FETCH_TIMEOUT_MS,
  maxConcurrency = FETCH_CONCURRENCY,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetchImpl must be a function");
  }
  const limit = createConcurrencyLimiter(maxConcurrency);

  return (url) => limit(async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: ac.signal,
      });
      if (!res.ok) {
        return { ok: false, status: res.status, error: `HTTP ${res.status}` };
      }
      const json = await res.json();
      return { ok: true, data: json };
    } catch (err) {
      return { ok: false, error: compactError(err) };
    } finally {
      clearTimeout(timer);
    }
  });
}

function isActiveWarning(status) {
  if (!status) return false;
  if (status.includes("なし") || status.includes("解除")) return false;
  return status === "発表" || status === "継続";
}

function levelFromCode(code) {
  if (!code) return null;
  const head = String(code)[0];
  if (head === "3") return "special";
  if (head === "0") return "warning";
  if (head === "1" || head === "2") return "advisory";
  return "advisory";
}

const RANK = { none: 0, advisory: 1, warning: 2, special: 3 };
function maxLevel(a, b) {
  return RANK[a] >= RANK[b] ? a : b;
}

function summarizeWarningPayload(payload) {
  let level = "none";
  const warnings = [];
  for (const t of payload?.areaTypes ?? []) {
    for (const area of t?.areas ?? []) {
      for (const w of area?.warnings ?? []) {
        if (!isActiveWarning(w.status)) continue;
        const lv = levelFromCode(w.code);
        if (lv) level = maxLevel(level, lv);
        warnings.push({
          areaCode: area.code ?? null,
          code: w.code ?? null,
          status: w.status ?? null,
          level: lv,
        });
      }
    }
  }
  return {
    level,
    headline: payload?.headlineText?.trim() || null,
    reportDatetime: payload?.reportDatetime ?? null,
    publishingOffice: payload?.publishingOffice ?? null,
    warnings,
  };
}

function isWarningPayload(payload) {
  return Boolean(payload) && typeof payload === "object" && Array.isArray(payload.areaTypes);
}

async function fetchWarnings(fetchJson) {
  const byIso = {};
  const errors = [];
  const successfulCodes = [];

  const results = await Promise.all(PREFECTURE_CODES.map(async (code) => {
    const url = `https://www.jma.go.jp/bosai/warning/data/warning/${code}.json`;
    const r = await fetchJson(url);
    return { code, ...r };
  }));

  for (const r of results) {
    const { code } = r;
    const iso = isoFromWarningCode(code);
    if (!iso) continue;
    if (!r.ok) {
      errors.push({ code, status: r.status ?? null, error: r.error });
      continue;
    }
    if (!isWarningPayload(r.data)) {
      errors.push({ code, status: null, error: "invalid payload" });
      continue;
    }
    successfulCodes.push(code);
    const summary = summarizeWarningPayload(r.data);
    if (!byIso[iso]) byIso[iso] = { level: "none", entries: [] };
    byIso[iso].level = maxLevel(byIso[iso].level, summary.level);
    byIso[iso].entries.push({
      sourceCode: code,
      level: summary.level,
      headline: summary.headline,
      reportDatetime: summary.reportDatetime,
      publishingOffice: summary.publishingOffice,
      warnings: summary.warnings,
    });
  }

  return {
    byIso,
    errors,
    successfulCodes,
    totalRequests: PREFECTURE_CODES.length,
  };
}

// 代表7地域（地方区分の天気予報）。気象庁 forecast/data/forecast/{office}.json
const FORECAST_OFFICES = [
  { code: "016000", label: "北海道（石狩・空知・後志）", iso: "JP-01" },
  { code: "040000", label: "宮城県", iso: "JP-04" },
  { code: "130000", label: "東京都", iso: "JP-13" },
  { code: "230000", label: "愛知県", iso: "JP-23" },
  { code: "270000", label: "大阪府", iso: "JP-27" },
  { code: "340000", label: "広島県", iso: "JP-34" },
  { code: "400000", label: "福岡県", iso: "JP-40" },
];

function buildForecastEntry(office, payload) {
  if (!Array.isArray(payload) || !payload[0]) return null;
  const today = payload[0]?.timeSeries?.[0];
  const weatherCodes = today?.areas?.[0]?.weatherCodes;
  const weathers = today?.areas?.[0]?.weathers;
  if (!Array.isArray(weatherCodes) || !Array.isArray(weathers)) return null;

  return {
    label: office.label,
    reportDatetime: payload[0]?.reportDatetime ?? null,
    publishingOffice: payload[0]?.publishingOffice ?? null,
    todayWeatherCode: weatherCodes[0] ?? null,
    todayWeatherText: weathers[0] ?? null,
  };
}

async function fetchForecast(fetchJson) {
  const byIso = {};
  const errors = [];
  const successfulCodes = [];

  const results = await Promise.all(FORECAST_OFFICES.map(async (office) => {
    const url = `https://www.jma.go.jp/bosai/forecast/data/forecast/${office.code}.json`;
    const r = await fetchJson(url);
    return { office, ...r };
  }));

  for (const r of results) {
    const o = r.office;
    if (!r.ok) {
      errors.push({ code: o.code, status: r.status ?? null, error: r.error });
      continue;
    }
    const entry = buildForecastEntry(o, r.data);
    if (!entry) {
      errors.push({ code: o.code, status: null, error: "invalid payload" });
      continue;
    }
    successfulCodes.push(o.code);
    byIso[o.iso] = entry;
  }
  return {
    byIso,
    errors,
    successfulCodes,
    totalRequests: FORECAST_OFFICES.length,
  };
}

const QUAKE_LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";

async function fetchEarthquakes(fetchJson) {
  const r = await fetchJson(QUAKE_LIST_URL);
  if (!r.ok) {
    return { items: [], error: r.error, status: r.status ?? null, validPayload: false };
  }
  if (!Array.isArray(r.data)) {
    return { items: [], error: "invalid payload", status: null, validPayload: false };
  }
  const list = r.data;
  // 直近30件、震度3以上のみ抽出（list.json は概要のみ）
  const items = list
    .filter((q) => {
      const m = q?.maxInt;
      if (!m) return false;
      return ["3", "4", "5-", "5+", "6-", "6+", "7"].includes(m);
    })
    .slice(0, 30)
    .map((q) => ({
      eventId: q?.eid ?? null,
      reportDatetime: q?.rdt ?? null,
      occurredAt: q?.at ?? null,
      hypocenter: q?.anm ?? null,
      magnitude: q?.mag ?? null,
      maxIntensity: q?.maxInt ?? null,
      title: q?.ttl ?? null,
    }));
  return { items, error: null, status: null, validPayload: true };
}

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function readJson(file) {
  try {
    const buf = await readFile(file, "utf8");
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function stageJson(target, value) {
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, jsonText(value), { encoding: "utf8", flag: "wx" });
  return { target, temporary };
}

export async function atomicWriteJson(target, value) {
  const staged = await stageJson(target, value);
  try {
    await rename(staged.temporary, staged.target);
  } catch (err) {
    await rm(staged.temporary, { force: true }).catch(() => {});
    throw err;
  }
}

async function atomicWriteJsonBundle(entries) {
  const staged = [];
  try {
    for (const [target, value] of entries) {
      staged.push(await stageJson(target, value));
    }
    // index.json is deliberately last: readers never see new metadata before data files.
    for (const item of staged) {
      await rename(item.temporary, item.target);
    }
  } catch (err) {
    await Promise.all(staged.map((item) => rm(item.temporary, { force: true }).catch(() => {})));
    throw err;
  }
}

function failureRate(failed, total) {
  return total > 0 ? Number((failed / total).toFixed(4)) : 1;
}

export function assessFetchQuality(warnings, forecast, earthquakes) {
  const warningSuccesses = warnings.successfulCodes?.length ?? 0;
  const forecastSuccesses = forecast.successfulCodes?.length ?? 0;
  const warningFailures = Math.max(0, warnings.totalRequests - warningSuccesses);
  const forecastFailures = Math.max(0, forecast.totalRequests - forecastSuccesses);
  const effectivePrefectures = Object.keys(warnings.byIso ?? {}).length;
  const effectiveForecastOffices = Object.keys(forecast.byIso ?? {}).length;

  const quality = {
    warnings: {
      expectedRequests: warnings.totalRequests,
      successfulRequests: warningSuccesses,
      failedRequests: warningFailures,
      failureRate: failureRate(warningFailures, warnings.totalRequests),
      maximumFailureRate: 0,
      expectedPrefectures: EXPECTED_PREFECTURE_COUNT,
      effectivePrefectures,
    },
    forecast: {
      expectedRequests: forecast.totalRequests,
      successfulRequests: forecastSuccesses,
      failedRequests: forecastFailures,
      failureRate: failureRate(forecastFailures, forecast.totalRequests),
      maximumFailureRate: 0,
      expectedOffices: FORECAST_OFFICES.length,
      effectiveOffices: effectiveForecastOffices,
    },
    earthquakes: {
      expectedRequests: 1,
      successfulRequests: earthquakes.validPayload ? 1 : 0,
      failedRequests: earthquakes.validPayload ? 0 : 1,
      failureRate: earthquakes.validPayload ? 0 : 1,
      validPayload: Boolean(earthquakes.validPayload),
      matchingItems: Array.isArray(earthquakes.items) ? earthquakes.items.length : 0,
    },
  };

  const failures = [];
  if (quality.warnings.failureRate > quality.warnings.maximumFailureRate) {
    failures.push(`warnings request failures ${warningFailures}/${warnings.totalRequests}`);
  }
  if (effectivePrefectures !== EXPECTED_PREFECTURE_COUNT) {
    failures.push(`warnings effective prefectures ${effectivePrefectures}/${EXPECTED_PREFECTURE_COUNT}`);
  }
  if (quality.forecast.failureRate > quality.forecast.maximumFailureRate) {
    failures.push(`forecast request failures ${forecastFailures}/${forecast.totalRequests}`);
  }
  if (effectiveForecastOffices !== FORECAST_OFFICES.length) {
    failures.push(`forecast effective offices ${effectiveForecastOffices}/${FORECAST_OFFICES.length}`);
  }
  if (!earthquakes.validPayload) {
    failures.push("earthquakes response unavailable or invalid");
  }

  return { ok: failures.length === 0, failures, quality };
}

function storedCounts(previous) {
  return {
    warningsPrefectures: Object.keys(previous.warnings?.byIso ?? {}).length,
    forecastOffices: Object.keys(previous.weather?.byIso ?? {}).length,
    earthquakes: Array.isArray(previous.earthquakes?.items) ? previous.earthquakes.items.length : 0,
  };
}

function inferLastSuccessfulAt(previous) {
  if (previous.index?.lastSuccessfulAt) return previous.index.lastSuccessfulAt;
  if (previous.index?.fetchedAt) return previous.index.fetchedAt;
  const snapshotTimes = [
    previous.warnings?.fetchedAt,
    previous.weather?.fetchedAt,
    previous.earthquakes?.fetchedAt,
  ].filter(Boolean);
  return snapshotTimes.length === 3 && new Set(snapshotTimes).size === 1 ? snapshotTimes[0] : null;
}

function indexMetadata({
  attemptedAt,
  lastSuccessfulAt,
  status,
  counts,
  quality,
  errors,
}) {
  return {
    // Kept for existing consumers. It always means the last complete successful snapshot.
    fetchedAt: lastSuccessfulAt,
    lastSuccessfulAt,
    lastAttemptAt: attemptedAt,
    status,
    source: "気象庁 (Japan Meteorological Agency)",
    sourceUrl: "https://www.jma.go.jp/bosai/",
    license: "気象庁ホームページ コンテンツ利用ルール（出典明記）",
    counts,
    quality,
    errors,
  };
}

function storedSnapshotIsUsable(previous) {
  return (
    Object.keys(previous.warnings?.byIso ?? {}).length === EXPECTED_PREFECTURE_COUNT &&
    Object.keys(previous.weather?.byIso ?? {}).length === FORECAST_OFFICES.length &&
    Array.isArray(previous.earthquakes?.items)
  );
}

export async function runJmaUpdate({
  outDir = OUT_DIR,
  fetchImpl = globalThis.fetch,
  timeoutMs = FETCH_TIMEOUT_MS,
  maxConcurrency = FETCH_CONCURRENCY,
  now = () => new Date(),
  logger = console,
  useMock = false,
} = {}) {
  await ensureDir(outDir);

  const paths = {
    warnings: join(outDir, "warnings.json"),
    weather: join(outDir, "weather.json"),
    earthquakes: join(outDir, "earthquakes.json"),
    index: join(outDir, "index.json"),
  };
  const [previousWarnings, previousWeather, previousEarthquakes, previousIndex] = await Promise.all([
    readJson(paths.warnings),
    readJson(paths.weather),
    readJson(paths.earthquakes),
    readJson(paths.index),
  ]);
  const previous = {
    warnings: previousWarnings,
    weather: previousWeather,
    earthquakes: previousEarthquakes,
    index: previousIndex,
  };

  if (useMock) {
    if (!storedSnapshotIsUsable(previous)) {
      logger.error("[fetch-jma-data] MOCK mode rejected: bundled snapshot is incomplete");
      return { ok: false, status: "failed", reason: "incomplete mock snapshot" };
    }
    // A fixture read is not a successful network refresh; do not falsify freshness timestamps.
    logger.log("[fetch-jma-data] MOCK mode validated bundled snapshot; no files changed");
    return { ok: true, status: "mock", published: false };
  }

  const attemptedAt = now().toISOString();
  const lastSuccessfulAt = inferLastSuccessfulAt(previous);
  logger.log(`[fetch-jma-data] fetching from jma.go.jp (concurrency=${maxConcurrency}) …`);
  const fetchJson = createJsonFetcher({ fetchImpl, timeoutMs, maxConcurrency });
  const [warnings, forecast, earthquakes] = await Promise.all([
    fetchWarnings(fetchJson),
    fetchForecast(fetchJson),
    fetchEarthquakes(fetchJson),
  ]);
  const assessment = assessFetchQuality(warnings, forecast, earthquakes);
  const errors = {
    warnings: warnings.errors,
    forecast: forecast.errors,
    earthquakes: earthquakes.error
      ? { status: earthquakes.status ?? null, error: earthquakes.error }
      : null,
  };

  if (!assessment.ok) {
    const failedIndex = indexMetadata({
      attemptedAt,
      lastSuccessfulAt,
      status: "failed",
      counts: storedCounts(previous),
      quality: assessment.quality,
      errors,
    });
    // Only attempt metadata changes. Successful warning/weather/quake snapshots stay byte-for-byte intact.
    await atomicWriteJson(paths.index, failedIndex);
    logger.error(`[fetch-jma-data] rejected snapshot: ${assessment.failures.join("; ")}`);
    return {
      ok: false,
      status: "failed",
      published: false,
      failures: assessment.failures,
      quality: assessment.quality,
    };
  }

  const warningSnapshot = { fetchedAt: attemptedAt, byIso: warnings.byIso };
  const weatherSnapshot = { fetchedAt: attemptedAt, byIso: forecast.byIso };
  const earthquakeSnapshot = { fetchedAt: attemptedAt, items: earthquakes.items };
  const counts = {
    warningsPrefectures: Object.keys(warnings.byIso).length,
    forecastOffices: Object.keys(forecast.byIso).length,
    earthquakes: earthquakes.items.length,
  };
  const successIndex = indexMetadata({
    attemptedAt,
    lastSuccessfulAt: attemptedAt,
    status: "success",
    counts,
    quality: assessment.quality,
    errors,
  });

  await atomicWriteJsonBundle([
    [paths.warnings, warningSnapshot],
    [paths.weather, weatherSnapshot],
    [paths.earthquakes, earthquakeSnapshot],
    [paths.index, successIndex],
  ]);

  logger.log(
    `[fetch-jma-data] done: warnings=${counts.warningsPrefectures} ` +
    `forecast=${counts.forecastOffices} eq=${counts.earthquakes}`,
  );
  return { ok: true, status: "success", published: true, quality: assessment.quality };
}

export async function runCli(options = {}) {
  const {
    args = process.argv.slice(2),
    env = process.env,
    logger = console,
    ...runOptions
  } = options;
  const useMock = runOptions.useMock ?? (args.includes("--mock") || env.JMA_MOCK === "1");
  try {
    const result = await runJmaUpdate({ ...runOptions, useMock, logger });
    return result.ok ? 0 : 1;
  } catch (err) {
    logger.error("[fetch-jma-data] fatal:", compactError(err));
    return 1;
  }
}

const directInvocation = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;
if (directInvocation) {
  process.exitCode = await runCli();
}
