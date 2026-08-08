import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const BASE_URL =
  process.env.SMOKE_BASE_URL ?? "https://www.anzen-ai-portal.jp";
const EXPECTED_DEPLOYMENT =
  process.env.SMOKE_DEPLOYMENT_ID ?? "dpl_AH5rurMeeJaR4yozyn7w54UvMyN6";

const checks = [];
const failures = [];
const browserSignals = {
  consoleErrors: [],
  pageErrors: [],
  sameOriginAssetFailures: [],
};

function record(name, ok, detail) {
  const item = { name, ok, detail };
  checks.push(item);
  if (!ok) failures.push(item);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  serviceWorkers: "block",
  locale: "ja-JP",
});

await context.addInitScript(() => {
  localStorage.setItem("anzen-onboarding-v1-seen", "1");
  localStorage.setItem("a11y-hint-dismissed", "true");
  localStorage.setItem("safe-ai:local-storage-warning-dismissed:v1", "1");
  localStorage.setItem("safe-ai:optional-tracking-consent:v1", "denied");
  localStorage.setItem("pwa-install-dismissed-at", String(Date.now()));
});

const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") {
    browserSignals.consoleErrors.push({
      url: page.url(),
      text: message.text().slice(0, 400),
    });
  }
});
page.on("pageerror", (error) => {
  browserSignals.pageErrors.push({
    url: page.url(),
    text: error.message.slice(0, 400),
  });
});
page.on("requestfailed", (request) => {
  const requestUrl = new URL(request.url());
  if (
    requestUrl.origin === new URL(BASE_URL).origin &&
    ["document", "script", "stylesheet"].includes(request.resourceType()) &&
    !/ERR_ABORTED/.test(request.failure()?.errorText ?? "")
  ) {
    browserSignals.sameOriginAssetFailures.push({
      url: request.url(),
      resourceType: request.resourceType(),
      error: request.failure()?.errorText ?? "unknown",
    });
  }
});

