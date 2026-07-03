/**
 * 無読テスト: /foreign-workers系CTA44px是正 ＋ KY業種プリセット「危険：」色文法是正（柱0磨き・巡回発見・2026-07-04）
 *
 * ペルソナ: スマホで本文を読まず指でタップだけする初訪の安全担当（390×844）。
 * 背景: Exploreエージェントの巡回で発見した4件の是正:
 *   1. /foreign-workers 下部セクション「教材を作る →」CTAが44px未満（上部の同一導線とは非対称）。
 *   2. /foreign-workers/status/[status] 下部ナビ「多言語安全教育教材を見る」CTAが44px未満（全11ページに波及）。
 *   3. ky-industry-preset-picker.tsx「危険：」ラベルがtext-red-700直書き（SAFETY_TONE非経由、safety-tone.tsの色文法違反）。
 *      →text-rose-700（SAFETY_TONE.danger相当）へ是正。このコンポーネント自体は現状どこからもimportされていない
 *      未使用コンポーネントのため、実機描画チェックは対象外（コードレビューで確認済み）。
 *
 * 検証: 実boundingBoxが44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/foreign-workers-preset-picker-44px-color-2026-07-04.mjs
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

console.log("\n[/foreign-workers] 下部「教材を作る →」CTAの44px（スマホ390×844）");
await page.goto(`${BASE}/foreign-workers`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
const lowerCta = page.getByRole("link", { name: "教材を作る →" });
const lowerBox = await lowerCta.boundingBox();
check("下部CTA「教材を作る →」が44px以上", !!lowerBox && lowerBox.height >= 44, `height=${lowerBox?.height}`);

console.log("\n[/foreign-workers/status/[status]] 下部ナビCTAの44px（全11ページ抜き取り3ページ）");
const statuses = ["permanent-resident", "long-term-resident", "spouse-of-japanese"];
for (const status of statuses) {
  await page.goto(`${BASE}/foreign-workers/status/${status}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const navCta = page.getByRole("navigation").getByRole("link", { name: "多言語安全教育教材を見る" });
  const navBox = await navCta.boundingBox();
  check(`/foreign-workers/status/${status} 下部CTAが44px以上`, !!navBox && navBox.height >= 44, `height=${navBox?.height}`);
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
