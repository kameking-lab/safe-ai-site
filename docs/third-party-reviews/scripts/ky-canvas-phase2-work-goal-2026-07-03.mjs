// O10（KY用紙Phase2・第一弾）無読チェック（/ky/paper?canvas=1 の用紙キャンバス）。
// 実行: cd web && (PORT=4211 npm run start &) ; node ../docs/third-party-reviews/scripts/ky-canvas-phase2-work-goal-2026-07-03.mjs
// 無読の問い: 用紙キャンバス上で「本日の作業内容」「4R目標(チーム行動目標/重点実施項目/指差呼称)」の欄をタップして
//   その場で入力でき、用紙（＝印刷と同一WYSIWYG）にすぐ反映されるか。承認ロック中はタップ不可か。
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
await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());

await page.goto(`${BASE}/ky/paper?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

check("キャンバスβバッジが見える＝canvasMode有効", await page.getByText("キャンバスβ").isVisible().catch(() => false));

// (1) 「本日の作業内容」セルをタップ→エディタが開く→入力→用紙に反映。
const workCell = page.getByRole("button", { name: "本日の作業内容を入力" });
check("『本日の作業内容』セルがタップ標的として見える", await workCell.isVisible().catch(() => false));
await workCell.click();
const sheet = page.getByTestId("field-editor-sheet");
check("タップでエディタシートが開く", await sheet.isVisible().catch(() => false));
const workArea = sheet.locator("textarea");
await workArea.fill("3F鉄骨建方 ボルト本締め");
await workArea.blur();
await page.waitForTimeout(200);
check(
  "入力内容が用紙（印刷と同一WYSIWYG）にすぐ反映される",
  // canvas上の用紙と print:hidden の印刷専用コピーの2箇所にヒットするため、
  // 表示順で先に来る画面キャンバス側(.first())の可視性を見る。
  await page.getByText("3F鉄骨建方 ボルト本締め").first().isVisible().catch(() => false)
);

// (2) 4R目標(チーム行動目標→重点実施項目→指差呼称)を辿れる。
// O10（続き・危険行対応）で workDetail の「次の欄へ」は危険行(risk.0.hazard)につながるよう
// 記入順（紙の上から下）を正しくしたため、ここでは目標欄を直接タップして開く（用紙上の実タップ標的を検証）。
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
await page.getByRole("button", { name: "チーム行動目標を入力" }).click();
check("『チーム行動目標』セルの直接タップでエディタが開く", await sheet.getByText("チーム行動目標").first().isVisible().catch(() => false));
await sheet.locator("textarea").fill("高所では必ず親綱に掛けてから移動しよう");
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で重点実施項目のエディタに進む", await sheet.getByText("重点実施項目").first().isVisible().catch(() => false));
await sheet.locator("textarea").fill("足場の手すり点検");
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で指差呼称のエディタに進む（最終欄）", await sheet.getByText("指差呼称（ヨシ！）").first().isVisible().catch(() => false));
check("最終欄は『次の欄へ』ではなく『完了』ボタン", await sheet.getByRole("button", { name: "完了" }).isVisible().catch(() => false));
await sheet.locator("input").fill("親綱 ヨシ！ 足元 ヨシ！");
await sheet.getByRole("button", { name: "完了" }).click();
await page.waitForTimeout(200);

check("チーム行動目標が用紙に反映", await page.getByText("高所では必ず親綱に掛けてから移動しよう").first().isVisible().catch(() => false));
check("重点実施項目が用紙に反映", await page.getByText("足場の手すり点検").first().isVisible().catch(() => false));
check("指差呼称が用紙に反映", await page.getByText("親綱 ヨシ！ 足元 ヨシ！").first().isVisible().catch(() => false));

// (3) 未記入セルは薄いハイライトで「タップして入力」と分かる（危険行など未対応の欄は対象外）。
const emptyHint = page.getByText("タップして入力").first();
check("未記入セルは『タップして入力』のヒントが出る", await emptyHint.isVisible().catch(() => false));

// (4) 印刷経路（editing無し）は不変＝画面キャンバスと同じ内容がそのまま印刷用にも存在する。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シート（非表示・print専用）にも同じ入力内容が反映（WYSIWYG）",
  printText.includes("3F鉄骨建方") && printText.includes("親綱 ヨシ！")
);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
