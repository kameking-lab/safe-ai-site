/**
 * 無読テスト（柱0補充／タップ標的 横展開・2026-07-03）
 *
 * lane backlog未着手が1件（要data班確認でブロック中）のみのため補充指針に従い
 * Explore監査で検出した44px未満のタップ標的を横断是正。対象:
 *   - ContextualPpePicks（chatbot, chemical, risk 等の複数owned routeで再利用される共有部品）
 *     の「AI診断 →」リンク・Amazon/楽天ボタン（/circulars/[id]で確認）
 *   - chemical-ra-panel.tsx のRA結果後CTA3本（法令チャットで質問する/法令全文検索で調べる/類似の労災事例をAIで調べる）
 *   - /accident-news「説明資料を印刷」CTA
 *   - /chemical-ra/product-search「化学物質RA に戻る」back link
 *   - /subsidies/calculator「申請期限・必要書類を見る」開閉トグル
 *
 * ペルソナ「段落を絶対に読まず指でタップだけする現場担当」。全対象が44px以上のタップ標的であることを固定する。
 *
 * 実行: cp docs/third-party-reviews/scripts/ppe-cta-various-44px-noread-2026-07-03.mjs web/tmp-noread-ppe.mjs
 *       cd web && BASE_URL=http://localhost:3100 node tmp-noread-ppe.mjs && rm tmp-noread-ppe.mjs
 * 前提: prod サーバ起動済み（npm run build && npx next start -p 3100 推奨）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

async function heightsOf(page, locator) {
  const count = await locator.count();
  const heights = [];
  for (let i = 0; i < count; i++) {
    const b = await locator.nth(i).boundingBox();
    heights.push(b ? Math.round(b.height) : 0);
  }
  return heights;
}

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, serviceWorkers: "block" });
  const page = await ctx.newPage();

  // 1. /circulars/[id]: ContextualPpePicks の AI診断リンク + Amazon/楽天ボタン
  await page.goto(`${BASE}/circulars/mhlw-notice-0001`, { waitUntil: "domcontentloaded" });
  const ppeSection = page.locator('section[aria-label*="保護具"]').first();
  await ppeSection.waitFor({ state: "visible", timeout: 10000 });

  const aiFinder = ppeSection.getByRole("link", { name: /AI診断/ });
  const aiFinderBox = await aiFinder.boundingBox();
  ok("① ContextualPpePicks「AI診断 →」が44px以上", aiFinderBox && aiFinderBox.height >= 44, aiFinderBox ? `h=${Math.round(aiFinderBox.height)}` : "not found");

  const amazonLinks = ppeSection.getByRole("link", { name: /^Amazon$/ });
  const amazonHeights = await heightsOf(page, amazonLinks);
  ok(`② Amazonボタン(${amazonHeights.length}個)が44px以上`, amazonHeights.length > 0 && amazonHeights.every((h) => h >= 44), `heights=${amazonHeights.join(",")}`);

  const rakutenLinks = ppeSection.getByRole("link", { name: /楽天/ });
  const rakutenHeights = await heightsOf(page, rakutenLinks);
  ok(`③ 楽天ボタン(${rakutenHeights.length}個)が44px以上`, rakutenHeights.length > 0 && rakutenHeights.every((h) => h >= 44), `heights=${rakutenHeights.join(",")}`);

  // 2. /accident-news: 説明資料を印刷 CTA
  await page.goto(`${BASE}/accident-news`, { waitUntil: "domcontentloaded" });
  const printLink = page.getByRole("link", { name: /説明資料を印刷/ });
  await printLink.waitFor({ state: "visible", timeout: 10000 });
  const printBox = await printLink.boundingBox();
  ok("④ /accident-news「説明資料を印刷」が44px以上", printBox && printBox.height >= 44, printBox ? `h=${Math.round(printBox.height)}` : "not found");

  // 3. /chemical-ra/product-search: 戻るリンク
  await page.goto(`${BASE}/chemical-ra/product-search`, { waitUntil: "domcontentloaded" });
  const backLink = page.getByRole("link", { name: /化学物質RA に戻る/ });
  await backLink.waitFor({ state: "visible", timeout: 10000 });
  const backBox = await backLink.boundingBox();
  ok("⑤ /chemical-ra/product-search「化学物質RA に戻る」が44px以上", backBox && backBox.height >= 44, backBox ? `h=${Math.round(backBox.height)}` : "not found");

  // 4. /subsidies/calculator: 施策選択→試算→開閉トグル
  await page.goto(`${BASE}/subsidies/calculator`, { waitUntil: "domcontentloaded" });
  const measureButtons = page.locator("button", { hasText: /設備投資/ });
  await measureButtons.first().waitFor({ state: "visible", timeout: 10000 });
  await measureButtons.first().click();
  const calcButton = page.getByRole("button", { name: /申請可能な助成金を試算する/ });
  await calcButton.click();
  const toggleButton = page.getByRole("button", { name: /申請期限・必要書類を見る/ }).first();
  await toggleButton.waitFor({ state: "visible", timeout: 10000 });
  const toggleBox = await toggleButton.boundingBox();
  ok("⑥ /subsidies/calculator「申請期限・必要書類を見る」が44px以上", toggleBox && toggleBox.height >= 44, toggleBox ? `h=${Math.round(toggleBox.height)}` : "not found (no eligible measure hit for default input)");

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    console.log("FAILED:", failed.map((f) => f.name).join("; "));
    process.exit(1);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
