/**
 * 無読テスト: /law-hierarchy ActionLink・/treatment-work-balance/plan-builder 印刷ボタンの44px化（2026-07-03）
 *
 * 背景: 2026-07-03 柱0スウィープでの申し送り（BACKLOG-ux-tools.md 補充の指針）:
 *  - /law-hierarchy: `ActionLink`（e-Gov / 法令検索 / 関連通達へのCTA）が min-h-[36px]<44px
 *  - /treatment-work-balance/plan-builder: 印刷ボタンに min-h 指定なし（同フォームの他ボタンは48px）
 * 対策: いずれも min-h-[44px] を付与（寸法のみ、文言・機能・href不変）。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する元請安全担当。
 * 判定基準（無読テスト）: 主要CTAが指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/law-hierarchy-treatment-plan-44px-noread-2026-07-03.mjs
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
const context = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await context.newPage();

console.log("\n[/law-hierarchy] ActionLink 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/law-hierarchy`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });

{
  // ActionLinkはHierarchyCard(<article aria-label=...>)内のCTAのみ対象。
  // ページ下部の別レイアウト(大判プロモーションカード)は対象外。
  const links = page.locator('article[aria-label] a');
  const count = await links.count();
  check("ActionLinkが1件以上検出", count > 0, `count=${count}`);
  const heights = await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check(
    "全ActionLinkが44px以上",
    heights.length > 0 && heights.every((h) => h >= 44),
    `heights=${heights.join(",")}`,
  );
}

console.log("\n[/treatment-work-balance/plan-builder] 印刷ボタン 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/treatment-work-balance/plan-builder`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });

// デフォルト値のままフォームを送信し、結果ヘッダーの印刷ボタンを表示させる
const generateBtn = page.getByRole("button", { name: "両立支援プランを生成" });
await generateBtn.click();

const printBtn = page.getByRole("button", { name: "印刷／PDF" });
await printBtn.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
{
  const box = await printBtn.boundingBox();
  check("印刷／PDFボタンが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
