// S1（打合せ用紙 直接操作UI・第七弾）無読チェック（/safety-diary?canvas=1 の用紙キャンバスβ）。
// 実行: cd web && (PORT=4218 npm run start &) ; node ../docs/third-party-reviews/scripts/meeting-canvas-phase7-ai-suggest-2026-07-03.mjs
// 無読の問い: 作業内容欄のエディタ内にAI提案ボタンがあり、従来UI（クラシック表示）と同じ
//   /api/meeting/suggest で予想災害・安全衛生指示事項・必要資格・リスクをその行に直接自動入力できるか。
//   作業内容が空のままAI提案を押すと従来UIと同じ案内が出るか。印刷経路（editing無し）は不変か。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4218";

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

// Gemini未設定環境でも決定的に検証できるよう、AI提案APIをモック。
await page.route("**/api/meeting/suggest", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      source: "gemini",
      disasters: ["墜落・転落", "崩壊・倒壊"],
      instructions: "開口部養生・親綱設置を徹底すること",
      severity: 3,
      likelihood: 2,
    }),
  });
});

// 直近の下書きを消してまっさらな状態から始める（前回実行分の残留を避ける）。
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());

await page.goto(`${BASE}/safety-diary?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
check("キャンバス表示に直接遷移できる", await page.getByRole("button", { name: "従来表示" }).isVisible().catch(() => false));

const sheet = page.getByTestId("meeting-field-editor-sheet");

// (1) 作業内容が空のまま「作業内容」セルを開きAI提案を押すと、従来UIと同じ案内が通知バーに出る。
const workContentCell = page.getByRole("button", { name: "作業内容を入力" });
check("1行目の『作業内容』セルがタップ標的として見える", await workContentCell.isVisible().catch(() => false));
await workContentCell.click();
check("タップでエディタシートが開く", await sheet.isVisible().catch(() => false));
const aiBtn = sheet.getByRole("button", { name: /AI提案（予想災害/ });
check("作業内容のエディタ内にAI提案ボタンがある（従来UIのみだった機能のcanvas統合）", await aiBtn.isVisible().catch(() => false));
await aiBtn.click();
await page.waitForTimeout(200);
check(
  "作業内容が空のままAI提案を押すと通知バーで案内される（従来UIと同じ挙動）",
  await page.getByText("作業内容を入力してからAI提案を実行してください。").isVisible().catch(() => false)
);

// (2) 作業内容を記入してからAI提案を押すと、予想災害・指示・リスクがその行に直接反映される。
await sheet.locator("textarea").fill("3F鉄骨建方 ボルト本締め");
await page.waitForTimeout(150);
await aiBtn.click();
await page.waitForTimeout(300);
check(
  "AI（Gemini）提案の完了通知が表示される",
  await page.getByText("AI（Gemini）が提案しました。内容を必ず確認・修正してください。").isVisible().catch(() => false)
);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

check("提案された予想災害が用紙（画面キャンバス）に直接反映される", await page.getByText("墜落・転落").first().isVisible().catch(() => false));

// (3) 安全衛生指示事項欄を開くと、AI提案で入った内容がそのまま見える（同一行への直接反映を裏取り）。
const instructionsCell = page.getByRole("button", { name: "安全衛生指示事項を入力" });
await instructionsCell.click();
await sheet.waitFor({ state: "visible", timeout: 5000 });
check(
  "AI提案の安全衛生指示事項がその行のエディタに反映されている",
  (await sheet.locator("textarea").inputValue()) === "開口部養生・親綱設置を徹底すること"
);
await page.keyboard.press("Escape");
await page.waitForTimeout(150);

// (4) リスク（重大性・可能性）もAI提案の値に更新されている。
const riskCell = page.getByRole("button", { name: "リスク（重大性・可能性）を入力" }).first();
await riskCell.click();
await sheet.waitFor({ state: "visible", timeout: 5000 });
check("AI提案の重大性(3)がリスクエディタに反映されている", (await sheet.getByLabel("重大性").inputValue()) === "3");
check("AI提案の可能性(2)がリスクエディタに反映されている", (await sheet.getByLabel("可能性").inputValue()) === "2");
await page.keyboard.press("Escape");
await page.waitForTimeout(150);

// (5) 印刷経路（editing無し）は不変＝AI提案ボタンは印刷シートに一切出ない。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シートにAI提案ボタンは出ない（editing無しでは装飾なし）が提案内容は反映（WYSIWYG）",
  !printText.includes("AI提案") && printText.includes("墜落・転落")
);

// (6) クラシック表示にも同じ内容が反映（同一record共有）。
await page.getByRole("button", { name: "従来表示" }).click();
await page.waitForTimeout(300);
const classicText = await page.locator("main").innerText().catch(() => "");
check("クラシック表示にもAI提案の予想災害が反映（同一record共有）", classicText.includes("墜落・転落"));
// 安全衛生指示事項はtextarea要素のためinnerTextに含まれない（value属性はテキストノードではない）。
// inputValue()で直接値を確認する。
const classicTextareas = await page.locator("main textarea").all();
let instructionsFound = false;
for (const el of classicTextareas) {
  if ((await el.inputValue().catch(() => "")) === "開口部養生・親綱設置を徹底すること") {
    instructionsFound = true;
    break;
  }
}
check("クラシック表示にもAI提案の安全衛生指示事項が反映", instructionsFound);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
