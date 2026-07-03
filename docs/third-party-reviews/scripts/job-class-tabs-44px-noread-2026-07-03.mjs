/**
 * 無読テスト: /mental-health-management/interview-guidance 職種タブ(JobClassTabs)の44px化（2026-07-03）
 *
 * 背景: lane backlog未着手が1件（要data班確認でブロック中）のみのため補充指針に従いExplore調査。
 *  - `job-class-tabs.tsx` の職種タブ（role="tab"、タップでmeasures/bulletsを切替）が px-3 py-1.5 text-xs≒28-30px
 *    で44px未満のまま取り残されていた（同ツリーの stress-check/readiness-form.tsx は既に min-h-[44px] 済み＝横展開漏れ）。
 * 対策: min-h-[44px]（+ inline-flex items-center justify-center）を付与（寸法のみ、文言・onClick不変）。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する産業保健スタッフ。
 * 判定基準（無読テスト）: 職種タブが指で確実に押せ、押すと措置案が切り替わるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/job-class-tabs-44px-noread-2026-07-03.mjs
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

console.log("\n[/mental-health-management/interview-guidance] 職種タブ 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/mental-health-management/interview-guidance`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });

const h1Count = await page.locator("h1").count();
check("h1は1個のみ", h1Count === 1, `count=${h1Count}`);

const tabs = page.getByRole("tab");
const tabCount = await tabs.count();
check("職種タブが1件以上検出", tabCount > 0, `count=${tabCount}`);

const heights = await tabs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
check(
  "全職種タブが44px以上",
  heights.length > 0 && heights.every((h) => h >= 44),
  `heights=${heights.join(",")}`,
);

// 非退行: タップで措置案パネルが切り替わる
const panelBefore = await page.getByRole("tabpanel").innerText();
const secondTab = tabs.nth(Math.min(1, tabCount - 1));
await secondTab.click();
const panelAfter = await page.getByRole("tabpanel").innerText();
check("タブ切替でパネル内容が変化", panelBefore !== panelAfter, `before/after同一=${panelBefore === panelAfter}`);

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
