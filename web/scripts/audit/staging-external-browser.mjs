#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl =
  process.env.STAGING_BROWSER_BASE_URL ?? "http://127.0.0.1:3330";
const evidenceRoot = resolve(
  process.env.STAGING_BROWSER_EVIDENCE_ROOT ??
    "../docs/audits/evidence/staging-external-validation-2026-07-27/chrome",
);
mkdirSync(evidenceRoot, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const browserVersion = browser.version();
const failures = [];
const results = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  browser: `Google Chrome ${browserVersion}`,
  widths: {},
  javascriptDisabled: {},
  form: {},
  consent: {},
  serviceWorker: {},
  externalOrigins: [],
};

function fail(id, detail) {
  failures.push({ id, detail });
}

const externalOrigins = new Set();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: "ja-JP",
  timezoneId: "Asia/Tokyo",
  reducedMotion: "reduce",
  serviceWorkers: "allow",
});
const page = await context.newPage();
page.on("request", (request) => {
  const parsed = new URL(request.url());
  if (parsed.origin !== new URL(baseUrl).origin) externalOrigins.add(parsed.origin);
});
await page.goto(`${baseUrl}/services/automation?consultationType=heat-illness-training#consult-form`, {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(500);
results.form.prefill = await page
  .getByLabel(/相談種別/)
  .inputValue();
if (results.form.prefill !== "heat-illness-training") {
  fail("heat-prefill", results.form.prefill);
}

await page.getByRole("button", { name: /返信先の入力へ進む/ }).click();
results.form.errorSummaryFocused = await page.evaluate(
  () =>
    document.activeElement?.getAttribute("role") === "alert" &&
    document.activeElement?.getAttribute("tabindex") === "-1",
);
if (!results.form.errorSummaryFocused) fail("form-error-focus", "not focused");

await page.getByLabel(/現在困っていること/).fill("Chrome staging dry-runの合成入力です。");
await page
  .getByLabel(/自動化・講習・資料作成の希望/)
  .fill("外部送信なしでフォーム構造を確認します。");
await page.getByRole("button", { name: /返信先の入力へ進む/ }).click();
await page.getByLabel(/お名前・担当者名/).fill("検証担当");
await page.getByLabel(/返信用メールアドレス/).fill("staging@example.test");
await page.getByLabel(/会社・団体名/).fill("ステージング検証");
await page.getByLabel(/現在利用しているツール/).fill("テスト用ブラウザー");
await page.getByLabel(/希望時期/).selectOption("undecided");
await page.getByLabel(/予算帯/).selectOption("undecided");
await page.getByLabel(/オンライン・現地等の希望/).selectOption("online");
await page.getByRole("checkbox", { name: /個人情報の取扱いに同意する/ }).check();
await page.getByRole("button", { name: /無料相談を送信/ }).click();
const formStatus = page.getByRole("status");
await formStatus.waitFor({ timeout: 15_000 });
results.form.dryRunVisible = (await formStatus.innerText()).includes(
  "入力内容を検証しました",
);
results.form.formalAcceptanceClaimed = (await formStatus.innerText()).includes(
  "相談を受け付けました",
);
if (!results.form.dryRunVisible || results.form.formalAcceptanceClaimed) {
  fail("form-dry-run", await formStatus.innerText());
}
results.serviceWorker = await page.evaluate(async () => ({
  controlled: Boolean(navigator.serviceWorker?.controller),
  registrationCount:
    "serviceWorker" in navigator
      ? (await navigator.serviceWorker.getRegistrations()).length
      : 0,
}));
if (
  results.serviceWorker.controlled ||
  results.serviceWorker.registrationCount !== 0
) {
  fail("preview-service-worker-disabled", results.serviceWorker);
}
await page.screenshot({
  path: resolve(evidenceRoot, "chrome-automation-dry-run.png"),
  fullPage: false,
  animations: "disabled",
});
await context.close();

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  const widthContext = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  const widthPage = await widthContext.newPage();
  await widthPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  results.widths[width] = await widthPage.evaluate(() => ({
    overflow:
      Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) - document.documentElement.clientWidth,
    automationTextVisible: document.body.innerText.includes("業務自動化"),
    automationHref: Boolean(
      document.querySelector('a[href^="/services/automation"]'),
    ),
    h1Visible: Boolean(document.querySelector("h1")?.getBoundingClientRect().height),
  }));
  if (
    results.widths[width].overflow > 2 ||
    !results.widths[width].automationTextVisible ||
    !results.widths[width].automationHref ||
    !results.widths[width].h1Visible
  ) {
    fail(`width-${width}`, results.widths[width]);
  }
  await widthContext.close();
}

