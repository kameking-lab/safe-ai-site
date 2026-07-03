/**
 * 無読テスト: /court-cases 争点タグ色の一覧/詳細不整合是正（柱0補充・2026-07-04）
 *
 * ペルソナ: 本文を読まず色だけで判例カードを流し読みする初訪の一人親方（スマホ390×844）。
 * 背景: /court-cases（一覧）と/court-cases/[id]（詳細）で争点タグの配色マップが別々に
 *   ハードコードされ二重管理になっており、詳細側は16分類中9分類しか収録していなかった。
 *   一覧で色付き表示された争点(例:「解雇・雇止め」)が詳細ページを開くと未収載キーのため
 *   灰色フォールバックへ変色し、同じ争点なのに一覧と詳細で見た目が変わる不整合があった。
 *   共有モジュール(lib/court-cases/issue-color.ts)への一本化でこの不整合を解消。
 *
 * 検証: 一覧カードの争点タグ(span.rounded-full)のclassNameと、同じ判例の詳細ページの
 *   争点タグのclassNameが一致すること（灰色フォールバックに落ちていないこと）。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/court-cases-issue-color-consistency-2026-07-04.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };
const CASE_ID = "nihon-shoen-seizo";
const ISSUE = "解雇・雇止め";

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

console.log(`\n[/court-cases/${CASE_ID}] 争点タグ「${ISSUE}」の色（詳細ページ）`);
await page.goto(`${BASE}/court-cases/${CASE_ID}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);

const detailTag = page.locator("span.rounded-full", { hasText: ISSUE }).first();
const detailClass = await detailTag.getAttribute("class");
console.log(`  詳細ページ class: ${detailClass}`);

check("詳細ページの争点タグが灰色フォールバックに落ちていない", !detailClass?.includes("bg-slate-100"), detailClass ?? "");
check("詳細ページの争点タグが一覧と同じ配色(bg-red-100)", !!detailClass?.includes("bg-red-100"), detailClass ?? "");

console.log(`\n[/court-cases] 争点タグ「${ISSUE}」の色（一覧ページ、同一判例カード内）`);
await page.goto(`${BASE}/court-cases?issue=${encodeURIComponent(ISSUE)}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);

const listTag = page.locator("span.rounded-full", { hasText: ISSUE }).first();
const listClass = await listTag.getAttribute("class");
console.log(`  一覧ページ class: ${listClass}`);

check("一覧と詳細で同じ争点タグの配色クラスが一致する（配色マップの二重管理を解消）", listClass === detailClass, `list=${listClass} detail=${detailClass}`);

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
