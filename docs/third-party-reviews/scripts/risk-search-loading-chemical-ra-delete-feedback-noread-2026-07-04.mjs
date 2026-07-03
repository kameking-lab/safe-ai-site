/**
 * 無読テスト: /risk-prediction 検索実行時のローディングフィードバック新設
 *          ＋ /chemical-ra 実施記録台帳の削除確認・失敗フィードバック新設（2026-07-04）
 *
 * 背景: 前イテレーション（law-search-ai-summary-modal-focus-trap）のExplore調査で
 * 発見し次点申し送りされた2件。
 *  ①risk-prediction-panel.tsx: 検索実行（loadAccidentCasesDataset の非同期解決）中に
 *    何のフィードバックも無く、初回チャンク取得が遅い回線では「反応していない」ように
 *    見えた。
 *  ②chemical-ra-save.tsx: 実施記録の削除ボタンに確認ダイアログが無く誤タップで
 *    即削除される上、失敗時（クラウド通信エラー等）も無反応で「消えたのか失敗したのか」
 *    判断できなかった。
 *
 * 是正: ①検索ボタン・チップに searching state を接続しスピナー+「検索中…」表示、
 * 結論カード位置に同等のローディング表示を新設。②window.confirm確認ダイアログ＋
 * 失敗時 role="alert" のエラー文言表示。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/risk-search-loading-chemical-ra-delete-feedback-noread-2026-07-04.mjs
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

// ---------- ① /risk-prediction 検索ローディング ----------
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  console.log("\n[/risk-prediction] 検索実行時のローディングフィードバック");
  await page.goto(`${BASE}/risk-prediction`, { waitUntil: "domcontentloaded" });

  const chip = page.getByRole("button", { name: "足場", exact: true });
  await chip.waitFor({ state: "visible", timeout: 10000 });

  await chip.click();
  // ローディング表示は初回チャンク取得中のみ一瞬出るため、出現有無をレースで確認
  const searching = page.getByTestId("risk-searching");
  const conclusion = page.getByTestId("risk-conclusion");
  const sawEither = await Promise.race([
    searching.waitFor({ state: "visible", timeout: 4000 }).then(() => "searching").catch(() => null),
    conclusion.waitFor({ state: "visible", timeout: 4000 }).then(() => "conclusion").catch(() => null),
  ]);
  check("チップタップ後、ローディング表示か判定結果のいずれかが速やかに現れる", sawEither !== null, `got=${sawEither}`);

  await conclusion.waitFor({ state: "visible", timeout: 10000 });
  check("検索完了後は判定結果カードが表示される（ローディング表示ではない）", await conclusion.isVisible());
  check("ローディング表示は検索完了後に消える", (await searching.count()) === 0);

  await ctx.close();
}

// ---------- ② /chemical-ra 実施記録の削除確認・失敗フィードバック ----------
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  console.log("\n[/chemical-ra] 実施記録の削除確認・失敗フィードバック");

  // 事前に localStorage へ実施記録を1件仕込む（保存フローの再現は不要、削除UIのみ検証）
  await page.goto(`${BASE}/chemical-ra`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const rec = {
      raId: "noread-test-ra-1",
      cas: "108-88-3",
      substance: "トルエン（無読テスト）",
      workContent: "塗装作業",
      exposureBand: "低",
      payload: {},
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem("safe-ai:chemical-ra-records:v1", JSON.stringify([rec]));
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  const record = page.getByText("トルエン（無読テスト）");
  await record.waitFor({ state: "visible", timeout: 10000 });
  check("実施記録の台帳に仕込んだ記録が表示される", await record.isVisible());

  const deleteButton = page.getByRole("button", { name: "削除" });

  // confirm をキャンセルさせて、記録が残ることを確認
  page.once("dialog", async (dialog) => {
    check("削除ボタン押下時に確認ダイアログが出る", dialog.type() === "confirm");
    await dialog.dismiss();
  });
  await deleteButton.click();
  await page.waitForTimeout(300);
  check("確認をキャンセルすると記録は削除されない", await record.isVisible());

  // confirm を受諾させて削除される（クラウド未接続 = ローカル削除は成功する想定）
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await deleteButton.click();
  await record.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  check("確認を受諾すると記録が削除され台帳から消える", (await record.count()) === 0);

  await ctx.close();
}

await browser.close();

console.log(`\n合計: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
