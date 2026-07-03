/**
 * 無読テスト: /law-search AI要約モーダルのフォーカストラップ・初期フォーカス・
 * 閉じた際のフォーカス復帰を確認（2026-07-04）
 *
 * 背景: 自領域Explore調査で発見。AiSummaryModal（law-search-results.tsx）は
 * role="dialog"/aria-modal/Escape対応済みだったが、開いた際の初期フォーカス移動・
 * Tabキーでのフォーカストラップ・閉じた際の起動元ボタンへのフォーカス復帰が
 * いずれも欠落しており、キーボード/スクリーンリーダー利用者がモーダル背後の
 * 検索結果一覧やページリンクへTabで抜けられる・閉じた後フォーカスを見失う不具合があった。
 *
 * 是正: 開時に閉じるボタンへ初期フォーカス、Tab/Shift+Tabで最初/最後の
 * フォーカス可能要素間を循環、閉時に開く直前のフォーカス要素へ復帰。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/law-search-ai-summary-modal-focus-trap-noread-2026-07-04.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await ctx.newPage();
console.log("\n[/law-search] AI要約モーダル フォーカス管理");
await page.goto(`${BASE}/law-search?q=%E5%AE%89%E5%85%A8`, { waitUntil: "domcontentloaded" });

const summarizeButtons = page.getByRole("button", { name: "AI要約" });
await summarizeButtons.first().waitFor({ state: "visible", timeout: 10000 });
check("検索結果にAI要約ボタンが表示される", (await summarizeButtons.count()) > 0);

await summarizeButtons.first().focus();
await summarizeButtons.first().click();

const dialog = page.getByRole("dialog");
await dialog.waitFor({ state: "visible", timeout: 5000 });
const closeButton = page.getByRole("button", { name: "このダイアログを閉じる" });
const generateButton = page.getByRole("button", { name: "AI要約を生成する" });
await closeButton.waitFor({ state: "visible", timeout: 5000 });

check(
  "モーダルを開くと閉じるボタンへ初期フォーカスする",
  await closeButton.evaluate((el) => el === document.activeElement)
);

await generateButton.focus();
await page.keyboard.press("Tab");
check(
  "最後の要素からTabで最初の要素(閉じるボタン)へ循環する",
  await closeButton.evaluate((el) => el === document.activeElement)
);

await page.keyboard.press("Shift+Tab");
check(
  "最初の要素からShift+Tabで最後の要素(生成する)へ循環する",
  await generateButton.evaluate((el) => el === document.activeElement)
);

await page.keyboard.press("Escape");
await dialog.waitFor({ state: "hidden", timeout: 5000 });
check(
  "Escapeで閉じると起動元のAI要約ボタンへフォーカスが復帰する",
  await summarizeButtons.first().evaluate((el) => el === document.activeElement)
);

await ctx.close();
await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
