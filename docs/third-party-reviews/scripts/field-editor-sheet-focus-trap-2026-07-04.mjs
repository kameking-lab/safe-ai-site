// 柱0磨き 巡回発見（2026-07-04・自班Explore巡回）。上位3件(O15/S2/S3)はdataレーンO14依存で
// 全ブロック中のため補充。KY用紙canvas（/ky/paper）・打合せ用紙canvas（/safety-diary?canvas=1）の
// フィールドエディタシートで、role="dialog"/aria-modal/Escapeは既存実装済みだが
// キーボード利用者がTabでシート外へ抜けられる・閉じた際にタップしたセルへフォーカスが
// 戻らない不具合を発見。law-search-results.tsx の AI要約モーダルで確立済みの同型パターン
// （previouslyFocusedの記憶＋Tabトラップ）を FieldEditorSheet/MeetingFieldEditorSheet に導入。
//
// 実行: cd web && npm run build && PORT=4232 npm run start &
//   BASE=http://localhost:4232 node ../docs/third-party-reviews/scripts/field-editor-sheet-focus-trap-2026-07-04.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || process.env.BASE_URL || "http://localhost:4232";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
const page = await ctx.newPage();

let pass = 0;
let total = 0;
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

// --- (1) /ky/paper（canvas既定表示）: 現場名セルをタップ→エディタ→Tabトラップ→Escapeで復帰 ---
await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(300);

const kyCell = page.getByRole("button", { name: "現場名を入力" });
await kyCell.click();
await page.waitForTimeout(150);

const kySheet = page.locator('[data-testid="field-editor-sheet"]');
check("KY: 現場名タップでシートが開く（role=dialog）", await kySheet.isVisible().catch(() => false));

const kyClose = kySheet.getByRole("button", { name: "閉じる" });
const kyNext = kySheet.getByRole("button", { name: "次の欄へ →" });
check("KY: 開いた直後は入力欄へ初期フォーカス", await page.evaluate(() => document.activeElement?.tagName) === "INPUT");

await kyNext.focus();
await page.keyboard.press("Tab");
check(
  "KY: 最後の要素からTabで最初（閉じる）へ循環する（フォーカストラップ）",
  await kyClose.evaluate((el) => el === document.activeElement)
);

await page.keyboard.press("Shift+Tab");
check(
  "KY: 最初の要素からShift+Tabで最後（次の欄へ）へ循環する",
  await kyNext.evaluate((el) => el === document.activeElement)
);

await page.keyboard.press("Escape");
await page.waitForTimeout(150);
check("KY: Escapeで閉じるとタップしたセルへフォーカスが復帰する", await kyCell.evaluate((el) => el === document.activeElement));

// --- (2) /safety-diary?canvas=1（打合せ用紙canvas）: 作業所名セルで同様に検証 ---
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());
await page.goto(`${BASE}/safety-diary?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);

const meetingCell = page.getByRole("button", { name: "作業所名を入力" });
await meetingCell.click();
await page.waitForTimeout(150);

const meetingSheet = page.locator('[data-testid="meeting-field-editor-sheet"]');
check("打合せ: 作業所名タップでシートが開く（role=dialog）", await meetingSheet.isVisible().catch(() => false));

const meetingClose = meetingSheet.getByRole("button", { name: "閉じる" });
const meetingNext = meetingSheet.getByRole("button", { name: "次の欄へ →" });

await meetingNext.focus();
await page.keyboard.press("Tab");
check(
  "打合せ: 最後の要素からTabで最初（閉じる）へ循環する（フォーカストラップ）",
  await meetingClose.evaluate((el) => el === document.activeElement)
);

await page.keyboard.press("Shift+Tab");
check(
  "打合せ: 最初の要素からShift+Tabで最後（次の欄へ）へ循環する",
  await meetingNext.evaluate((el) => el === document.activeElement)
);

await page.keyboard.press("Escape");
await page.waitForTimeout(150);
check(
  "打合せ: Escapeで閉じるとタップしたセルへフォーカスが復帰する",
  await meetingCell.evaluate((el) => el === document.activeElement)
);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
