import { warningOfficeAreas } from '../web/src/lib/jma/warning-areas.mjs';
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
    headers: new Headers({ date: new Date(ATTEMPT).toUTCString() }),
    async json() {
      return data;
    },
  };
}

function successResponseFor(url) {
  if (url.includes("/warning/data/r8/")) {
    const office=warningOfficeAreas[url.split("/").at(-1).slice(0,6)];
    return httpResponse([{
      headlineText: "synthetic warning",
      reportDatetime: ATTEMPT, controlDatetime: ATTEMPT, infoType: "発表",
      publishingOffice: "synthetic office", dataTypeCode: "VPWW55",
      warning: { class10Items: office.class10.map(areaCode=>({areaCode,kinds:[{code:"03",status:"発表"}]})), class20Items: [{ areaCode: office.class20[0] ?? url.split("/").at(-1).slice(0,2) + "10400", kinds: [{ code: "03", status: "発表" }] }] },
    }]);
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
      const match = url.match(/\/warning\/data\/r8\/(\d+)\.json$/);
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
    fetchImpl: async (url) => url.endsWith("/warning/data/r8/130000.json")
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

test('古い発表でも現行R8の新鮮な取得は成功し、発表時刻を書き換えない', async t => {
  const outDir=await makeFixture(t);
  const seen=[];
  const exitCode=await runCli({args:[],env:{},outDir,now:()=>new Date(ATTEMPT),logger:SILENT_LOGGER,
    fetchImpl:async url=>{
      seen.push(url);
      const res=successResponseFor(url);
      if(url.includes('/warning/')) {
        const data=await res.json();
        data[0].reportDatetime=data[0].controlDatetime='2026-05-28T01:16:00Z';
        data[0].warning.class20Items[0].kinds[0].code='43'; data[0].warning.class10Items.forEach(a=>a.kinds[0].code='43');
        return httpResponse(data);
      }
      return res;
    }});
  assert.equal(exitCode,0);
  const data=await readJson(join(outDir,'warnings.json'));
  assert.equal(data.fetchedAt,ATTEMPT);
  assert.equal(data.byIso['JP-13'].entries[0].reportDatetime,'2026-05-28T01:16:00Z');
  assert.equal(data.byIso['JP-13'].level,'warning');
  assert.ok(seen.includes('https://www.jma.go.jp/bosai/warning/data/r8/014100.json'));
});
test('旧形式・期限切れHTTP応答・未知コードは既存snapshotを更新しない',async t=>{
  for(const issue of ['legacy','stale-http','unknown-code']) {
    const outDir=await makeFixture(t), before=await snapshotBytes(outDir);
    const exitCode=await runCli({args:[],env:{},outDir,now:()=>new Date(ATTEMPT),logger:SILENT_LOGGER,
      fetchImpl:async url=>{
        const res=successResponseFor(url);
        if(!url.includes('/warning/')) return res;
        if(issue==='legacy') return httpResponse({reportDatetime:ATTEMPT,areaTypes:[{areas:[]}]});
        if(issue==='stale-http') res.headers.set('age','901');
        if(issue==='unknown-code') {const data=await res.json(); data[0].warning.class20Items[0].kinds[0].code='99'; return httpResponse(data);}
        return res;
      }});
    assert.equal(exitCode,1,issue);
    assert.deepEqual(await snapshotBytes(outDir),before,issue);
  }
});
test('取得日時だけの変化はファイルを変更せず、再デプロイ候補を作らない',async t=>{
  const outDir=await makeFixture(t);
  const options={args:[],env:{},outDir,now:()=>new Date(ATTEMPT),logger:SILENT_LOGGER,fetchImpl:async url=>successResponseFor(url)};
  assert.equal(await runCli(options),0);
  const names=['warnings.json','weather.json','earthquakes.json','index.json'];
  const before=await Promise.all(names.map(n=>readFile(join(outDir,n),'utf8')));
  assert.equal(await runCli({...options,now:()=>new Date(Date.parse(ATTEMPT)+600000)}),0);
  assert.deepEqual(await Promise.all(names.map(n=>readFile(join(outDir,n),'utf8'))),before);
});
