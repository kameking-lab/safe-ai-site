// S1（打合せ用紙 直接操作UI・第六弾）無読チェック（/safety-diary?canvas=1 の用紙キャンバスβ）。
// 実行: cd web && (PORT=4217 npm run start &) ; node ../docs/third-party-reviews/scripts/meeting-canvas-phase6-checklist-2026-07-03.mjs
// 無読の問い: 点検項目8カテゴリ（○=該当・実施/×=要是正/－=該当無のtri-state）をcanvas上でカテゴリ単位で
//   タップ編集でき、用紙（＝印刷と同一WYSIWYG）にすぐ反映されるか。記入順チェーンが統括安全責任者
//   コメントの次→点検項目1カテゴリ目→…→最終カテゴリの次で『完了』ボタン（真の最終欄）まで
//   辿れるか。印刷経路（editing無し）・クラシック表示との相互反映は不変か。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4217";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当
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

// 直近の下書きを消してまっさらな状態から始める（前回実行分の残留を避ける）。
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());

// キャンバス表示へ切替。既定で点検項目8カテゴリ（公式版）が存在する。
await page.goto(`${BASE}/safety-diary?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
check("キャンバス表示に直接遷移できる", await page.getByRole("button", { name: "従来表示" }).isVisible().catch(() => false));

const sheet = page.getByTestId("meeting-field-editor-sheet");

// (1) 「点検（一般事項）」セルをタップ→カテゴリ内5項目のtri-stateボタンが44px相当で見える。
const generalCell = page.getByRole("button", { name: "点検（一般事項）を入力" });
check("『点検（一般事項）』セルがタップ標的として見える", await generalCell.isVisible().catch(() => false));
await generalCell.click();
check("タップでエディタシートが開く", await sheet.isVisible().catch(() => false));
check("カテゴリ内の項目名（朝礼・KY実施）が一覧表示される", await sheet.getByText("朝礼・KY実施").first().isVisible().catch(() => false));

// (2) 1項目目を「○」に切替→用紙にすぐ反映。
const okButton = sheet.getByRole("button", { name: "朝礼・KY実施: 該当・実施" });
check("『○（該当・実施）』ボタンが44px四方以上のタップ標的", await okButton.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return r.width >= 44 && r.height >= 44;
}).catch(() => false));
await okButton.click();
await page.waitForTimeout(150);
check("『○』に切替後、用紙の該当項目マークが反映される", (await page.locator("text=朝礼・KY実施○").count()) > 0);

// (3) 2項目目を「×」に切替→用紙にすぐ反映。
await sheet.getByRole("button", { name: "新規入場者教育: 要是正" }).click();
await page.waitForTimeout(150);
check("『×』に切替後、用紙の該当項目マークが反映される", (await page.locator("text=新規入場者教育×").count()) > 0);

// (4) 記入順チェーン: 統括安全責任者コメント→点検（一般事項）はすでに通過済み。ここから最終カテゴリまで辿る。
await sheet.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(200);

const categoryLabelsInOrder = ["一般事項", "掘削", "機械", "クレーン", "足場", "電気", "公衆災害", "危険物"];
// 統括安全責任者コメントから記入順チェーンで最終カテゴリまで辿れるか確認。
const supervisorCell = page.getByRole("button", { name: "統括安全責任者コメントを入力" });
await supervisorCell.click();
await page.waitForTimeout(150);
for (const label of categoryLabelsInOrder) {
  await sheet.getByRole("button", { name: /次の欄へ/ }).click();
  await page.waitForTimeout(120);
  check(`記入順チェーンで『点検（${label}）』カテゴリを経由する`, await sheet.getByText(`点検（${label}）`, { exact: true }).first().isVisible().catch(() => false));
}
check("最終カテゴリ（危険物）は記入順の真の最終欄＝『次の欄へ』ではなく『完了』ボタン", await sheet.getByRole("button", { name: "完了" }).isVisible().catch(() => false));
await sheet.getByRole("button", { name: "完了" }).click();
await page.waitForTimeout(200);

// (5) 印刷経路（editing無し）は不変＝画面キャンバスと同じ点検結果が印刷用にも反映。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シート（非表示・print専用）にも点検項目の入力内容が反映（WYSIWYG）",
  printText.includes("朝礼・KY実施○") && printText.includes("新規入場者教育×")
);

// (6) クラシック表示にも同じ内容が反映（同一record共有）。
await page.getByRole("button", { name: "従来表示" }).click();
await page.waitForTimeout(300);
check(
  "クラシック表示にも点検項目の入力内容が反映（同一record共有）",
  await page.getByRole("button", { name: "○", exact: true }).first().isVisible().catch(() => false)
);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
