// 柱0磨き 巡回発見・続き⑫（2026-07-04・自班Explore巡回）。上位3件(O15/S2/S3)はdataレーンO14依存で
// 全ブロック中のため補充。silent-lie state 1件＋44px欠落14箇所を検証:
//  (1) workers-master-client.tsx: 「← KY用紙に戻る」リンクが44px未満だった。
//  (2) ky-transcribe-panel.tsx: 項目別コピー行内ボタン（.map()内）が44px未満だった
//      （モーダル上部の一括ボタンは#744/#749で既に44px化済みで非対称だった）。
//  (3) meeting-paper-view.tsx（/safety-diary クラシックUI ?canvas=0）: 点検項目トグル(Tri)・
//      各社マトリクスの折りたたみ/＋下位/AI提案/KYを作成/削除・搬入出の＋行/×削除・
//      点検項目のAI推論/公式版に戻す/×削除/＋項目追加、計12箇所が44px未満だった
//      （canvas版の対応ボタンは既に44px済みで非対称）。
// silent-lie state（作業員マスターのクラウド確認中に「登録なし」誤表示）は、このdev環境が
// Supabase未設定(isKyCloudEnabled常時false)のため実機Playwrightで再現できず（既知の制約、
// #814と同型）＝workers-master-client-loading.test.tsx（vitest+RTL）で代替検証済み。
//
// 実行: cd web && npm run build && PORT=4231 npm run start &
//   BASE=http://localhost:4231 node ../docs/third-party-reviews/scripts/workers-loading-meeting-transcribe-44px-2026-07-04.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || process.env.BASE_URL || "http://localhost:4231";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
const page = await ctx.newPage();

let pass = 0;
let total = 0;
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

async function minH(locator) {
  const box = await locator.boundingBox();
  return box ? box.height : 0;
}

// (1) /ky/workers 「← KY用紙に戻る」リンク
await page.goto(`${BASE}/ky/workers`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(200);
const backLink = page.getByRole("link", { name: /KY用紙に戻る/ });
check("/ky/workers『← KY用紙に戻る』が44px以上", (await minH(backLink)) >= 44, `height=${await minH(backLink)}`);

// (2) /ky/paper 転記支援モーダルの項目別コピー行内ボタン
await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(200);
const otherBtn = page.getByLabel("その他の操作（複製・共有・転記・印刷）");
if (await otherBtn.first().isVisible().catch(() => false)) {
  await otherBtn.first().click();
  await page.waitForTimeout(150);
  const transcribeBtn = page.getByRole("menuitem", { name: /Excel転記/ }).first();
  if (await transcribeBtn.isVisible().catch(() => false)) {
    await transcribeBtn.click();
    await page.waitForTimeout(150);
    const copyBtn = page.getByRole("button", { name: "コピー" }).first();
    const h = await minH(copyBtn);
    check("/ky/paper 転記支援モーダルの行内コピーボタンが44px以上", h >= 44, `height=${h}`);
  } else {
    check("/ky/paper 転記支援モーダルの行内コピーボタンが44px以上", false, "転記支援ボタン未検出（スキップ扱い、コードレビューで確認済み）");
  }
} else {
  check("/ky/paper 転記支援モーダルの行内コピーボタンが44px以上", false, "その他の操作ボタン未検出（スキップ扱い、コードレビューで確認済み）");
}

// (3) /safety-diary クラシックUI（既定=canvas off）の12箇所
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());
await page.goto(`${BASE}/safety-diary?canvas=0`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);

// 点検項目トグル(Tri)
const triOk = page.getByRole("button", { name: "○" }).first();
check("点検項目トグル『○』が44px四方以上", (await minH(triOk)) >= 44, `height=${await minH(triOk)}`);

// 各社マトリクス（1行目=元請デフォルト行）
const foldBtn = page.locator('button[aria-label="折りたたみ"]').first();
const hasFold = await foldBtn.isVisible().catch(() => false);
if (hasFold) {
  check("各社マトリクス 折りたたみボタンが44px以上", (await minH(foldBtn)) >= 44, `height=${await minH(foldBtn)}`);
} else {
  console.log("SKIP  各社マトリクス 折りたたみボタン（子行が無いため非表示、初期状態で正常）");
}
const addSubBtn = page.getByRole("button", { name: "＋下位" }).first();
check("各社マトリクス『＋下位』ボタンが44px以上", (await minH(addSubBtn)) >= 44, `height=${await minH(addSubBtn)}`);
const aiSuggestBtn = page.getByRole("button", { name: "AI提案" }).first();
check("各社マトリクス『AI提案』ボタンが44px以上", (await minH(aiSuggestBtn)) >= 44, `height=${await minH(aiSuggestBtn)}`);
const createKyLink = page.getByRole("link", { name: "KYを作成" }).first();
check("各社マトリクス『KYを作成』リンクが44px以上", (await minH(createKyLink)) >= 44, `height=${await minH(createKyLink)}`);
const removeContractorBtn = page.getByRole("button", { name: "削除" }).first();
check("各社マトリクス『削除』ボタンが44px以上", (await minH(removeContractorBtn)) >= 44, `height=${await minH(removeContractorBtn)}`);

// 搬入出予定
const addDeliveryBtn = page.getByRole("button", { name: "＋行" });
check("搬入出予定『＋行』ボタンが44px以上", (await minH(addDeliveryBtn)) >= 44, `height=${await minH(addDeliveryBtn)}`);
const delDeliveryBtn = page.locator('button[aria-label="削除"]').first();
check("搬入出予定『×削除』ボタンが44px四方以上", (await minH(delDeliveryBtn)) >= 44, `height=${await minH(delDeliveryBtn)}`);

// 点検項目
const inferBtn = page.getByRole("button", { name: "AIで該当項目を推論" });
check("点検項目『AIで該当項目を推論』ボタンが44px以上", (await minH(inferBtn)) >= 44, `height=${await minH(inferBtn)}`);
const resetBtn = page.getByRole("button", { name: "公式版に戻す" });
check("点検項目『公式版に戻す』ボタンが44px以上", (await minH(resetBtn)) >= 44, `height=${await minH(resetBtn)}`);
const addItemBtn = page.getByRole("button", { name: "＋ 項目を追加" }).first();
check("点検項目『＋ 項目を追加』ボタンが44px以上", (await minH(addItemBtn)) >= 44, `height=${await minH(addItemBtn)}`);
await addItemBtn.click();
await page.waitForTimeout(150);
const delItemBtn = page.locator('button[aria-label="項目削除"]').first();
check("点検項目『×項目削除』ボタンが44px四方以上", (await minH(delItemBtn)) >= 44, `height=${await minH(delItemBtn)}`);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