const noJsContext = await browser.newContext({
  javaScriptEnabled: false,
  viewport: { width: 390, height: 844 },
  locale: "ja-JP",
});
const noJsPage = await noJsContext.newPage();
const noJsResponse = await noJsPage.goto(`${baseUrl}/services/automation`, {
  waitUntil: "domcontentloaded",
});
const noJsText = await noJsPage.locator("body").innerText();
const noJsTerms = [
  "サービス概要",
  "自動化例",
  "講習",
  "講習会資料",
  "マニュアル",
  "料金目安",
  "税込",
  "含まれるもの",
  "含まれないもの",
  "セキュリティ",
  "個人情報",
  "FAQ",
];
results.javascriptDisabled = {
  httpStatus: noJsResponse?.status() ?? null,
  terms: Object.fromEntries(noJsTerms.map((term) => [term, noJsText.includes(term)])),
  ctaHref: await noJsPage
    .locator('a[href^="/services/automation"][href*="consult-form"]')
    .first()
    .getAttribute("href"),
};
if (
  results.javascriptDisabled.httpStatus !== 200 ||
  Object.values(results.javascriptDisabled.terms).some((found) => !found) ||
  !results.javascriptDisabled.ctaHref
) {
  fail("javascript-disabled", results.javascriptDisabled);
}
await noJsContext.close();

for (const [state, value] of [
  ["unset", null],
  ["denied", "denied"],
  ["granted", "granted"],
  ["withdrawn", "denied"],
]) {
  const consentOrigins = new Set();
  const consentContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
  });
  if (value) {
    await consentContext.addInitScript(
      ([key, storedValue]) => localStorage.setItem(key, storedValue),
      ["safe-ai:optional-tracking-consent:v1", value],
    );
  }
  const consentPage = await consentContext.newPage();
  consentPage.on("request", (request) => {
    const parsed = new URL(request.url());
    if (parsed.origin !== new URL(baseUrl).origin) consentOrigins.add(parsed.origin);
  });
  await consentPage.goto(`${baseUrl}/services/automation`, {
    waitUntil: "domcontentloaded",
  });
  await consentPage.waitForTimeout(300);
  results.consent[state] = {
    storedValue: await consentPage.evaluate(() =>
      localStorage.getItem("safe-ai:optional-tracking-consent:v1"),
    ),
    externalOrigins: [...consentOrigins].sort(),
    optionalGoogleScriptCount: await consentPage.locator(
      'script[src*="googletagmanager.com"],script[src*="googlesyndication.com"]',
    ).count(),
  };
  if (
    results.consent[state].externalOrigins.length > 0 ||
    results.consent[state].optionalGoogleScriptCount > 0
  ) {
    fail(`consent-${state}`, results.consent[state]);
  }
  await consentContext.close();
}

results.externalOrigins = [...externalOrigins].sort();
if (results.externalOrigins.length > 0) {
  fail("automation-external-origins", results.externalOrigins);
}

await browser.close();
const report = {
  ...results,
  failures,
  passed: failures.length === 0,
};
const reportPath = resolve(evidenceRoot, "chrome-staging-summary.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({
    reportPath,
    browser: results.browser,
    checks:
      Object.keys(results.widths).length +
      Object.keys(results.consent).length +
      4,
    passed: report.passed,
    failures: failures.length,
  }, null, 2)}\n`,
);
if (!report.passed) process.exitCode = 1;
