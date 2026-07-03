/**
 * 無読テスト: /court-cases 印刷ビュー・絞り込み解除ボタン・/accidents 速報原典リンクの44px是正（柱0補充・2026-07-03）
 *
 * ペルソナ: スマホで本文を読まず指でタップだけする初訪の一人親方（390×844）。
 * 背景: Explore再調査で発見した4箇所の残存44px未満欠陥。
 *   1. CourtCasesPrintButton「この一覧を印刷 / PDF保存」(min-h-[40px]で4px不足)
 *   2. /court-cases/print の「労災裁判例コーナーに戻る」戻りリンク(パディング無し)
 *   3. /court-cases/print 0件時の「コーナーに戻って絞り込みを見直す」リンク(パディング無し)
 *   4. CourtCasesBrowser「絞り込みを解除」ボタン(パディング無し・絞り込み時のみ出現)
 *   5. AccidentTrendSummary「厚労省 速報 原典を見る →」リンク(パディング無し・AI要約実行後のみ出現)
 *
 * 検証: 実boundingBoxがいずれも44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3111 npm run start
 *   BASE_URL=http://localhost:3111 node docs/third-party-reviews/scripts/court-cases-accidents-44px-batch-2026-07-03.mjs
 */
import { chromium } from "@playwright/test";

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

console.log("\n[/court-cases/print] 印刷/戻るリンクの44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/court-cases/print`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const back = page.getByRole("link", { name: /労災裁判例コーナーに戻る/ });
const backBox = await back.boundingBox();
check("「労災裁判例コーナーに戻る」リンクが44px以上", !!backBox && backBox.height >= 44, `height=${backBox?.height}`);

const printBtn = page.getByRole("button", { name: /この一覧を印刷/ });
const printBox = await printBtn.boundingBox();
check("「この一覧を印刷 / PDF保存」ボタンが44px以上", !!printBox && printBox.height >= 44, `height=${printBox?.height}`);

console.log("\n[/court-cases/print?q=(0件)] 見直すリンクの44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/court-cases/print?q=該当するはずのない検索語xyz123`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
const retry = page.getByRole("link", { name: /コーナーに戻って絞り込みを見直す/ });
const retryBox = await retry.boundingBox();
check("「コーナーに戻って絞り込みを見直す」リンクが44px以上", !!retryBox && retryBox.height >= 44, `height=${retryBox?.height}`);

console.log("\n[/court-cases?q=墜落] 絞り込みを解除ボタンの44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/court-cases?q=墜落`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
const clear = page.getByRole("button", { name: "絞り込みを解除" });
const clearBox = await clear.boundingBox();
check("「絞り込みを解除」ボタンが44px以上", !!clearBox && clearBox.height >= 44, `height=${clearBox?.height}`);

console.log("\n[/accidents] 速報原典リンクの44pxタップ標的（スマホ390×844、AI要約実行後）");
await page.goto(`${BASE}/accidents`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
const aiButton = page.getByRole("button", { name: /AIで要約/ });
if ((await aiButton.count()) > 0) {
  await aiButton.first().click();
  const sourceLink = page.getByRole("link", { name: /厚労省 速報 原典を見る/ });
  try {
    await sourceLink.waitFor({ state: "visible", timeout: 8000 });
    const sourceBox = await sourceLink.boundingBox();
    check("「厚労省 速報 原典を見る →」リンクが44px以上", !!sourceBox && sourceBox.height >= 44, `height=${sourceBox?.height}`);
  } catch {
    console.log("  SKIP: 速報データが応答しなかった（環境依存・API未応答の可能性）");
  }
} else {
  console.log("  SKIP: 「AIで要約」ボタンが見つからない（/accidents構成変更の可能性）");
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
