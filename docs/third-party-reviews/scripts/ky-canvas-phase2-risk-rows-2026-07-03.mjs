// O10（KY用紙Phase2・第二弾）無読チェック（/ky/paper?canvas=1 の危険行＝動的行＋行追加ホットスポット＋可能性/重大性プルダウン）。
// 実行: cd web && (PORT=4212 npm run start &) ; node ../docs/third-party-reviews/scripts/ky-canvas-phase2-risk-rows-2026-07-03.mjs
// 無読の問い: 用紙キャンバス上で危険のポイント/対策をタップしてその場入力でき、可能性/重大性はプルダウンで選べるか。
//   「＋危険行を追加」で行を増やせ、増やした行もそのまま同じ作法でタップ入力できるか。用紙（印刷と同一WYSIWYG）に反映されるか。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4212";

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
await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());

await page.goto(`${BASE}/ky/paper?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// (1) 既定1行目の「危険のポイント」をタップ→入力→用紙に反映。
const hazardCell = page.getByRole("button", { name: "危険のポイント（1）を入力" });
check("既定1行目『危険のポイント』がタップ標的として見える", await hazardCell.isVisible().catch(() => false));
await hazardCell.click();
const sheet = page.getByTestId("field-editor-sheet");
check("タップでエディタシートが開く", await sheet.isVisible().catch(() => false));
await sheet.locator("textarea").fill("高所からの墜落");
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);

// (2) 「次の欄へ」で可能性・重大性(プルダウン)のエディタに進む。
check("『次の欄へ』で可能性・重大性のエディタに進む", await sheet.getByText("可能性・重大性（1）").isVisible().catch(() => false));
check("可能性はプルダウン(select)で選べる", await sheet.getByLabel("可能性").evaluate((el) => el.tagName).then((t) => t === "SELECT").catch(() => false));
check("重大性はプルダウン(select)で選べる", await sheet.getByLabel("重大性").evaluate((el) => el.tagName).then((t) => t === "SELECT").catch(() => false));
await sheet.getByLabel("可能性").selectOption("3");
await sheet.getByLabel("重大性").selectOption("3");
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);

// (3) さらに「次の欄へ」で対策のエディタに進み入力（1行目の次は2行目の危険欄＝完了ではなく次の欄へ）。
check("さらに『次の欄へ』で対策のエディタに進む", await sheet.getByText("対策（1）").isVisible().catch(() => false));
await sheet.locator("textarea").fill("親綱を使用し2丁掛けを徹底");
check("1行目の対策の次は2行目の危険欄へ（『完了』ではなく『次の欄へ』）", await sheet.getByRole("button", { name: /次の欄へ/ }).isVisible().catch(() => false));
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

check("危険のポイントが用紙に反映", await page.getByText("高所からの墜落").first().isVisible().catch(() => false));
check("対策が用紙に反映", await page.getByText("親綱を使用し2丁掛けを徹底").first().isVisible().catch(() => false));

// (4) 「＋危険行を追加」ホットスポット＝タップで6行目が増え、その危険欄がそのまま開く。
const addBtn = page.getByRole("button", { name: "＋ 危険行を追加" });
check("『＋危険行を追加』ホットスポットが見える", await addBtn.isVisible().catch(() => false));
await addBtn.click();
await page.waitForTimeout(200);
check("追加した6行目の危険欄エディタがそのまま開く（zoom-to-cellの先取り）", await sheet.getByText("危険のポイント（6）").isVisible().catch(() => false));
await sheet.locator("textarea").fill("重機付近の挟まれ");
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("追加行も同じ作法で可能性・重大性へ進める（動的行の記入順が壊れていない）", await sheet.getByText("可能性・重大性（6）").isVisible().catch(() => false));
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
check("追加した危険内容が用紙に反映", await page.getByText("重機付近の挟まれ").first().isVisible().catch(() => false));

// (5) 印刷経路（editing無し）は不変＝画面キャンバスと同じ入力内容がそのまま印刷用にも存在する。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シート（非表示・print専用）にも同じ入力内容が反映（WYSIWYG）",
  printText.includes("高所からの墜落") && printText.includes("親綱を使用し2丁掛けを徹底") && printText.includes("重機付近の挟まれ")
);
check("印刷シートには『＋危険行を追加』ボタンが出ない（editing無しでは装飾なし）", !printText.includes("危険行を追加"));

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
