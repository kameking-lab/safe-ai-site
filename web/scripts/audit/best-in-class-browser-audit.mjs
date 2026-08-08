#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BROWSER_AUDIT_BASE_URL ?? "http://127.0.0.1:3320";
const previewSafetyMode =
  process.env.BROWSER_AUDIT_PREVIEW_SAFETY_MODE?.toLowerCase() === "true";
const evidenceRoot = process.env.BROWSER_AUDIT_EVIDENCE_ROOT
  ? resolve(process.env.BROWSER_AUDIT_EVIDENCE_ROOT)
  : resolve(
      process.cwd(),
      "../docs/audits/evidence/best-in-class-resume-2026-07-26/browser",
    );
const screenshotRoot = resolve(evidenceRoot, "screenshots");
mkdirSync(screenshotRoot, { recursive: true });

const pages = [
  { id: "home", path: "/" },
  { id: "safety-ai", path: "/safety-ai" },
  { id: "automation", path: "/services/automation" },
  { id: "chemical-ra", path: "/chemical-ra" },
  { id: "ky", path: "/ky/paper" },
  { id: "safety-diary", path: "/safety-diary" },
  { id: "signage", path: "/signage" },
  { id: "signage-map", path: "/signage/map" },
  { id: "chatbot", path: "/chatbot" },
  { id: "law-search", path: "/law-search" },
  { id: "quality", path: "/about/quality" },
  { id: "risk", path: "/risk" },
  { id: "heat-hub", path: "/heat-illness-prevention" },
  { id: "heat-slides", path: "/heat-illness-prevention/slides" },
  { id: "heat-elearning", path: "/heat-illness-prevention/elearning" },
  { id: "qualification-finder", path: "/education-certification/finder" },
  { id: "privacy", path: "/privacy" },
  { id: "security", path: "/security" },
  { id: "signin", path: "/auth/signin" },
  {
    id: "not-found",
    path: "/staging-validation-not-found-20260727",
    expectedStatus: 404,
  },
];

