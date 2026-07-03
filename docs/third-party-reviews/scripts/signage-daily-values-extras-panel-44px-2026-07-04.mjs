/**
 * 無読テスト: サイネージ常掲価値(無災害日数起点日フォーム)＋事故DB自社類似事故パネルの44px是正（柱0補充・2026-07-04）
 *
 * ペルソナ: スマホ/大型ディスプレイで本文を読まず指でタップだけする初訪の一人親方。
 * 背景: signage-daily-values.tsx の「起点日を変更」リンク(min-h-[24px])・起点日入力欄/保存ボタン
 *   (min-h-[36px])が既存の44px是正パターンから後退していた。accident-extras-panel.tsx の
 *   「/profile を開く →」「自社設定 →」「→ 類似事例…」の3リンクは一括是正の対象から漏れていた。
 *
 * 検証: 実boundingBoxがいずれも44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3122 npm run start
 *   BASE_URL=http://localhost:3122 node docs/third-party-reviews/scripts/signage-daily-values-extras-panel-44px-2026-07-04.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3122";

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

console.log("\n[/signage] 無災害日数タイル: 起点日を設定→変更フォームの44pxタップ標的");
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signage?kiosk=1`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const setBtn = page.getByRole("button", { name: "起点日を設定" });
  if (await setBtn.count()) {
    await setBtn.click();
    await page.waitForTimeout(200);
    const inputBox = await page.getByLabel("無災害日数の起点日").boundingBox();
    check("起点日入力欄が44px以上", !!inputBox && inputBox.height >= 44, `height=${inputBox?.height}`);
    const saveBox = await page.getByRole("button", { name: "保存" }).boundingBox();
    check("保存ボタンが44px以上", !!saveBox && saveBox.height >= 44, `height=${saveBox?.height}`);
    await page.getByRole("button", { name: "保存" }).click();
    await page.waitForTimeout(200);
    const changeBox = await page.getByRole("button", { name: "起点日を変更" }).boundingBox();
    check("起点日を変更リンクが44px以上", !!changeBox && changeBox.height >= 44, `height=${changeBox?.height}`);
  } else {
    check("起点日を設定ボタンが見つかる", false, "already configured on this run");
  }
  await ctx.close();
}

console.log("\n[/accidents] 自社類似事故Top5パネル: /profile を開く リンクの44pxタップ標的");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/accidents`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const link = page.getByRole("link", { name: "/profile を開く →" });
  if (await link.count()) {
    const box = await link.boundingBox();
    check("/profile を開く リンクが44px以上", !!box && box.height >= 44, `height=${box?.height}`);
  } else {
    check("/profile を開く リンクが見つかる", false);
  }
  await ctx.close();
}

await browser.close();

console.log(`\n合計: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
