#!/usr/bin/env node

/**
 * One-shot, read-only Search Console probe through an already running,
 * remote-debuggable local Chrome session. It opens and closes a new tab,
 * performs no Search Console mutation, and never exports cookies, tokens,
 * account identifiers, DOM text, or screenshots.
 */
import { chromium } from "playwright";

const endpoint = process.env.SAFE_AI_EXISTING_CHROME_CDP;
if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}$/.test(endpoint ?? "")) {
  throw new Error("SAFE_AI_EXISTING_CHROME_CDP is required");
}

const report = {
  connected: false,
  searchConsoleLoaded: false,
  sessionAuthenticated: false,
  productionPropertyVisible: false,
  accessDenied: false,
  readyForManualVerification: false,
  browserTabClosed: false,
  mutationAttempted: false,
  cookiesExported: false,
  tokensExported: false,
  accountIdentifiersIncluded: false,
  domIncluded: false,
  screenshotCreated: false,
  errorClass: null,
};

let browser;
let page;
try {
  browser = await chromium.connectOverCDP(endpoint);
  report.connected = true;
  const context = browser.contexts()[0];
  if (!context) throw new Error("existing_browser_context_missing");
  page = await context.newPage();
  await page.goto(
    "https://search.google.com/search-console?resource_id=sc-domain%3Aanzen-ai-portal.jp",
    {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    },
  );
  await page.waitForTimeout(8_000);
  const current = new URL(page.url());
  const body = await page.locator("body").innerText().catch(() => "");
  report.searchConsoleLoaded =
    current.hostname === "search.google.com" &&
    current.pathname.startsWith("/search-console");
  report.sessionAuthenticated =
    report.searchConsoleLoaded &&
    !/sign in|ログイン/i.test(body.slice(0, 2_000));
  report.productionPropertyVisible = body.includes("anzen-ai-portal.jp");
  report.accessDenied =
    /you do not have access|you don't have access|アクセス権がありません|所有権を確認|verify ownership/i.test(
      body,
    );
  report.readyForManualVerification =
    report.sessionAuthenticated &&
    report.productionPropertyVisible &&
    !report.accessDenied &&
    /overview|performance|url inspection|sitemaps|概要|検索パフォーマンス|URL 検査|サイトマップ/i.test(
      body,
    );
} catch (error) {
  report.errorClass =
    error && error.constructor ? error.constructor.name : "unknown";
} finally {
  if (page) {
    await page.close({ runBeforeUnload: false }).catch(() => undefined);
    report.browserTabClosed = true;
  }
}

process.stdout.write(`${JSON.stringify(report)}\n`);
// Exiting severs only this CDP connection; it does not issue Browser.close to
// the user's already-running Chrome process.
process.exit(0);
