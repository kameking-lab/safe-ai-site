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
 * 取得失敗時は既存JSONを残し、index.json に error を追記して継続。
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const OUT_DIR = join(REPO_ROOT, "web", "src", "data", "jma");

const USER_AGENT = "safe-ai-site-jma-batch/1.0 (+contact: ops@example.com)";
const FETCH_TIMEOUT_MS = 15_000;

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

async function fetchJson(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: ac.signal,
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
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

async function fetchWarnings() {
  const byIso = {};
  const errors = [];

  for (const code of PREFECTURE_CODES) {
    const url = `https://www.jma.go.jp/bosai/warning/data/warning/${code}.json`;
    const r = await fetchJson(url);
    const iso = isoFromWarningCode(code);
    if (!iso) continue;
    if (!r.ok) {
      errors.push({ code, error: r.error });
      if (!byIso[iso]) byIso[iso] = { level: "none", entries: [] };
      continue;
    }
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

  return { byIso, errors };
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

async function fetchForecast() {
  const byIso = {};
  const errors = [];
  for (const o of FORECAST_OFFICES) {
    const url = `https://www.jma.go.jp/bosai/forecast/data/forecast/${o.code}.json`;
    const r = await fetchJson(url);
    if (!r.ok) {
      errors.push({ code: o.code, error: r.error });
      continue;
    }
    const arr = r.data;
    const today = arr?.[0]?.timeSeries?.[0];
    const weatherCodes = today?.areas?.[0]?.weatherCodes ?? [];
    const weathers = today?.areas?.[0]?.weathers ?? [];
    byIso[o.iso] = {
      label: o.label,
      reportDatetime: arr?.[0]?.reportDatetime ?? null,
      publishingOffice: arr?.[0]?.publishingOffice ?? null,
      todayWeatherCode: weatherCodes[0] ?? null,
      todayWeatherText: weathers[0] ?? null,
    };
  }
  return { byIso, errors };
}

const QUAKE_LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";

async function fetchEarthquakes() {
  const r = await fetchJson(QUAKE_LIST_URL);
  if (!r.ok) {
    return { items: [], error: r.error };
  }
  const list = Array.isArray(r.data) ? r.data : [];
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
  return { items, error: null };
}

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function readExistingMock(file) {
  try {
    const buf = await readFile(file, "utf8");
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

async function main() {
  await ensureDir(OUT_DIR);

  const useMock = process.argv.includes("--mock") || process.env.JMA_MOCK === "1";
  const fetchedAt = new Date().toISOString();

  let warnings = { byIso: {}, errors: [] };
  let forecast = { byIso: {}, errors: [] };
  let earthquakes = { items: [], error: null };

  if (useMock) {
    console.log("[fetch-jma-data] MOCK mode — using bundled mock data only");
    warnings = await readExistingMock(join(OUT_DIR, "warnings.json")) ?? warnings;
    forecast = await readExistingMock(join(OUT_DIR, "weather.json")) ?? forecast;
    earthquakes = await readExistingMock(join(OUT_DIR, "earthquakes.json")) ?? earthquakes;
  } else {
    console.log("[fetch-jma-data] fetching from jma.go.jp …");
    [warnings, forecast, earthquakes] = await Promise.all([
      fetchWarnings(),
      fetchForecast(),
      fetchEarthquakes(),
    ]);
  }

  const indexMeta = {
    fetchedAt,
    source: "気象庁 (Japan Meteorological Agency)",
    sourceUrl: "https://www.jma.go.jp/bosai/",
    license: "気象庁ホームページ コンテンツ利用ルール（出典明記）",
    counts: {
      warningsPrefectures: Object.keys(warnings.byIso).length,
      forecastOffices: Object.keys(forecast.byIso).length,
      earthquakes: earthquakes.items.length,
    },
    errors: {
      warnings: warnings.errors ?? [],
      forecast: forecast.errors ?? [],
      earthquakes: earthquakes.error ?? null,
    },
  };

  await writeFile(
    join(OUT_DIR, "warnings.json"),
    JSON.stringify({ fetchedAt, byIso: warnings.byIso }, null, 2),
    "utf8",
  );
  await writeFile(
    join(OUT_DIR, "weather.json"),
    JSON.stringify({ fetchedAt, byIso: forecast.byIso }, null, 2),
    "utf8",
  );
  await writeFile(
    join(OUT_DIR, "earthquakes.json"),
    JSON.stringify({ fetchedAt, items: earthquakes.items }, null, 2),
    "utf8",
  );
  await writeFile(
    join(OUT_DIR, "index.json"),
    JSON.stringify(indexMeta, null, 2),
    "utf8",
  );

  console.log(
    `[fetch-jma-data] done: warnings=${indexMeta.counts.warningsPrefectures} ` +
    `forecast=${indexMeta.counts.forecastOffices} eq=${indexMeta.counts.earthquakes}`,
  );
}

main().catch((err) => {
  console.error("[fetch-jma-data] fatal:", err);
  process.exit(1);
});
