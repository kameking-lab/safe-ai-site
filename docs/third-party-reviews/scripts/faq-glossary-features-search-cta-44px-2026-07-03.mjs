/**
 * 無読テスト: /faq・/glossary の主要検索導線＋/features 系サブページCTAの44px是正（柱0補充・2026-07-03）
 *
 * ペルソナ: スマホで本文を読まず指でタップだけする初訪の一人親方（390×844）。
 * 背景: /faq ハブ最上部「FAQを検索する」ボタン(py-2.5+text-sm≈40px)、
 *   /glossary 用語集の検索入力欄(py-2.5+text-sm≈40px)、
 *   /features/[category]・/features/use-cases・/features/quick-tour・/features/comparison・
 *   /features/print の各種CTA(py-2〜2.5+text-xs/sm≈36〜40px)がいずれも44px未満だった既存欠陥。
 *
 * 検証: 実boundingBoxがいずれも44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3111 npm run start
 *   BASE_URL=http://localhost:3111 node docs/third-party-reviews/scripts/faq-glossary-features-search-cta-44px-2026-07-03.mjs
 */
// playwright は web/node_modules にあるため、本スクリプト位置から相対解決する。
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3111";
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

console.log("\n[/faq] 「FAQを検索する」ボタンの44pxタップ標的");
await page.goto(`${BASE}/faq`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
{
  const box = await page.getByRole("link", { name: "FAQを検索する" }).boundingBox();
  check("FAQを検索するボタンが44px以上", !!box && box.height >= 44, `height=${box?.height}`);
}

console.log("\n[/glossary] 検索入力欄の44pxタップ標的");
await page.goto(`${BASE}/glossary`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
{
  const box = await page.getByPlaceholder("用語・読み・説明を検索...").boundingBox();
  check("検索入力欄が44px以上", !!box && box.height >= 44, `height=${box?.height}`);
}

console.log("\n[/features/quick-tour] ステップ遷移・下部CTAの44pxタップ標的");
await page.goto(`${BASE}/features/quick-tour`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
{
  const stepLink = page.getByRole("link", { name: /ポータルを開く/ });
  const box = await stepLink.boundingBox();
  check("STEP1遷移リンクが44px以上", !!box && box.height >= 44, `height=${box?.height}`);

  const ctaBox = await page.getByRole("link", { name: /機能一覧で詳しく見る/ }).boundingBox();
  check("下部CTA「機能一覧で詳しく見る」が44px以上", !!ctaBox && ctaBox.height >= 44, `height=${ctaBox?.height}`);
}

console.log("\n[/features/comparison] 下部CTAの44pxタップ標的");
await page.goto(`${BASE}/features/comparison`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
{
  const box = await page.getByRole("link", { name: /ご意見・改善提案を送る/ }).boundingBox();
  check("下部CTA「ご意見・改善提案を送る」が44px以上", !!box && box.height >= 44, `height=${box?.height}`);
}

console.log("\n[/features/print] 印刷ボタン・戻るリンクの44pxタップ標的");
await page.goto(`${BASE}/features/print`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
{
  const btnBox = await page.getByRole("button", { name: /印刷する/ }).boundingBox();
  check("印刷するボタンが44px以上", !!btnBox && btnBox.height >= 44, `height=${btnBox?.height}`);

  const backBox = await page.getByRole("link", { name: "通常表示に戻る" }).boundingBox();
  check("通常表示に戻るリンクが44px以上", !!backBox && backBox.height >= 44, `height=${backBox?.height}`);
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
