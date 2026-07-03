/**
 * 無読テスト: 巡回監査(Explore)で発見した残存44px未満2箇所を是正（柱0磨き・2026-07-03・PR#744/749/759系の続き）
 *
 * 対象1: /health-checkup-scheduler/result の主要CTA「PDFに出力 / 印刷」(PrintButton)
 *   ペルソナ: 判定結果を見て、その場で紙に出す/PDF保存したい安全担当・職長。
 * 対象2: /education-certification/finder のフィルタチップ（業種カテゴリ・作業内容タグ・
 *   クイック選択シナリオ）＋条件リセットボタン。
 *   ペルソナ: スマホで業種・作業内容をタップして必要資格を絞り込む安全担当・職長。
 *
 * 検証: 各操作系ボタンの実boundingBox高さが44px以上であること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/checkup-finder-44px-round3-2026-07-03.mjs
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

// 対象1: 健診スケジューラ判定結果の印刷/PDF出力ボタン
console.log("\n[/health-checkup-scheduler/result]");
await page.goto(`${BASE}/health-checkup-scheduler/result`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(200);
{
  const btn = page.getByRole("button", { name: "PDFに出力 / 印刷" });
  const box = await btn.boundingBox();
  check("「PDFに出力 / 印刷」が44px以上", !!box && box.height >= 44, `height=${box?.height}`);
}

// 対象2: 資格判定finderのフィルタチップ群
console.log("\n[/education-certification/finder]");
await page.goto(`${BASE}/education-certification/finder`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(200);

// カテゴリチップ(Step1)は最初から表示
{
  const chip = page.getByRole("button", { name: "建設業", exact: true }).first();
  const box = await chip.boundingBox();
  check("業種カテゴリチップ(建設業)が44px以上", !!box && box.height >= 44, `height=${box?.height}`);
}

// クイック選択シナリオチップ
{
  const scenarioChip = page.getByRole("button", { name: "高さ2m以上の高所作業（作業床なし）" });
  const box = await scenarioChip.boundingBox();
  check("クイック選択シナリオチップが44px以上", !!box && box.height >= 44, `height=${box?.height}`);
}

// カテゴリ選択→作業内容タグ→リセットボタンの出現を確認して測定
{
  await page.getByRole("button", { name: "建設業", exact: true }).first().click();
  await page.waitForTimeout(200);
  const resetBtn = page.getByRole("button", { name: "条件をリセット" });
  const resetVisible = await resetBtn.isVisible().catch(() => false);
  const box = resetVisible ? await resetBtn.boundingBox() : null;
  check("「リセット」ボタンが44px以上", resetVisible && !!box && box.height >= 44, `height=${box?.height}`);

  const workTagChip = page.getByText("Step 2: 作業内容を選択（複数可）").locator("~ div").first().getByRole("button").first();
  const workTagVisible = await workTagChip.isVisible().catch(() => false);
  const workTagBox = workTagVisible ? await workTagChip.boundingBox() : null;
  check("作業内容タグチップ(Step2)が44px以上", workTagVisible && !!workTagBox && workTagBox.height >= 44, `height=${workTagBox?.height}`);
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
