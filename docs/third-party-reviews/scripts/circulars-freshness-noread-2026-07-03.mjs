/**
 * データ鮮度表示チェック（柱C-11・機能UX班-B・2026-07-03）
 *
 * 目的: /circulars 一覧の結論カードに「収録最新発出: YYYY-MM-DD」等の実データ由来の
 * 鮮度指標が表示され、フッター文言もその実態と整合しているかを機械確認する。
 *
 * 実行: BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/circulars-freshness-noread-2026-07-03.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3100";

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/circulars`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);

  const checks = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const hasFreshness = /収録最新発出: \S+/.test(bodyText);
    const h1Count = document.querySelectorAll("h1").length;
    const footerMentionsFreshness = bodyText.includes("最も新しい発出日を上部に表示");
    const noDanglingClaim = !bodyText.includes("最終確認日を付与したものです");
    return { hasFreshness, h1Count, footerMentionsFreshness, noDanglingClaim };
  });

  const ok =
    checks.hasFreshness && checks.h1Count === 1 && checks.footerMentionsFreshness && checks.noDanglingClaim;
  console.log(`${ok ? "PASS" : "FAIL"} /circulars`, checks);
  await page.close();
  await browser.close();
  if (!ok) process.exit(1);
};

main();
