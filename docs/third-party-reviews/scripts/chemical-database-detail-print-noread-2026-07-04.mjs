/**
 * 無読テスト: /chemical-database/[cas] 個票に印刷/PDF保存の出力手段を新設（2026-07-04）
 *
 * 背景: Explore調査で/chemical-database/[cas]（濃度基準値・GHS区分・関連法令を
 * 出典付きで表示する個票ページ）に印刷/PDF/コピー等の出力手段が皆無と判明。
 * 兄弟route（/accidents-reports系）は既存 ReportPrintButton + .accident-report-print-root
 * の印刷CSSを持つのに、chemical-databaseは「見つけた法令データを現場に持ち出す」導線が
 * 無かった（新規発見）。
 *
 * 是正: 既存 ReportPrintButton（accidents-reports所有・汎用実装）を再利用しh1脇に配置、
 * コンテンツを.accident-report-print-rootでラップ（既存のprint@media CSSを流用）、
 * ナビゲーションCTA（RAを開始/一覧に戻る）はprint:hiddenで印刷対象から除外。
 * 併せてReportPrintButton自体にmin-h-[44px]を追加（既存の3画面すべてに波及・柱0是正）。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/chemical-database-detail-print-noread-2026-07-04.mjs
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

{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  console.log("\n[/chemical-database/71-43-2] 印刷/PDF保存ボタン");

  await page.goto(`${BASE}/chemical-database/71-43-2`, { waitUntil: "domcontentloaded" });

  const printButton = page.getByRole("button", { name: /印刷.*PDF/ });
  await printButton.waitFor({ state: "visible", timeout: 10000 });
  check("印刷/PDF保存ボタンが可視", await printButton.isVisible());

  const box = await printButton.boundingBox();
  check("印刷ボタンが44px以上", (box?.height ?? 0) >= 44, `height=${box?.height}`);

  let printCalled = false;
  await page.exposeFunction("__noreadPrintHook", () => {
    printCalled = true;
  });
  await page.evaluate(() => {
    window.print = () => window.__noreadPrintHook();
  });
  await printButton.click();
  check("クリックでwindow.print()が呼ばれる", printCalled);

  const printRoot = page.locator(".accident-report-print-root");
  check("印刷対象ルート(.accident-report-print-root)が存在", (await printRoot.count()) > 0);

  const h1Count = await page.locator("h1").count();
  check("h1は1個のみ", h1Count === 1, `count=${h1Count}`);

  await ctx.close();
}

await browser.close();

console.log(`\n合計: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
