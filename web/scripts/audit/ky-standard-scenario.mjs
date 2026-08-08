import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.argv.find((item) => item.startsWith("--base="))?.slice(7) ||
  "http://localhost:3311").replace(/\/$/u, "");
const outputDir = resolve(
  "../docs/audits/evidence/ky-zero-friction-redesign-2026-08-01/after-local-final",
);
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.route("**/api/weather-risk?area=tokyo-shinjuku*", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      provider: "open-meteo",
      fetchedAt: "2026-08-01T00:05:00.000Z",
      snapshot: {
        regionName: "東京都 新宿区",
        date: "2026-08-01",
        overview: "晴れ",
        temperatureCelsius: 34,
        windSpeedMs: 3,
        precipitationMm: 0,
        alerts: [],
      },
      current: {
        temperatureCelsius: 31.2,
        relativeHumidityPercent: 71,
        targetAt: "2026-08-01T09:00:00+09:00",
      },
      officialWarning: {
        status: "live",
        warnings: [],
        headline: null,
        fetchedAt: "2026-08-01T00:05:00.000Z",
        reportAt: "2026-08-01T00:00:00.000Z",
        sourceUrl: "https://www.jma.go.jp/bosai/warning/",
      },
    }),
  }),
);
await page.route("**/api/wbgt?area=tokyo-shinjuku*", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      areaId: "tokyo-shinjuku",
      areaLabel: "東京都 新宿区",
      prefectureIso: "JP-13",
      scopeLabel: "東京都内提供地点",
      provider: "環境省 熱中症予防情報サイト",
      sourceUrl: "https://www.wbgt.env.go.jp/",
      dataServiceUrl: "https://www.wbgt.env.go.jp/data_service.php",
      retrievedAt: "2026-08-01T00:05:00.000Z",
      degraded: false,
      wbgt: {
        status: "estimated",
        mode: "official-estimated-current",
        valueCelsius: 29.1,
        label: "推定値",
        targetAt: "2026-08-01T09:00:00+09:00",
        createdAt: "2026-08-01T00:00:00.000Z",
        stale: false,
        stationCount: 2,
        expectedStationCount: 2,
      },
      alerts: {
        heatAlert: "active",
        specialHeatAlert: "inactive",
        targetDate: "2026-08-01",
        reportAt: "2026-08-01T00:00:00.000Z",
      },
    }),
  }),
);

await page.goto(`${baseUrl}/ky/paper`);
await page.evaluate(async () => {
  const now = "2026-08-01T00:00:00.000Z";
  const expiresAt = "2026-09-01T00:00:00.000Z";
  const members = [
    { id: "member-yamada", displayName: "山田", role: "職長", createdAt: now, lastUsedAt: now, expiresAt },
    { id: "member-sato", displayName: "佐藤", role: "作業員", createdAt: now, lastUsedAt: now, expiresAt },
  ];
  await new Promise((resolvePromise, rejectPromise) => {
    const request = indexedDB.open("safe-ai-ky-local-v2", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("drafts")) db.createObjectStore("drafts", { keyPath: "id" });
      if (!db.objectStoreNames.contains("members")) db.createObjectStore("members", { keyPath: "id" });
    };
    request.onerror = () => rejectPromise(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(["drafts", "members"], "readwrite");
      members.forEach((member) => tx.objectStore("members").put(member));
      tx.objectStore("drafts").put({
        schemaVersion: 2,
        id: "ky-previous-team",
        state: "confirmed",
        createdAt: now,
        updatedAt: now,
        expiresAt,
        workDate: "2026-07-31",
        workStartTime: "08:00",
        locationQuery: "東京都 新宿区",
        areaId: "tokyo-shinjuku",
        areaLabel: "東京都 新宿区",
        weather: null,
        selectedMembers: members.map(({ id, displayName, role }) => ({ id, displayName, role })),
        workDescription: "前回作業",
        hazards: [],
        reviewerName: "山田／職長",
        notes: "",
        confirmedAt: now,
        pdfExportedAt: null,
        handoff: null,
      });
      tx.oncomplete = () => { db.close(); resolvePromise(); };
      tx.onerror = () => rejectPromise(tx.error);
    };
  });
});
await page.reload();

let operations = 0;
const timings = {};
const start = performance.now();

await page.locator("#ky-location").fill("新宿区");
operations += 1;
await page.getByText("WBGT 29.1℃・推定").waitFor({ state: "visible" });

await page.getByRole("button", { name: "前回のメンバー", exact: true }).click();
operations += 1;

const candidateStart = performance.now();
await page.locator("#ky-work-description").fill("足場上で外壁パネルを取り付ける");
operations += 1;
const hazard = page.getByRole("checkbox", { name: "危険候補「墜落・転落」を選択" });
await hazard.waitFor({ state: "visible" });
timings.workStopToHazardCandidateMs = Math.round(performance.now() - candidateStart);

const measureStart = performance.now();
await hazard.check();
operations += 1;
const scrollAfterHazardSelection = await page.evaluate(() => window.scrollY);
const measure = page.getByRole("checkbox", {
  name: /危険1の対策候補「作業床・上桟・中桟・幅木を含む手すり設備を設置する」を選択/,
});
await measure.waitFor({ state: "visible" });
timings.hazardSelectionToMeasureCandidateMs = Math.round(performance.now() - measureStart);
const inlineMeasureGeometry = await measure.evaluate((element) => {
  const rect = element.getBoundingClientRect();
  return {
    inSelectedHazardCard:
      element.closest("[data-hazard-candidate-id='fall-scaffold']") !== null,
    inViewportWithoutAdditionalScroll: rect.top >= 0 && rect.bottom <= window.innerHeight,
    top: Math.round(rect.top),
    viewportHeight: window.innerHeight,
  };
});
const scrollBeforeMeasureClick = await page.evaluate(() => window.scrollY);

await measure.check();
operations += 1;
await page.getByText("保存済み", { exact: true }).waitFor({ state: "visible" });
timings.startToSavedMs = Math.round(performance.now() - start);

await page.getByRole("button", { name: "山田として確認", exact: true }).click();
operations += 1;
await page.getByText("確認済み", { exact: true }).first().waitFor({ state: "visible" });
const confirmedBeforePdf = true;

const pdfStart = performance.now();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "PDFで保存", exact: true }).click();
operations += 1;
const download = await downloadPromise;
timings.pdfClickToDownloadMs = Math.round(performance.now() - pdfStart);
timings.totalScenarioMs = Math.round(performance.now() - start);

const result = {
  scenario: "新宿区で、足場上の外壁パネル取付を、山田・佐藤の2名で行う",
  state: "previous members registered on this device",
  operations,
  reentryCount: 0,
  intermediatePages: 0,
  finalUrlPath: new URL(page.url()).pathname,
  pdfFilename: download.suggestedFilename(),
  timings,
  hazardToMeasure: {
    ...inlineMeasureGeometry,
    additionalScrollBeforeMeasureClick:
      Math.round(scrollBeforeMeasureClick - scrollAfterHazardSelection),
  },
  confirmedBeforePdf,
  confirmationTimestampRetained:
    (await page.getByText(/確認日時/).count()) > 0,
  finalState: (await page.getByText("PDF出力済み", { exact: true }).first().isVisible())
    ? "PDF出力済み"
    : "unexpected",
  candidateStillHumanSelected: await hazard.isChecked(),
};

await page.screenshot({
  path: resolve(outputDir, "standard-scenario-complete-390x844.png"),
  fullPage: false,
});
writeFileSync(
  resolve(outputDir, "standard-scenario-metrics.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(result, null, 2));

await context.close();
await browser.close();
