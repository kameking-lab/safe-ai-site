/**
 * 無読テスト: /accidents トレンド要約＋/court-cases 検索・絞り込みフォームの44px是正（柱0補充・2026-07-04）
 *
 * ペルソナ: スマホで本文を読まず指でタップだけする初訪の一人親方（390×844）。
 * 背景: accident-trend-summary.tsx の集計期間セレクト・「AIで要約」ボタン(px-3/4 py-2+text-sm≈36〜40px)、
 *   court-cases-browser.tsx のキーワード検索欄・争点/分野/裁判所/年代の各セレクト(px-3 py-2+text-sm≈36〜40px)
 *   がいずれも44px未満だった既存欠陥。同ファイル内の他ボタン(絞り込みを解除・印刷リンク・分野アイコン等)は
 *   既に是正済みだったが、この検索・絞り込みフォーム本体は一括是正から漏れていた。
 *
 * 検証: 実boundingBoxがいずれも44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3111 npm run start
 *   BASE_URL=http://localhost:3111 node docs/third-party-reviews/scripts/accident-trend-court-cases-filter-44px-2026-07-04.mjs
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

console.log("\n[/accidents] トレンド要約: 集計期間セレクト・AIで要約ボタンの44pxタップ標的");
await page.goto(`${BASE}/accidents`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
{
  const selectBox = await page.getByLabel("集計期間").boundingBox();
  check("集計期間セレクトが44px以上", !!selectBox && selectBox.height >= 44, `height=${selectBox?.height}`);

  const btnBox = await page.getByRole("button", { name: /AIで要約/ }).boundingBox();
  check("AIで要約ボタンが44px以上", !!btnBox && btnBox.height >= 44, `height=${btnBox?.height}`);
}

console.log("\n[/court-cases] キーワード検索欄・争点/分野/裁判所/年代セレクトの44pxタップ標的");
await page.goto(`${BASE}/court-cases`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
{
  const searchInput = page.getByPlaceholder(/安全配慮義務、墜落、過労、石綿/);
  const wrapperBox = await searchInput.evaluateHandle((el) => el.parentElement).then((h) => h.asElement()?.boundingBox());
  check("キーワード検索欄(枠)が44px以上", !!wrapperBox && wrapperBox.height >= 44, `height=${wrapperBox?.height}`);

  for (const label of ["争点", "分野", "裁判所", "年代"]) {
    // <select>のaccessible nameはoption一覧を含むためprefix一致で取得。「分野」はaria-label付きの
    // 分野アイコングリッド(section)とも一致するため<select>要素との積集合で絞り込む。
    const box = await page.getByLabel(new RegExp(`^${label}`)).and(page.locator("select")).boundingBox();
    check(`${label}セレクトが44px以上`, !!box && box.height >= 44, `height=${box?.height}`);
  }
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
