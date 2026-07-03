/**
 * サイネージ ヘッダーナビ・パネル副リンクの44pxタップ標的 無読テスト 2026-07-03
 *
 * ペルソナ: 休憩所の壁掛けTV/タブレットを操作する現場監督。
 * 検証対象:
 *   1) ヘッダーナビ5リンク（ポータルへ戻る/法改正一覧へ/KY用紙へ/記録キットへ/通知設定へ）が44px以上。
 *   2) リスク予測パネルの「詳細予測 →」が44px以上。
 *   3) 朝礼スクリプトモーダルの再生成/コピー/読み上げボタンが44px以上。
 *   4) 1画面フィットが崩れていないこと（不可侵条件）。
 * 「記録キット →」(現場の安全状態パネル)はこの端末にsite-records記録が無いと
 * 非表示のため対象外（className変更はsignage-nav-panel-links-44px.test.tsで検証済み）。
 *
 * 実行方法（dev はハングするため build+start の本番サーバーで実行する）:
 *   cd web && npm run build && npm run start   # 別ターミナル
 *   cp docs/third-party-reviews/scripts/signage-nav-panel-links-44px-2026-07-03.mjs web/tmp-noread.mjs
 *   cd web && node tmp-noread.mjs && rm tmp-noread.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${name}`);
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/signage`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-signage-conclusion]", { timeout: 20000 });
await page.waitForTimeout(2000);

console.log("\n■ ヘッダーナビ5リンクが44px以上");
{
  const links = await page
    .locator("header a", { hasText: /ポータルへ戻る|法改正一覧へ|KY用紙へ|記録キットへ|通知設定へ/ })
    .all();
  let allTall = links.length === 5;
  const heights = [];
  for (const l of links) {
    const bb = await l.boundingBox();
    heights.push(bb?.height ?? -1);
    if (!bb || bb.height < 44) allTall = false;
  }
  check(`ヘッダーナビ5リンクすべて44px以上`, allTall, `count=${links.length} heights=${JSON.stringify(heights)}`);
}

console.log("\n■ 1画面フィット維持（不可侵）");
{
  const fit = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  check(
    `1画面フィット維持 scrollHeight=${fit.scrollHeight} <= viewport=${fit.innerHeight}`,
    fit.scrollHeight <= fit.innerHeight + 1,
  );
}

console.log("\n■ リスク予測「詳細予測 →」が44px以上");
{
  const riskLink = page.locator("a", { hasText: "詳細予測 →" }).first();
  const riskBox = await riskLink.boundingBox();
  check(`詳細予測リンク44px以上 実測${riskBox?.height}`, !!riskBox && riskBox.height >= 44);
}

console.log("\n■ 朝礼スクリプトの再生成/コピー/読み上げボタンが44px以上");
{
  await page.locator("button", { hasText: "🎤 朝礼スクリプト" }).click();
  await page.waitForTimeout(300);
  const btns = await page.locator("button", { hasText: /^再生成$|^コピー$|^読み上げ$/ }).all();
  let allTall = btns.length === 3;
  const heights = [];
  for (const b of btns) {
    const bb = await b.boundingBox();
    heights.push(bb?.height ?? -1);
    if (!bb || bb.height < 44) allTall = false;
  }
  check(`朝礼スクリプトボタン3個すべて44px以上`, allTall, `count=${btns.length} heights=${JSON.stringify(heights)}`);
}

await ctx.close();
await browser.close();

console.log(`\n==== 無読テスト結果: ${pass} PASS / ${fail} FAIL ====`);
if (failures.length) {
  console.log("失敗項目:");
  for (const f of failures) console.log(` - ${f}`);
  process.exit(1);
}
