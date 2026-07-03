// 柱0磨き 巡回発見＝ site-records 8画面の保存フィードバックが「保存できた/できなかった」の
// 実際の状態と無関係な固定色で表示されていた色文法違反（safety-tone.tsの赤=危険/緑=良好に反する）。
// エラー時=danger(赤/rose)・成功時=safe(緑/emerald)を動的に出し分けるよう是正。
// 対象: induction / qualifications / patrol / incident-report / procedure / near-miss
//   （inspection・committeeはエラー分岐が無いため固定safeトークン化のみ）
// 実行: cd web && npm run build && PORT=3100 npm run start
//   BASE_URL=http://localhost:3100 node ../docs/third-party-reviews/scripts/site-records-save-feedback-color-grammar-2026-07-04.mjs
//
// ペルソナ: 受入教育担当・資格台帳担当・パトロール実施者・労災報告作成者・作業手順書作成者・ヒヤリハット報告者。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE_URL ?? process.env.BASE ?? "http://localhost:3100";
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

async function checkStatus(page, { expectSubstr, expectTone, notTone }) {
  // ConclusionCardも role="status" (section) を持つため、savedNote用のspanに絞る。
  const status = page.locator('span[role="status"]').first();
  const text = await status.textContent().catch(() => null);
  check(`「${expectSubstr}」を含むメッセージが表示される`, !!text && text.includes(expectSubstr), `text=${text}`);
  const cls = await status.getAttribute("class").catch(() => "");
  check(`メッセージが${expectTone}系クラス`, !!cls && cls.includes(`text-${expectTone}`), `class=${cls}`);
  if (notTone) {
    check(`メッセージが${notTone}に固定されていない`, !cls || !cls.includes(`text-${notTone}`), `class=${cls}`);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });

// ── /site-records/induction: 氏名未入力エラー=赤 → 保存=緑 ─────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/induction`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/induction]");
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "氏名を入力", expectTone: "rose", notTone: "emerald" });
  await page.getByPlaceholder("例: 新人 太郎").fill("巡回 花子");
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "保存しました", expectTone: "emerald" });
  await page.close();
}

// ── /site-records/qualifications: 氏名未入力エラー=赤 → 保存=緑 ────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/qualifications`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/qualifications]");
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "氏名を入力", expectTone: "rose", notTone: "emerald" });
  await page.getByPlaceholder("例: 作業 太郎").fill("巡回 次郎");
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "保存しました", expectTone: "emerald" });
  await page.close();
}

// ── /site-records/patrol: CSV出力エラー=赤 → 保存=緑 ───────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/patrol`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/patrol]");
  await page.getByRole("button", { name: "CSV" }).first().click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "CSV出力する指摘事項がありません", expectTone: "rose", notTone: "emerald" });
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "保存しました", expectTone: "emerald", notTone: "rose" });
  await page.close();
}

// ── /site-records/incident-report: 必須未入力エラー=赤 → 保存=緑 ───
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/incident-report`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/incident-report]");
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "入力してください", expectTone: "rose" });
  await page.getByPlaceholder("例: ○○ ○○").fill("被災 太郎");
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "保存しました", expectTone: "emerald", notTone: "rose" });
  await page.close();
}

// ── /site-records/procedure: 作業名未入力エラー=赤 → 保存=緑（元は非トークンblue） ─
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/procedure`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/procedure]");
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "作業名を入力", expectTone: "rose", notTone: "blue" });
  await page.getByPlaceholder("例: 移動式クレーンによる鉄骨建方").fill("足場組立作業");
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "保存しました", expectTone: "emerald", notTone: "blue" });
  await page.close();
}

// ── /site-records/near-miss: 状況未入力エラー=赤 → 登録=緑 ─────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/near-miss`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/near-miss]");
  await page.getByRole("button", { name: "報告を登録" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "状況」を入力", expectTone: "rose", notTone: "amber" });
  const textareas = page.locator("textarea");
  await textareas.first().fill("足場付近で資材が落下しそうになった");
  await page.getByRole("button", { name: "報告を登録" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "登録しました", expectTone: "emerald", notTone: "amber" });
  await page.close();
}

// ── /site-records/inspection: 保存メッセージが緑トークン(元は非トークンblue) ─
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/inspection`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/inspection]");
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "保存しました", expectTone: "emerald", notTone: "blue" });
  await page.close();
}

// ── /site-records/committee: 保存メッセージが緑トークン(元は非トークンindigo) ─
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/committee`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/committee]");
  await page.getByRole("button", { name: "この端末に保存" }).click();
  await page.waitForTimeout(200);
  await checkStatus(page, { expectSubstr: "保存しました", expectTone: "emerald", notTone: "indigo" });
  await page.close();
}

await browser.close();

console.log(`\n合計: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
