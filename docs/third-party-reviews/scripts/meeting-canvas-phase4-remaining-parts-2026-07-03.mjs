// S1（打合せ用紙 直接操作UI・第四弾）無読チェック（/safety-diary?canvas=1 の用紙キャンバスβ）。
// 実行: cd web && (PORT=4215 npm run start &) ; node ../docs/third-party-reviews/scripts/meeting-canvas-phase4-remaining-parts-2026-07-03.mjs
// 無読の問い: 各社マトリクス残り3部位（必要資格＝タグ選択・予定人員＝固定プルダウン・予想災害＝
//   タグ選択）をcanvas上でタップ編集でき、用紙（＝印刷と同一WYSIWYG）にすぐ反映されるか。
//   記入順チェーンが使用機械→必要資格→予定人員→予想災害→リスクの順で辿れるか。
//   印刷経路（editing無し）・クラシック表示との相互反映は不変か。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4215";

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

// キャンバス表示へ切替。既定の1行目（元請）が最初から存在する。
await page.goto(`${BASE}/safety-diary?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
check("キャンバス表示に直接遷移できる", await page.getByRole("button", { name: "従来表示" }).isVisible().catch(() => false));

const sheet = page.getByTestId("meeting-field-editor-sheet");

// (1) 「必要資格」セルをタップ→タグを2件追加→用紙に反映。
const qualCell = page.getByRole("button", { name: "必要資格を入力" });
check("1行目の『必要資格』セルがタップ標的として見える", await qualCell.isVisible().catch(() => false));
await qualCell.click();
check("タップでエディタシートが開く", await sheet.isVisible().catch(() => false));
const qualInput = sheet.getByLabel("追加");
await qualInput.fill("玉掛け技能講習");
await qualInput.press("Enter");
await qualInput.fill("フルハーネス特別教育");
await qualInput.press("Enter");
await page.waitForTimeout(150);
check("追加した資格タグ1件目が用紙にすぐ反映される", await page.getByText("玉掛け技能講習").first().isVisible().catch(() => false));
check("追加した資格タグ2件目が用紙にすぐ反映される", await page.getByText("フルハーネス特別教育").first().isVisible().catch(() => false));

// (2) 「次の欄へ」で予定人員（固定プルダウン）に進む。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("『次の欄へ』で予定人員のエディタに進む", await sheet.getByText("予定人員").first().isVisible().catch(() => false));
await sheet.getByLabel("予定人員").selectOption("8");
await page.waitForTimeout(150);
check("選択した予定人員(8)が用紙にすぐ反映される", await page.getByText("8", { exact: true }).first().isVisible().catch(() => false));

// (3) 「次の欄へ」で予想災害（タグ選択）に進む。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で予想災害のエディタに進む", await sheet.getByText("予想災害").first().isVisible().catch(() => false));
const disasterInput = sheet.getByLabel("追加");
await disasterInput.fill("墜落・転落");
await disasterInput.press("Enter");
await page.waitForTimeout(150);
check("追加した予想災害タグが用紙にすぐ反映される", await page.getByText("墜落・転落").first().isVisible().catch(() => false));

// (4) さらに「次の欄へ」でリスク（重大性・可能性）に進む＝記入順チェーンが繋がっている。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』でリスク（重大性・可能性）のエディタに進み記入順チェーンが繋がる", await sheet.getByText("リスク（重大性・可能性）").first().isVisible().catch(() => false));
await sheet.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(200);

// (5) タグの解除（削除ボタン）も反映される。
await qualCell.click();
await page.waitForTimeout(150);
await sheet.getByRole("button", { name: "削除" }).first().click();
await page.waitForTimeout(150);
check("資格タグの削除ボタンで1件外せる", (await sheet.getByText("玉掛け技能講習").count()) === 0);
await sheet.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(200);

// (6) 印刷経路（editing無し）は不変＝画面キャンバスと同じ入力内容が印刷用にも反映。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シート（非表示・print専用）にも資格タグ・予定人員・予想災害の入力内容が反映（WYSIWYG）",
  printText.includes("フルハーネス特別教育") && printText.includes("墜落・転落") && printText.includes("8")
);

// (7) クラシック表示にも同じ内容が反映（同一record共有）。
await page.getByRole("button", { name: "従来表示" }).click();
await page.waitForTimeout(300);
const classicText = await page.locator("main").innerText().catch(() => "");
check("クラシック表示にも資格タグが反映（同一record共有）", classicText.includes("フルハーネス特別教育"));
check("クラシック表示にも予想災害タグが反映", classicText.includes("墜落・転落"));

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
