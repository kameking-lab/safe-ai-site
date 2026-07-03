// S1（打合せ用紙 直接操作UI・第五弾）無読チェック（/safety-diary?canvas=1 の用紙キャンバスβ）。
// 実行: cd web && (PORT=4216 npm run start &) ; node ../docs/third-party-reviews/scripts/meeting-canvas-phase5-deliveries-2026-07-03.mjs
// 無読の問い: 搬入出予定（動的行・物/時刻/場所の3部位）をcanvas上でタップ編集でき、用紙（＝印刷と
//   同一WYSIWYG）にすぐ反映されるか。記入順チェーンがその他(free)→1行目item→time→place→
//   統括安全責任者コメントの順で辿れるか。「＋搬入出行を追加」で行が増えその物欄がそのまま開くか。
//   印刷経路（editing無し）・クラシック表示との相互反映は不変か。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4216";

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

// キャンバス表示へ切替。既定の搬入出1行目が最初から存在する。
await page.goto(`${BASE}/safety-diary?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
check("キャンバス表示に直接遷移できる", await page.getByRole("button", { name: "従来表示" }).isVisible().catch(() => false));

const sheet = page.getByTestId("meeting-field-editor-sheet");

// (1) 1行目「搬入出（物）」セルをタップ→入力→用紙に反映。
const itemCell = page.getByRole("button", { name: "搬入出（物）を入力" }).first();
check("1行目の『搬入出（物）』セルがタップ標的として見える", await itemCell.isVisible().catch(() => false));
await itemCell.click();
check("タップでエディタシートが開く", await sheet.isVisible().catch(() => false));
await sheet.locator("input").first().fill("生コン");
await page.waitForTimeout(150);
check("入力した『物』が用紙にすぐ反映される", await page.getByText("生コン").first().isVisible().catch(() => false));

// (2) 「次の欄へ」で時刻に進む。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("『次の欄へ』で時刻のエディタに進む（記入順チェーン）", await sheet.getByText("時刻", { exact: true }).first().isVisible().catch(() => false));
await sheet.locator("input").first().fill("9:00");
await page.waitForTimeout(150);
check("入力した『時刻』が用紙にすぐ反映される", await page.getByText("9:00").first().isVisible().catch(() => false));

// (3) 「次の欄へ」で場所に進む。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で場所のエディタに進む", await sheet.getByText("場所", { exact: true }).first().isVisible().catch(() => false));
await sheet.locator("input").first().fill("東側ゲート");
await page.waitForTimeout(150);
check("入力した『場所』が用紙にすぐ反映される", await page.getByText("東側ゲート").first().isVisible().catch(() => false));

// (4) さらに「次の欄へ」で統括安全責任者コメントに進む＝行末で記入順チェーンが本線に復帰する。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check(
  "1行のみの搬入出末尾から『次の欄へ』で統括安全責任者コメントへ復帰する",
  await sheet.getByText("統括安全責任者コメント").first().isVisible().catch(() => false)
);
await sheet.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(200);

// (5) 「＋搬入出行を追加」ホットスポット＝タップで新しい行が増え、その『物』欄がそのまま開く。
await page.getByRole("button", { name: "＋搬入出行を追加" }).click();
await page.waitForTimeout(200);
check("行追加後、新しい行の『搬入出（物）』エディタがそのまま開く", await sheet.isVisible().catch(() => false));
await sheet.locator("input").first().fill("鉄筋");
await page.waitForTimeout(150);
check("追加した2行目『物』が用紙にすぐ反映される", await page.getByText("鉄筋").first().isVisible().catch(() => false));
await sheet.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(200);
check("2行分の『搬入出（物）』タップ標的が用紙に存在する", (await page.getByRole("button", { name: "搬入出（物）を入力" }).count()) === 2);

// (6) 印刷経路（editing無し）は不変＝画面キャンバスと同じ入力内容が印刷用にも反映。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シート（非表示・print専用）にも搬入出の入力内容が反映（WYSIWYG）",
  printText.includes("生コン") && printText.includes("9:00") && printText.includes("東側ゲート") && printText.includes("鉄筋")
);

// (7) クラシック表示にも同じ内容が反映（同一record共有）。
await page.getByRole("button", { name: "従来表示" }).click();
await page.waitForTimeout(300);
const classicItemInputs = page.getByPlaceholder("物");
check("クラシック表示にも搬入出『物』が反映（同一record共有）", (await classicItemInputs.first().inputValue()) === "生コン");
check("クラシック表示の搬入出行数も2行に一致", (await classicItemInputs.count()) === 2);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
