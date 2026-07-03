/**
 * 無読テスト（柱0外バグ是正・機能UX班-B・2026-07-04）
 *
 * 対象: /chemical-ra 下部「現場の化学物質リスト（端末内に保存）」(ChemicalRaExtras)。
 * 是正前は saveSiteList() が localStorage.setItem を無保護で呼んでおり、
 * プライベートブラウジング/ストレージ容量超過等で書き込みが失敗すると
 * 追加ボタンのクリックハンドラ内で未捕捉例外が発生しうる状態だった
 * （同一パターンの chatbot-panel.tsx saveSessions は try/catchで保護済みという
 * 既存実装との不整合）。是正後は同じ「ignore storage errors」パターンで保護し、
 * 書き込み失敗時もクラッシュせず追加操作自体は完了することを実機(prod 3100)で固定する。
 *
 * 判定:
 *   1) h1=1（多重h1なし）
 *   2) 通常時: 物質名を入力して追加するとリストに表示される
 *   3) 削除ボタンでリストから消える
 *
 * 実行: BASE_URL=http://localhost:3100 node <このファイル>
 *   （@playwright/test 解決のため web/ ディレクトリから実行すること）
 *   ※ localStorage.setItem throw 時の非クラッシュはコンポーネントテスト
 *     （chemical-ra-extras.test.tsx）側で確認済み。ブラウザ実機側では
 *     プライベートブラウジング等の再現が困難なため通常系のみ固定する。
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3100";

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();
  let pass = 0;
  let fail = 0;
  const check = (cond, msg) => {
    if (cond) {
      pass += 1;
      console.log(`PASS ${msg}`);
    } else {
      fail += 1;
      console.log(`FAIL ${msg}`);
    }
  };

  await page.goto(`${BASE}/chemical-ra`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(1000);

  const h1Count = await page.locator("h1").count();
  check(h1Count === 1, `h1=1（実測${h1Count}）`);

  await page.getByPlaceholder("物質名").fill("無読テスト用物質A");
  await page.getByRole("button", { name: "追加" }).click();
  await page.waitForTimeout(500);

  const addedCount = await page.getByText("無読テスト用物質A").count();
  check(addedCount > 0, "追加した物質名がリストに表示される");

  await page.getByRole("button", { name: "無読テスト用物質Aを削除" }).click();
  await page.waitForTimeout(500);

  const removedCount = await page.getByText("無読テスト用物質A").count();
  check(removedCount === 0, "削除後はリストから消える");

  await browser.close();
  console.log(`\nDone: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
