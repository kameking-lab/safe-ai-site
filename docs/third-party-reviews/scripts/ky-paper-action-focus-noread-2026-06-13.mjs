// 柱C-9・A1 KY用紙モバイルの操作集中 無読チェック（/ky/paper 下部アクションバー）。
// 実行: cd web && (PORT=3100 npm run start &) ; node ../docs/third-party-reviews/scripts/ky-paper-action-focus-noread-2026-06-13.mjs
// 無読の問い: 画面を3秒見て、職長が「主操作=保存」と即断でき、複製/共有/転記/印刷が同格で散らかっていないか。
// 確認点: (1)下部バーの主ボタンは「保存」1個＋「…」だけ (2)複製/共有/転記/印刷は初期表示で散らばっていない
//         (3)「…」を押すと その他の操作シートに 共有/Excel転記/印刷 が出る (4)Escapeで閉じる。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当（モバイルの操作集中を確認）
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

await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// (1) 主操作=保存（solid常設）が見えている。
const saveVisible = await page.getByRole("button", { name: "保存" }).isVisible().catch(() => false);
check("下部バーに主ボタン「保存」が見えている", saveVisible);

// (2) その他の操作「…」ボタンが見えている。
const moreBtn = page.getByRole("button", { name: /その他の操作/ });
const moreVisible = await moreBtn.isVisible().catch(() => false);
check("「…（その他の操作）」ボタンが見えている", moreVisible);

// (3) 複製/共有/転記/印刷は初期表示で散らかっていない（＝シートに退避済み）。
const printVisibleBefore = await page.getByRole("button", { name: "印刷 / PDF" }).isVisible().catch(() => false);
const shareVisibleBefore = await page.getByRole("button", { name: /別端末で共有/ }).isVisible().catch(() => false);
const excelVisibleBefore = await page.getByRole("button", { name: /Excel転記/ }).isVisible().catch(() => false);
check("初期表示で「印刷 / PDF」は散らかっていない", !printVisibleBefore);
check("初期表示で「別端末で共有」は散らかっていない", !shareVisibleBefore);
check("初期表示で「Excel転記」は散らかっていない", !excelVisibleBefore);

// (4) 「…」を押すと その他の操作シートが開き、退避した操作が出る。
await moreBtn.click();
await page.waitForTimeout(300);
const sheet = page.getByRole("menu", { name: "その他の操作" });
const sheetVisible = await sheet.isVisible().catch(() => false);
check("「…」で その他の操作シートが開く", sheetVisible);
const shareInSheet = await page.getByRole("menuitem", { name: /別端末で共有/ }).isVisible().catch(() => false);
const excelInSheet = await page.getByRole("menuitem", { name: /Excel転記/ }).isVisible().catch(() => false);
const printInSheet = await page.getByRole("menuitem", { name: /印刷 \/ PDF/ }).isVisible().catch(() => false);
const copyInSheet = await page.getByRole("menuitem", { name: /前回を複製/ }).isVisible().catch(() => false);
check("シートに「別端末で共有」がある", shareInSheet);
check("シートに「Excel転記」がある", excelInSheet);
check("シートに「印刷 / PDF」がある", printInSheet);
check("シートに「前回を複製」がある", copyInSheet);

// (5) Escape でシートが閉じる。
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
const sheetClosed = !(await sheet.isVisible().catch(() => false));
check("Escape でシートが閉じる", sheetClosed);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
