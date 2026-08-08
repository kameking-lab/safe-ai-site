import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runCli } from "./fetch-jma-data.mjs";

const PREVIOUS_SUCCESS = "2026-07-21T00:00:00.000Z";
const ATTEMPT = "2026-07-22T03:04:05.000Z";
const SILENT_LOGGER = { log() {}, error() {} };

function isoCodes() {
  return Array.from({ length: 47 }, (_, index) => `JP-${String(index + 1).padStart(2, "0")}`);
}

function previousWarnings() {
  const byIso = Object.fromEntries(
    isoCodes().map((iso) => [iso, { level: "none", entries: [] }]),
  );
  byIso["JP-13"] = {
    level: "warning",
    entries: [{ sourceCode: "130000", level: "warning", headline: "previous warning" }],
  };
  return { fetchedAt: PREVIOUS_SUCCESS, byIso };
}

function previousWeather() {
  const offices = ["JP-01", "JP-04", "JP-13", "JP-23", "JP-27", "JP-34", "JP-40"];
  return {
    fetchedAt: PREVIOUS_SUCCESS,
    byIso: Object.fromEntries(offices.map((iso) => [iso, { label: iso, todayWeatherCode: "100" }])),
  };
}

function previousEarthquakes() {
  return {
    fetchedAt: PREVIOUS_SUCCESS,
    items: [{ eventId: "previous-event", maxIntensity: "3" }],
  };
}

function previousIndex() {
  return {
    fetchedAt: PREVIOUS_SUCCESS,
    lastSuccessfulAt: PREVIOUS_SUCCESS,
    lastAttemptAt: PREVIOUS_SUCCESS,
    status: "success",
    counts: { warningsPrefectures: 47, forecastOffices: 7, earthquakes: 1 },
  };
}

async function makeFixture(t) {
  const outDir = await mkdtemp(join(tmpdir(), "safe-ai-jma-test-"));
  t.after(async () => {
    await rm(outDir, { recursive: true, force: true });
  });
  await Promise.all([
    writeFile(join(outDir, "warnings.json"), JSON.stringify(previousWarnings()), "utf8"),
    writeFile(join(outDir, "weather.json"), JSON.stringify(previousWeather()), "utf8"),
    writeFile(join(outDir, "earthquakes.json"), JSON.stringify(previousEarthquakes()), "utf8"),
    writeFile(join(outDir, "index.json"), JSON.stringify(previousIndex()), "utf8"),
  ]);
  return outDir;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function snapshotBytes(outDir) {
  return Promise.all(
    ["warnings.json", "weather.json", "earthquakes.json"].map((name) =>
      readFile(join(outDir, name), "utf8")),
  );
}

function httpResponse(data, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return data;
    },
  };
}

function successResponseFor(url) {
  if (url.includes("/warning/data/warning/")) {
    return httpResponse({
      headlineText: "synthetic warning",
      reportDatetime: ATTEMPT,
      publishingOffice: "synthetic office",
      areaTypes: [{ areas: [{ code: "000000", warnings: [{ code: "03", status: "発表" }] }] }],
    });
  }
  if (url.includes("/forecast/data/forecast/")) {
    return httpResponse([{
      reportDatetime: ATTEMPT,
      publishingOffice: "synthetic office",
      timeSeries: [{ areas: [{ weatherCodes: ["100"], weathers: ["晴れ"] }] }],
    }]);
  }
  if (url.endsWith("/quake/data/list.json")) {
    return httpResponse([{
      eid: "synthetic-event",
      rdt: ATTEMPT,
      at: ATTEMPT,
      anm: "synthetic hypocenter",
      mag: "4.0",
      maxInt: "3",
      ttl: "synthetic earthquake",
    }]);
  }
  throw new Error(`unexpected fixed URL: ${url}`);
}

