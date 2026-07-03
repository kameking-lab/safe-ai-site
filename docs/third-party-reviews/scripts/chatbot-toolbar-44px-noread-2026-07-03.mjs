/**
 * 無読テスト: /chatbot ツールバー（履歴/音声/クリア/共有URL/エクスポート/履歴一覧）の44px化（柱0・2026-07-03）
 *
 * ペルソナ: 「段落を読まず、指でタップしか操作しない」現場の職長（スマホ390×844）。
 * 背景: チャット画面最上部のツールバー6ボタン（保存した会話/音声で会話する/履歴をクリア/
 *   共有URL/エクスポート）とエクスポートのドロップダウン項目・履歴セッション一覧の各行・
 *   削除アイコンがいずれも px-3 py-1.5 等（実測約28〜36px）で min-h-[44px] 指定が無く、
 *   チャット画面で最も頻繁に触る操作列にもかかわらず柱0のタップ標的基準を満たしていなかった。
 *
 * 検証:
 *   1) 「保存した会話」「音声で会話する」ボタンが常時44px以上
 *   2) 質問例をタップして履歴を作った後、「履歴をクリア」「共有URL」「エクスポート」ボタンが44px以上
 *   3) エクスポートを開くとドロップダウン項目（Markdown/テキスト/JSON/インポート）が全て44px以上
 *   4) 「保存した会話」を開いて保存後、履歴セッション行と削除アイコンが44px以上
 *   5) 寸法変更のみでボタンのクリック機能（送信・削除）は非退行
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node (webから) このスクリプト
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

console.log("\n[/chatbot] ツールバー 44px（スマホ390×844）");
await page.goto(`${BASE}/chatbot`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);

// ---------- 1) 常時表示ボタン ----------
const historyBtn = page.getByRole("button", { name: /保存済み会話を開く|保存した会話/ }).first();
const historyBox = await historyBtn.boundingBox();
check("「保存した会話」ボタンが44px以上", historyBox !== null && historyBox.height >= 44, `h=${historyBox?.height}`);

const voiceBtn = page.getByRole("button", { name: /音声で会話する/ }).first();
const voiceBox = await voiceBtn.boundingBox();
check("「音声で会話する」ボタンが44px以上", voiceBox !== null && voiceBox.height >= 44, `h=${voiceBox?.height}`);

// ---------- 2) 会話開始後のツールバー ----------
console.log("\n[hasMessages] 質問例タップ後のツールバー");
const exampleBtn = page.getByRole("button", { name: "足場の手すり高さは？" });
if ((await exampleBtn.count()) > 0) {
  await exampleBtn.first().click();
} else {
  await page.locator("textarea").fill("足場の手すり高さは？");
  await page.getByRole("button", { name: "送信", exact: true }).click();
}
await page.getByText("🗑 履歴をクリア").first().waitFor({ state: "visible", timeout: 60000 });
// セッション自動保存はアシスタント応答完了後に走るため、結論カード表示まで待つ
await page.locator('[aria-label="回答の結論"]').first().waitFor({ state: "visible", timeout: 60000 });
await page.waitForTimeout(500);

const clearBtn = page.getByRole("button", { name: /履歴をクリア/ }).first();
const clearBox = await clearBtn.boundingBox();
check("「履歴をクリア」ボタンが44px以上", clearBox !== null && clearBox.height >= 44, `h=${clearBox?.height}`);

const shareBtn = page.getByRole("button", { name: /共有URL/ }).first();
const shareBox = await shareBtn.boundingBox();
check("「共有URL」ボタンが44px以上", shareBox !== null && shareBox.height >= 44, `h=${shareBox?.height}`);

const exportBtn = page.getByRole("button", { name: /エクスポート/ }).first();
const exportBox = await exportBtn.boundingBox();
check("「エクスポート」ボタンが44px以上", exportBox !== null && exportBox.height >= 44, `h=${exportBox?.height}`);

// ---------- 3) エクスポートドロップダウン ----------
await exportBtn.click();
await page.waitForTimeout(200);
const mdItem = page.getByRole("button", { name: /Markdown/ }).first();
const mdBox = await mdItem.boundingBox();
check("ドロップダウン「Markdown」項目が44px以上", mdBox !== null && mdBox.height >= 44, `h=${mdBox?.height}`);
const txtItem = page.getByRole("button", { name: /テキスト/ }).first();
const txtBox = await txtItem.boundingBox();
check("ドロップダウン「テキスト」項目が44px以上", txtBox !== null && txtBox.height >= 44, `h=${txtBox?.height}`);
const jsonItem = page.getByRole("button", { name: /JSON \(\.json\)/ }).first();
const jsonBox = await jsonItem.boundingBox();
check("ドロップダウン「JSON」項目が44px以上", jsonBox !== null && jsonBox.height >= 44, `h=${jsonBox?.height}`);
const importItem = page.getByText("JSONをインポート").first();
const importBox = await importItem.boundingBox();
check("ドロップダウン「JSONをインポート」項目が44px以上", importBox !== null && importBox.height >= 44, `h=${importBox?.height}`);
await exportBtn.click(); // 閉じる

// ---------- 4) 履歴セッション一覧 ----------
console.log("\n[履歴一覧] セッション行・削除アイコン");
await historyBtn.click();
await page.waitForTimeout(300);
const sessionRow = page.locator("li button").first();
if ((await sessionRow.count()) > 0) {
  const rowBox = await sessionRow.boundingBox();
  check("履歴セッション行が44px以上", rowBox !== null && rowBox.height >= 44, `h=${rowBox?.height}`);
  const deleteIcon = sessionRow.locator('[aria-label="削除"]').first();
  const deleteBox = await deleteIcon.boundingBox();
  check(
    "削除アイコンが44×44px以上",
    deleteBox !== null && deleteBox.height >= 44 && deleteBox.width >= 44,
    `${deleteBox?.width}x${deleteBox?.height}`,
  );
} else {
  console.log("  (info) 保存済みセッションなし → 行寸法チェックはスキップ（新規保存が無い環境）");
}

// ---------- 5) 非退行: 削除機能 ----------
if ((await sessionRow.count()) > 0) {
  const before = await page.locator("li button").count();
  const deleteIcon = sessionRow.locator('[aria-label="削除"]').first();
  await deleteIcon.click();
  await page.waitForTimeout(200);
  const after = await page.locator("li button").count();
  check("削除アイコンをタップすると該当セッションが消える（非退行）", after === before - 1, `${before}→${after}`);
}

console.log("\n  無読まとめ: ツールバー全ボタン・ドロップダウン項目・履歴行/削除アイコンが44px以上 → 誤タップなく次の操作へ進める");
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