const primaryViewports = [
  { id: "mobile-390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: "desktop-1440", width: 1440, height: 900, isMobile: false, hasTouch: false },
];

const responsiveWidthMatrix = [
  { id: "width-320", width: 320, height: 760 },
  { id: "width-360", width: 360, height: 800 },
  { id: "width-768", width: 768, height: 900 },
  { id: "width-1024", width: 1024, height: 900 },
];
const responsivePageIds = new Set([
  "home",
  "signage",
  "heat-hub",
  "heat-slides",
  "heat-elearning",
]);

const browser = await chromium.launch({ headless: true });
const results = [];
const criticalFailures = [];

function recordFailure(id, message) {
  criticalFailures.push({ id, message });
}

async function inspectPage(page, item, viewportId) {
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];
  const externalOrigins = new Set();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const parsed = new URL(request.url());
    requestFailures.push({
      origin: parsed.origin,
      path: parsed.pathname,
      reason: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("request", (request) => {
    const parsed = new URL(request.url());
    if (parsed.origin !== new URL(baseUrl).origin) externalOrigins.add(parsed.origin);
  });
  const response = await page.goto(`${baseUrl}${item.path}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForTimeout(800);

  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    const robots =
      document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
    return {
      title: document.title,
      canonical,
      robots,
      jsonLdCount: document.querySelectorAll(
        'script[type="application/ld+json"]',
      ).length,
      descriptionLength: description.trim().length,
      h1Count: document.querySelectorAll("h1").length,
      visibleH1Count: [...document.querySelectorAll("h1")].filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
      }).length,
      mainCount: document.querySelectorAll("main").length,
      lang: root.lang,
      rootClientWidth: root.clientWidth,
      rootScrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
      horizontalOverflow:
        Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth,
      bodyTextLength: body.innerText.trim().length,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      forcedColors: matchMedia("(forced-colors: active)").matches,
    };
  });

  const id = `${item.id}-${viewportId}`;
  await page.screenshot({
    path: resolve(screenshotRoot, `${id}.png`),
    fullPage: false,
    animations: "disabled",
  });

  const result = {
    id,
    path: item.path,
    viewport: viewportId,
    httpStatus: response?.status() ?? null,
    pageErrors,
    consoleErrors,
    requestFailures,
    externalOrigins: [...externalOrigins].sort(),
    ...metrics,
  };
  results.push(result);

  const expectedStatus = item.expectedStatus ?? 200;
  if (result.httpStatus !== expectedStatus) {
    recordFailure(id, `HTTP ${result.httpStatus}; expected ${expectedStatus}`);
  }
  if (result.mainCount !== 1) recordFailure(id, `main count ${result.mainCount}`);
  if (result.h1Count !== 1 || result.visibleH1Count !== 1) {
    recordFailure(id, `h1 count ${result.h1Count}, visible ${result.visibleH1Count}`);
  }
  const isNotFound = expectedStatus === 404;
  const canonicalIsSafe = isNotFound ? !result.canonical : Boolean(result.canonical);
  const notFoundMetadataIsSafe =
    !isNotFound ||
    (/\bnoindex\b/i.test(result.robots) &&
      result.jsonLdCount === 0 &&
      !result.canonical);
  if (
    !result.title ||
    result.descriptionLength < 35 ||
    !canonicalIsSafe ||
    !notFoundMetadataIsSafe
  ) {
    recordFailure(
      id,
      `metadata title=${Boolean(result.title)} description=${result.descriptionLength} canonical=${result.canonical || "(none)"} robots=${result.robots || "(none)"} jsonLd=${result.jsonLdCount}`,
    );
  }
  if (result.horizontalOverflow > 2) {
    recordFailure(id, `root horizontal overflow ${result.horizontalOverflow}px`);
  }
  if (result.pageErrors.length > 0) {
    recordFailure(id, `page errors ${result.pageErrors.length}`);
  }
  const failedSameOriginStaticAssets = result.requestFailures.filter(
    (failure) =>
      failure.origin === new URL(baseUrl).origin &&
      /^\/_next\/static\/.*\.(?:css|js)$/i.test(failure.path),
  );
  if (failedSameOriginStaticAssets.length > 0) {
    recordFailure(
      id,
      `same-origin static asset failures ${JSON.stringify(failedSameOriginStaticAssets)}`,
    );
  }
  if (result.consoleErrors.some((message) => /hydration|uncaught/i.test(message))) {
    recordFailure(id, `hydration/uncaught console errors ${result.consoleErrors.length}`);
  }
}

for (const viewport of primaryViewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    reducedMotion: "reduce",
  });
  for (const item of pages) {
    const page = await context.newPage();
    await inspectPage(page, item, viewport.id);
    await page.close();
  }
  await context.close();
}

for (const viewport of responsiveWidthMatrix) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  for (const item of pages.filter((page) => responsivePageIds.has(page.id))) {
    const page = await context.newPage();
    await inspectPage(page, item, viewport.id);
    await page.close();
  }
  await context.close();
}

const modes = {};

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    reducedMotion: "reduce",
    forcedColors: "active",
  });
  modes.forcedColorsReducedMotion = {};
  for (const item of pages.filter((page) =>
    ["home", "heat-hub", "heat-slides", "heat-elearning"].includes(page.id),
  )) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${item.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const result = await page.evaluate(() => ({
      forcedColors: matchMedia("(forced-colors: active)").matches,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      h1Visible: Boolean(document.querySelector("h1")?.getBoundingClientRect().height),
    }));
    modes.forcedColorsReducedMotion[item.id] = result;
    await page.screenshot({
      path: resolve(
        screenshotRoot,
        `${item.id}-forced-colors-reduced-motion.png`,
      ),
      animations: "disabled",
    });
    if (!result.forcedColors || !result.reducedMotion || !result.h1Visible) {
      recordFailure(
        `${item.id}-forced-colors-reduced-motion`,
        "media mode or H1 was not active",
      );
    }
    await page.close();
  }
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName ?? "",
    href: document.activeElement?.getAttribute("href") ?? "",
    text: document.activeElement?.textContent?.trim() ?? "",
  }));
  if (firstFocus.href === "#main-content") {
    await page.keyboard.press("Enter");
  }
  const skipTarget = await page.evaluate(() => document.activeElement?.id ?? "");
  const menuButton = page.getByRole("button", { name: /メニュー/ }).first();
  await menuButton.click();
  await page.keyboard.press("Escape");
  const menuFocusRestored = await menuButton.evaluate(
    (button) => document.activeElement === button,
  );
  modes.keyboard = { firstFocus, skipTarget, menuFocusRestored };
  if (firstFocus.href !== "#main-content" || skipTarget !== "main-content") {
    recordFailure("keyboard-skip-link", JSON.stringify(modes.keyboard));
  }
  if (!menuFocusRestored) {
    recordFailure("keyboard-mobile-menu", "Escape did not restore focus");
  }
  await context.close();
}

for (const zoomPercent of [200, 400]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  for (const item of pages.filter((page) =>
    ["home", "heat-hub", "heat-slides", "heat-elearning"].includes(page.id),
  )) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${item.path}`, { waitUntil: "domcontentloaded" });
    await page.evaluate((percent) => {
      document.documentElement.style.fontSize = `${percent}%`;
    }, zoomPercent);
    await page.waitForTimeout(250);
    const result = await page.evaluate(() => ({
      h1Visible: Boolean(document.querySelector("h1")?.getBoundingClientRect().height),
      horizontalOverflow:
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
        document.documentElement.clientWidth,
    }));
    const id = `${item.id}-text-zoom-${zoomPercent}`;
    modes[id] = result;
    await page.screenshot({
      path: resolve(screenshotRoot, `${id}.png`),
      animations: "disabled",
    });
    if (!result.h1Visible || result.horizontalOverflow > 2) {
      recordFailure(id, JSON.stringify(result));
    }
    await page.close();
  }
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  const page = await context.newPage();
  let interceptedWeatherRiskRequests = 0;
  await page.route("**/api/weather-risk**", (route) => {
    interceptedWeatherRiskRequests += 1;
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "audit_outage" }),
    });
  });
  // /risk は地域選択後にだけ気象APIを呼ぶ。実在する正規 area を指定し、
  // 失敗レスポンスを実際にUIへ到達させて fail-closed 表示を確認する。
  await page.goto(`${baseUrl}/risk?area=tokyo-shinjuku`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForFunction(
      () => /取得でき|確認できません|利用できません|更新に失敗/.test(document.body.innerText),
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => {});
  modes.apiFailure = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      failClosedMessage: /判断を保留|取得でき|確認できません|利用できません|更新に失敗/.test(text),
      claimsNoWarning: /警報[・／]?注意報(?:は)?ありません/.test(text),
    };
  });
  modes.apiFailure.interceptedWeatherRiskRequests =
    interceptedWeatherRiskRequests;
  await page.screenshot({
    path: resolve(screenshotRoot, "risk-api-failure.png"),
    animations: "disabled",
  });
  if (
    modes.apiFailure.interceptedWeatherRiskRequests < 1 ||
    !modes.apiFailure.failClosedMessage ||
    modes.apiFailure.claimsNoWarning
  ) {
    recordFailure("risk-api-failure", JSON.stringify(modes.apiFailure));
  }
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (200 * 1024) / 8,
    connectionType: "cellular3g",
  });
  const started = Date.now();
  const response = await page.goto(`${baseUrl}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  modes.slowNetwork = {
    httpStatus: response?.status() ?? null,
    domContentLoadedMs: Date.now() - started,
    h1Visible: await page.locator("h1").isVisible(),
  };
  if (modes.slowNetwork.httpStatus !== 200 || !modes.slowNetwork.h1Visible) {
    recordFailure("slow-network", JSON.stringify(modes.slowNetwork));
  }
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  if (!previewSafetyMode) {
    await page
      .waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, {
        // Global enhancements intentionally start after 10 seconds so that
        // analytics/PWA work stays outside the LCP dependency graph.
        timeout: 15_000,
      })
      .catch(() => undefined);
  } else {
    await page.waitForTimeout(1_000);
  }
  const workerState = await page.evaluate(async () => ({
    controlled: Boolean(navigator.serviceWorker?.controller),
    registrationCount: "serviceWorker" in navigator
      ? (await navigator.serviceWorker.getRegistrations()).length
      : 0,
  }));
  await context.setOffline(true);
  await page.waitForTimeout(500);
  let reloadError = null;
  if (!previewSafetyMode) {
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
    } catch (error) {
      reloadError = error instanceof Error ? error.message : String(error);
      await page
        .waitForLoadState("domcontentloaded", { timeout: 2_000 })
        .catch(() => undefined);
    }
  }
  modes.offline = await page.evaluate(
    ({ workerState, reloadError, previewSafetyMode }) => ({
      previewSafetyMode,
      controlled: workerState.controlled,
      registrationCount: workerState.registrationCount,
      reloadError,
      offlineStatusVisible: document.body?.innerText.includes("オフラインモード") ?? false,
      bodyTextLength: document.body?.innerText.trim().length ?? 0,
      h1Visible: Boolean(document.querySelector("h1")?.getBoundingClientRect().height),
    }),
    { workerState, reloadError, previewSafetyMode },
  );
  await page.screenshot({
    path: resolve(screenshotRoot, "home-offline.png"),
    animations: "disabled",
  });
  const offlinePassed = previewSafetyMode
    ? !modes.offline.controlled &&
      modes.offline.registrationCount === 0 &&
      modes.offline.h1Visible
    : modes.offline.controlled && modes.offline.h1Visible;
  if (!offlinePassed) {
    recordFailure("offline", JSON.stringify(modes.offline));
  }
  await context.close();
}

{
  const response = await fetch(`${baseUrl}/accidents`, { redirect: "manual" });
  const body = await response.text();
  const detailResponse = await fetch(
    `${baseUrl}/accidents/synthetic-audit-case`,
    { redirect: "manual" },
  );
  const noindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(
    body,
  );
  const officialMhlwLink = body.includes("https://anzeninfo.mhlw.go.jp/");
  // 一覧の注意書きではなく、未検証の個別レコードをHTTP境界で公開しないことを検証する。
  const detailFailsClosed =
    detailResponse.status === 404 &&
    detailResponse.headers.get("location") === null;
  modes.accidentDatabaseQuarantine = {
    httpStatus: response.status,
    location: response.headers.get("location"),
    noindex,
    officialMhlwLink,
    detailHttpStatus: detailResponse.status,
    detailLocation: detailResponse.headers.get("location"),
    detailFailsClosed,
  };
  if (
    response.status !== 200 ||
    !noindex ||
    !officialMhlwLink ||
    !detailFailsClosed
  ) {
    recordFailure(
      "accident-database-quarantine",
      JSON.stringify(modes.accidentDatabaseQuarantine),
    );
  }
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  scope: {
    pages: pages.map((item) => item.path),
    primaryViewports,
    responsiveWidthMatrix,
    responsivePages: pages
      .filter((item) => responsivePageIds.has(item.id))
      .map((item) => item.path),
    notes: [
      "200%・400%はroot font-sizeを2倍・4倍にしたテキスト拡大試験。",
      "320・360・390・768・1024・1440pxで主要ページのreflowを確認。",
      "事故一覧はnoindexと公式検索導線を保ち、未検証の個別詳細はHTTP 404で隔離する。",
      "NVDA/VoiceOverの実機確認ではない。",
      previewSafetyMode
        ? "Preview安全モードではService Workerを登録解除し、読込済み画面のoffline状態表示とregistration 0件を確認。"
        : "通常モードではService Worker制御下のoffline shellを確認。",
    ],
  },
  results,
  modes,
  criticalFailures,
  passed: criticalFailures.length === 0,
};

const reportPath = resolve(evidenceRoot, "browser-audit-summary.json");
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify(
    {
      reportPath,
      pageChecks: results.length,
      modeChecks: Object.keys(modes).length,
      passed: report.passed,
      criticalFailureCount: criticalFailures.length,
    },
    null,
    2,
  )}\n`,
);

if (!report.passed) process.exitCode = 1;