async function inspectRoute(route, width, height = 900) {
  await page.setViewportSize({ width, height });
  let response;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await page.goto(`${BASE_URL}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      break;
    } catch (error) {
      if (attempt === 3 || !/ERR_ABORTED/i.test(String(error))) {
        throw error;
      }
      await page.waitForTimeout(500);
    }
  }
  let snapshot;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 15_000 });
      await page.waitForTimeout(350);
      snapshot = await page.evaluate(() => ({
        h1: document.querySelectorAll("h1").length,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        deployment: document.documentElement.getAttribute("data-dpl-id"),
      }));
      break;
    } catch (error) {
      if (
        attempt === 3 ||
        !/Execution context was destroyed|navigation/i.test(String(error))
      ) {
        throw error;
      }
    }
  }
  const label = `${route}@${width}x${height}`;
  record(`${label}:HTTP`, response?.status() === 200, response?.status() ?? null);
  record(`${label}:H1`, snapshot.h1 === 1, snapshot.h1);
  record(`${label}:overflow`, snapshot.overflow <= 1, snapshot.overflow);
}

for (const width of [320, 390]) {
  for (const route of [
    "/",
    "/services/automation",
    "/accidents?acc_kw=%E5%A2%9C%E8%90%BD&acc_page=2",
    "/ky/paper",
    "/safety-diary",
    "/chemical-ra",
    "/law-search?q=%E5%AE%89%E8%A1%9B%E6%B3%95%20%E7%AC%AC61%E6%9D%A1",
    "/risk",
    "/signage",
  ]) {
    await inspectRoute(route, width);
  }
}
await inspectRoute("/", 844, 390);
await inspectRoute("/services/automation", 844, 390);
await inspectRoute("/", 1440);
await inspectRoute("/services/automation", 1440);
await inspectRoute(
  "/accidents?acc_kw=%E5%A2%9C%E8%90%BD&acc_page=2",
  1440,
);

// 横断検索: モバイルの明示導線と Ctrl+K の双方が検索ページへ到達する。
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE_URL}/`, {
  waitUntil: "domcontentloaded",
  timeout: 45_000,
});
const searchTrigger = page
  .getByRole("link", { name: "サイト内検索を開く（Ctrl+K）" })
  .first();
await searchTrigger.waitFor({ state: "visible" });
const searchTriggerBox = await searchTrigger.boundingBox();
record("search:trigger-visible", Boolean(searchTriggerBox), searchTriggerBox);
record(
  "search:touch-target",
  Boolean(
    searchTriggerBox &&
      searchTriggerBox.width >= 44 &&
      searchTriggerBox.height >= 44,
  ),
  searchTriggerBox,
);
await searchTrigger.click();
await page.waitForURL((url) => url.pathname === "/search", { timeout: 45_000 });
record(
  "search:link-navigation",
  new URL(page.url()).pathname === "/search",
  page.url(),
);
const searchInput = page.getByRole("searchbox", {
  name: "サイト内を横断検索",
});
await searchInput.waitFor({ state: "visible" });
record(
  "search:input-visible",
  await searchInput.isVisible(),
  await searchInput.getAttribute("aria-label"),
);

await page.goto(`${BASE_URL}/`, {
  waitUntil: "domcontentloaded",
  timeout: 45_000,
});
await page.keyboard.press("Control+K");
await page.waitForURL((url) => url.pathname === "/search", { timeout: 45_000 });
record(
  "search:keyboard-shortcut-navigation",
  new URL(page.url()).pathname === "/search",
  page.url(),
);

// 化学物質: 曖昧なキシレンはEnterだけで暗黙確定しない。
await page.goto(`${BASE_URL}/chemical-ra`, {
  waitUntil: "domcontentloaded",
  timeout: 45_000,
});
const chemicalInput = page.getByRole("combobox").first();
await chemicalInput.fill("キシレン");
await page.waitForFunction(
  () => document.querySelectorAll('[role="option"]').length > 1,
);
await chemicalInput.press("Enter");
record(
  "chemical:ambiguous-enter-hold",
  await page.getByText(/複数候補があります/).isVisible(),
  "複数候補の明示を確認",
);
record(
  "chemical:no-implicit-confirm",
  (await page.getByRole("heading", {
    name: "この物質候補を確認してください",
  }).count()) === 0,
  "Enter単独では確認画面へ進まない",
);
await chemicalInput.press("ArrowDown");
await chemicalInput.press("Enter");
const confirmationHeading = page.getByRole("heading", {
  name: "この物質候補を確認してください",
});
await confirmationHeading.waitFor({ state: "visible" });
const chemicalConfirmationText = await page.locator("body").innerText();
record(
  "chemical:explicit-keyboard-selection",
  /CAS番号/.test(chemicalConfirmationText) &&
    /SDS/.test(chemicalConfirmationText) &&
    /異性体|混合物/.test(chemicalConfirmationText),
  "CAS・SDS・異性体/混合物を表示",
);

// KY: 空の帳票は提出不可で、印刷プレビューは未確認版。
await page.goto(`${BASE_URL}/ky/paper`, {
  waitUntil: "domcontentloaded",
  timeout: 45_000,
});
const kySubmit = page.getByRole("button", { name: "元請に提出" });
await kySubmit.waitFor({ state: "visible" });
record("ky:incomplete-submit-disabled", await kySubmit.isDisabled(), "元請に提出");
record(
  "ky:readiness-issues",
  await page.getByText("提出・承認までに確認する項目").isVisible(),
  "不完全項目一覧を表示",
);
await page
  .getByRole("button", {
    name: "その他の操作（複製・共有・転記・印刷）",
  })
  .click();
await page.getByRole("menuitem", { name: /印刷プレビュー/ }).click();
record(
  "ky:draft-watermark",
  await page.getByText("下書き・未確認版").last().isVisible(),
  "印刷プレビュー",
);

// 工程書: 既定値・空欄は承認不可で、印刷プレビューは未確認版。
await page.goto(`${BASE_URL}/safety-diary`, {
  waitUntil: "domcontentloaded",
  timeout: 45_000,
});
const meetingApprove = page.getByRole("button", {
  name: "現在の内容を確認・承認",
});
await meetingApprove.waitFor({ state: "visible" });
record(
  "meeting:default-unapproved",
  await page.getByText("未承認", { exact: true }).isVisible(),
  "未承認",
);
record(
  "meeting:incomplete-approval-disabled",
  await meetingApprove.isDisabled(),
  "現在の内容を確認・承認",
);
record(
  "meeting:default-not-reviewed",
  await page
    .getByText(/空欄・既定値は確認済みと扱いません/)
    .isVisible(),
  "明示文",
);
await page
  .getByRole("button", {
    name: "その他の操作（複製・印刷・点検項目AI）",
  })
  .click();
await page.getByRole("menuitem", { name: /印刷プレビュー/ }).click();
record(
  "meeting:draft-watermark",
  await page.getByText("下書き・未確認版").last().isVisible(),
  "印刷プレビュー",
);

record(
  "browser:page-errors",
  browserSignals.pageErrors.length === 0,
  browserSignals.pageErrors,
);
record(
  "browser:same-origin-asset-failures",
  browserSignals.sameOriginAssetFailures.length === 0,
  browserSignals.sameOriginAssetFailures,
);
// Console errorは安全なproduction smokeでは回帰として扱う。
record(
  "browser:console-errors",
  browserSignals.consoleErrors.length === 0,
  browserSignals.consoleErrors,
);

await browser.close();

const result = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  expectedDeploymentId: EXPECTED_DEPLOYMENT,
  deploymentVerification:
    "Production alias ownership is verified separately with Vercel deployment inspection; application HTML does not expose a deployment id.",
  passed: failures.length === 0,
  checkCount: checks.length,
  passedCount: checks.length - failures.length,
  failedCount: failures.length,
  failures,
  browserSignals,
  checks,
};

if (process.env.SMOKE_OUTPUT_PATH) {
  const outputPath = resolve(process.env.SMOKE_OUTPUT_PATH);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
