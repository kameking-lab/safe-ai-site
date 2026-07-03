// S1（打合せ用紙 直接操作UI・第三弾）無読チェック（/safety-diary?canvas=1 の用紙キャンバスβ）。
// 実行: cd web && (PORT=4214 npm run start &) ; node ../docs/third-party-reviews/scripts/meeting-canvas-phase3-contractors-2026-07-03.mjs
// 無読の問い: 各社マトリクスの1行（会社名/階層・作業内容・使用機械・リスク・安全衛生指示事項・
//   協力会社責任者・実績人員）をcanvas上でタップ編集でき、用紙（＝印刷と同一WYSIWYG）にすぐ反映されるか。
//   「＋元請/1次/2次/3次」ホットスポットで行を追加でき、追加した行の会社名欄がそのまま開くか（そのまま開く作法）。
//   印刷経路（editing無し）・クラシック表示との相互反映は不変か。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4214";

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

// (1) 1行目「業者名・階層」セルをタップ→階層選択＋会社名入力→用紙に反映。
const companyCell = page.getByRole("button", { name: "業者名・階層を入力" });
check("1行目の『業者名・階層』セルがタップ標的として見える", await companyCell.isVisible().catch(() => false));
await companyCell.click();
check("タップでエディタシートが開く", await sheet.isVisible().catch(() => false));
await sheet.getByLabel("階層").selectOption("1次");
await sheet.getByPlaceholder("業者名").fill("○○builders");
await page.waitForTimeout(150);
check("会社名の入力内容が用紙にすぐ反映される", await page.getByText("○○builders").first().isVisible().catch(() => false));

// (2) 「次の欄へ」で作業内容→使用機械→リスク→安全衛生指示事項→協力会社責任者→実績人員と辿れる（一筆書き）。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("『次の欄へ』で作業内容のエディタに進む", await sheet.getByText("作業内容").first().isVisible().catch(() => false));
await sheet.locator("textarea").first().fill("鉄骨建方、ボルト本締め");

await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で使用機械のエディタに進む", await sheet.getByText("使用機械").first().isVisible().catch(() => false));
await sheet.locator("input").first().fill("移動式クレーン");

// 第四弾で使用機械とリスクの間に必要資格/予定人員/予想災害が挿入されたため、それらを素通りしてリスクへ進む。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で必要資格のエディタに進む（第四弾で挿入）", await sheet.getByText("必要資格").first().isVisible().catch(() => false));

await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で予定人員のエディタに進む（第四弾で挿入）", await sheet.getByText("予定人員").first().isVisible().catch(() => false));

await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で予想災害のエディタに進む（第四弾で挿入）", await sheet.getByText("予想災害").first().isVisible().catch(() => false));

await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』でリスク（重大性・可能性）のエディタに進む", await sheet.getByText("リスク（重大性・可能性）").first().isVisible().catch(() => false));
await sheet.getByLabel("重大性").selectOption("3");
await sheet.getByLabel("可能性").selectOption("2");
check("優先度が重大性/可能性から自動計算されて表示される", await sheet.getByText(/Ⅲ|Ⅳ/).first().isVisible().catch(() => false));

await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で安全衛生指示事項のエディタに進む", await sheet.getByText("安全衛生指示事項").first().isVisible().catch(() => false));
await sheet.locator("textarea").first().fill("親綱使用・旋回範囲立入禁止");

await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で協力会社責任者のエディタに進む", await sheet.getByText("協力会社責任者").first().isVisible().catch(() => false));
await sheet.locator("input").first().fill("現場責任者A");

await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で実績人員のエディタに進む（1行目の最終部位）", await sheet.getByText("実績人員（当日）").first().isVisible().catch(() => false));
await sheet.locator("input").first().fill("5");
await sheet.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(200);

check("作業内容が用紙に反映", await page.getByText("鉄骨建方、ボルト本締め").first().isVisible().catch(() => false));
check("使用機械が用紙に反映", await page.getByText("移動式クレーン").first().isVisible().catch(() => false));
check("安全衛生指示事項が用紙に反映", await page.getByText("親綱使用・旋回範囲立入禁止").first().isVisible().catch(() => false));
check("協力会社責任者が用紙に反映", await page.getByText("現場責任者A").first().isVisible().catch(() => false));

// (3) 「＋1次」ホットスポットで行を追加→追加した行の会社名欄がそのまま開く（そのまま開く作法）。
const addRowButton = page.getByRole("button", { name: "＋1次" });
check("『＋1次』ホットスポットが見える", await addRowButton.isVisible().catch(() => false));
await addRowButton.click();
await page.waitForTimeout(200);
check("行追加後、新しい行の『業者名・階層』エディタがそのまま開く", await sheet.getByText("業者名・階層").first().isVisible().catch(() => false));
await sheet.getByPlaceholder("業者名").fill("△△工業");
await page.waitForTimeout(150);
check("追加した2行目の会社名が用紙に反映", await page.getByText("△△工業").first().isVisible().catch(() => false));
await sheet.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(200);

// 1行目の内容は追加後も保たれている（行追加が既存行を壊さない）。
check("1行目の会社名は行追加後も維持される", await page.getByText("○○builders").first().isVisible().catch(() => false));

// (4) 印刷経路（editing無し）は不変＝画面キャンバスと同じ入力内容が印刷用にも反映。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シート（非表示・print専用）にも1行目・2行目の入力内容が反映（WYSIWYG）",
  printText.includes("○○builders") && printText.includes("鉄骨建方") && printText.includes("△△工業")
);

// (5) クラシック表示にも同じ内容が反映（同一record共有）。
await page.getByRole("button", { name: "従来表示" }).click();
await page.waitForTimeout(300);
const companyValues = await page.locator('input[list="mtg-companies"]').evaluateAll((els) => els.map((el) => el.value));
check("クラシック表示にも1行目の会社名が反映（同一record共有）", companyValues.includes("○○builders"));
check("クラシック表示にも2行目の会社名が反映", companyValues.includes("△△工業"));

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
