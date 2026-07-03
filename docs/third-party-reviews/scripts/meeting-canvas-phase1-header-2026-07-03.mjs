// S1（打合せ用紙 直接操作UI・第一弾）無読チェック（/safety-diary?canvas=1 の用紙キャンバスβ）。
// 実行: cd web && (PORT=4211 npm run start &) ; node ../docs/third-party-reviews/scripts/meeting-canvas-phase1-header-2026-07-03.mjs
// 無読の問い: 用紙キャンバス上でヘッダー7欄（打合せ日/作業日/天気気温/作業所名/作業所長/主任等/作成担当者）を
//   タップしてその場で入力でき、用紙（＝印刷と同一WYSIWYG）にすぐ反映されるか。クラシック表示との往復は保てるか。
//   印刷経路（editing無し）は不変か。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4211";

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

// (0) 既定はクラシック表示のまま。トグルで opt-in。
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
check("既定表示はクラシック表示（キャンバス入口ボタンが見える）", await page.getByRole("button", { name: /キャンバス.?β/ }).isVisible().catch(() => false));
await page.getByRole("button", { name: /キャンバス.?β/ }).click();
await page.waitForTimeout(400);
check("トグルでキャンバス表示に切り替わる（従来表示ボタンが見える）", await page.getByRole("button", { name: "従来表示" }).isVisible().catch(() => false));
check("URLに ?canvas=1 が付く（共有/ブックマーク互換）", page.url().includes("canvas=1"));

// (1) 「作業所名」セルをタップ→エディタが開く→入力→用紙に反映。
const siteCell = page.getByRole("button", { name: "作業所名を入力" });
check("『作業所名』セルがタップ標的として見える", await siteCell.isVisible().catch(() => false));
await siteCell.click();
const sheet = page.getByTestId("meeting-field-editor-sheet");
check("タップでエディタシートが開く", await sheet.isVisible().catch(() => false));
await sheet.locator("input").first().fill("○○ビル新築工事");
await page.waitForTimeout(150);
check(
  "入力内容が用紙（印刷と同一WYSIWYG）にすぐ反映される",
  await page.getByText("○○ビル新築工事").first().isVisible().catch(() => false)
);

// (2) 「次の欄へ」で作業所長→主任等→作成担当者と辿れる。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("『次の欄へ』で作業所長のエディタに進む", await sheet.getByText("作業所長").first().isVisible().catch(() => false));
await sheet.locator("input").first().fill("山田太郎");
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で主任等のエディタに進む", await sheet.getByText("主任等").first().isVisible().catch(() => false));
await sheet.locator("input").first().fill("佐藤次郎");
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で作成担当者のエディタに進む（記入順の最終欄）", await sheet.getByText("作成担当者").first().isVisible().catch(() => false));
await sheet.locator("input").first().fill("鈴木三郎");
check("作成担当者は記入順の最終欄＝『次の欄へ』ではなく『完了』ボタン", await sheet.getByRole("button", { name: "完了" }).isVisible().catch(() => false));
await sheet.getByRole("button", { name: "完了" }).click();
await page.waitForTimeout(200);

check("作業所長が用紙に反映", await page.getByText("山田太郎").first().isVisible().catch(() => false));
check("主任等が用紙に反映", await page.getByText("佐藤次郎").first().isVisible().catch(() => false));
check("作成担当者が用紙に反映", await page.getByText("鈴木三郎").first().isVisible().catch(() => false));

// (3) 未記入セルは薄いハイライトで「タップして入力」と分かる（各社マトリクス等・未対応の欄は対象外）。
const emptyHint = page.getByText("タップして入力").first();
check("未記入セルは『タップして入力』のヒントが出る", await emptyHint.isVisible().catch(() => false));

// (4) 印刷経路（editing無し）は不変＝画面キャンバスと同じ入力内容が印刷用にも反映。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シート（非表示・print専用）にも同じ入力内容が反映（WYSIWYG）",
  printText.includes("○○ビル新築工事") && printText.includes("山田太郎")
);

// (5) クラシック表示へ戻ると canvas パラメータが消える（既定＝クラシック表示と一致するため明示不要）。
await page.getByRole("button", { name: "従来表示" }).click();
await page.waitForTimeout(300);
check("『従来表示』でクラシック表示に戻る（URLから canvas パラメータが消える）", !page.url().includes("canvas="));
const siteInput = page.locator('input[list="mtg-sites"]');
check("クラシック表示にも入力内容が反映（同一record共有）", (await siteInput.inputValue().catch(() => "")) === "○○ビル新築工事");

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
