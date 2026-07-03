/**
 * 無読テスト: /features/use-cases 業種ジャンプナビ＋/accidents/[id] 最上部パンくずの44px是正（柱0補充・2026-07-03）
 *
 * ペルソナ: スマホで本文を読まず指でタップだけする初訪の一人親方（390×844）。
 * 背景: /features/use-cases の業種ジャンプナビ各ピル(px-3 py-1.5 text-xs≈28px)と、
 *   /accidents/[id] 最上部パンくずの「事故データベース」リンク(パディング無し≈20px)が44px未満だった既存欠陥。
 *   同ファイル内の他リンクは既に44px是正済みだったが、この2箇所だけ取り残されていた。
 *
 * 検証: 実boundingBoxがいずれも44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/use-cases-accident-breadcrumb-44px-2026-07-03.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await ctx.newPage();

console.log("\n[/features/use-cases] 業種ジャンプナビの44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/features/use-cases`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const jumpLinks = page.locator('nav[aria-label="業種ジャンプ"] a[href^="#"]');
const jumpCount = await jumpLinks.count();
check("業種ジャンプナビにリンクが存在する", jumpCount > 0, `count=${jumpCount}`);
for (let i = 0; i < jumpCount; i++) {
  const box = await jumpLinks.nth(i).boundingBox();
  const label = await jumpLinks.nth(i).textContent();
  check(`ジャンプピル「${label?.trim()}」が44px以上`, !!box && box.height >= 44, `height=${box?.height}`);
}

console.log("\n[/accidents/[id]] 最上部パンくずの44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/accidents/mhlw-100003`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const crumb = page.getByRole("link", { name: "事故データベース", exact: true });
const crumbBox = await crumb.boundingBox();
check("パンくず「事故データベース」リンクが44px以上", !!crumbBox && crumbBox.height >= 44, `height=${crumbBox?.height}`);

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