test("全面取得失敗では既存スナップショットを保持し、終了コード1を返す", async (t) => {
  const outDir = await makeFixture(t);
  const before = await snapshotBytes(outDir);
  const exitCode = await runCli({
    args: [],
    env: {},
    outDir,
    fetchImpl: async () => httpResponse(null, { ok: false, status: 503 }),
    now: () => new Date(ATTEMPT),
    logger: SILENT_LOGGER,
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(await snapshotBytes(outDir), before);
  const index = await readJson(join(outDir, "index.json"));
  assert.equal(index.status, "failed");
  assert.equal(index.fetchedAt, PREVIOUS_SUCCESS);
  assert.equal(index.lastSuccessfulAt, PREVIOUS_SUCCESS);
  assert.equal(index.lastAttemptAt, ATTEMPT);
  assert.equal(index.quality.warnings.successfulRequests, 0);
  assert.equal(index.quality.warnings.failureRate, 1);
  assert.equal(index.counts.warningsPrefectures, 47);
});

test("高い警報取得失敗率では部分結果を公開しない", async (t) => {
  const outDir = await makeFixture(t);
  const before = await snapshotBytes(outDir);
  const exitCode = await runCli({
    args: [],
    env: {},
    outDir,
    fetchImpl: async (url) => {
      const match = url.match(/\/warning\/data\/warning\/(\d+)\.json$/);
      if (match && Number(match[1].slice(0, 2)) <= 25) {
        return httpResponse(null, { ok: false, status: 502 });
      }
      return successResponseFor(url);
    },
    now: () => new Date(ATTEMPT),
    logger: SILENT_LOGGER,
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(await snapshotBytes(outDir), before);
  const index = await readJson(join(outDir, "index.json"));
  assert.equal(index.status, "failed");
  assert.ok(index.quality.warnings.failureRate > 0.25);
  assert.ok(index.quality.warnings.effectivePrefectures < 47);
});

test("警報1件だけの失敗でも安全側に倒して公開しない", async (t) => {
  const outDir = await makeFixture(t);
  const before = await snapshotBytes(outDir);
  const exitCode = await runCli({
    args: [],
    env: {},
    outDir,
    fetchImpl: async (url) => url.endsWith("/warning/data/warning/130000.json")
      ? httpResponse(null, { ok: false, status: 504 })
      : successResponseFor(url),
    now: () => new Date(ATTEMPT),
    logger: SILENT_LOGGER,
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(await snapshotBytes(outDir), before);
  const index = await readJson(join(outDir, "index.json"));
  assert.equal(index.quality.warnings.failedRequests, 1);
  assert.equal(index.quality.warnings.effectivePrefectures, 46);
});

test("不正な地震JSONは空配列の成功として扱わない", async (t) => {
  const outDir = await makeFixture(t);
  const before = await snapshotBytes(outDir);
  const exitCode = await runCli({
    args: [],
    env: {},
    outDir,
    fetchImpl: async (url) => url.endsWith("/quake/data/list.json")
      ? httpResponse({ unexpected: true })
      : successResponseFor(url),
    now: () => new Date(ATTEMPT),
    logger: SILENT_LOGGER,
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(await snapshotBytes(outDir), before);
  const index = await readJson(join(outDir, "index.json"));
  assert.equal(index.quality.earthquakes.validPayload, false);
  assert.equal(index.errors.earthquakes.error, "invalid payload");
});

test("完全な合成応答だけを公開し、全体同時接続数を上限内に保つ", async (t) => {
  const outDir = await makeFixture(t);
  let active = 0;
  let maximumActive = 0;
  const maxConcurrency = 3;
  const exitCode = await runCli({
    args: [],
    env: {},
    outDir,
    maxConcurrency,
    fetchImpl: async (url) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      return successResponseFor(url);
    },
    now: () => new Date(ATTEMPT),
    logger: SILENT_LOGGER,
  });

  assert.equal(exitCode, 0);
  assert.equal(maximumActive, maxConcurrency);
  const warnings = await readJson(join(outDir, "warnings.json"));
  const weather = await readJson(join(outDir, "weather.json"));
  const earthquakes = await readJson(join(outDir, "earthquakes.json"));
  const index = await readJson(join(outDir, "index.json"));
  assert.equal(Object.keys(warnings.byIso).length, 47);
  assert.equal(Object.keys(weather.byIso).length, 7);
  assert.equal(earthquakes.items.length, 1);
  assert.equal(warnings.fetchedAt, ATTEMPT);
  assert.equal(index.status, "success");
  assert.equal(index.lastSuccessfulAt, ATTEMPT);
  assert.equal(index.lastAttemptAt, ATTEMPT);
  assert.equal(
    index.quality.warnings.successfulRequests,
    index.quality.warnings.expectedRequests,
  );
  assert.equal(index.quality.forecast.successfulRequests, 7);
  assert.deepEqual((await readdir(outDir)).filter((name) => name.endsWith(".tmp")), []);
});

test("mock検証は既存データの鮮度時刻を書き換えない", async (t) => {
  const outDir = await makeFixture(t);
  const names = ["warnings.json", "weather.json", "earthquakes.json", "index.json"];
  const before = await Promise.all(names.map((name) => readFile(join(outDir, name), "utf8")));
  const exitCode = await runCli({
    args: ["--mock"],
    env: {},
    outDir,
    fetchImpl: async () => {
      throw new Error("network must not be called in mock mode");
    },
    now: () => new Date(ATTEMPT),
    logger: SILENT_LOGGER,
  });

  assert.equal(exitCode, 0);
  const after = await Promise.all(names.map((name) => readFile(join(outDir, name), "utf8")));
  assert.deepEqual(after, before);
});
