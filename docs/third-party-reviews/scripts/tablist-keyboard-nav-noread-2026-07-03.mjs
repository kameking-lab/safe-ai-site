/**
 * 無読テスト: role="tab"の矢印キー操作（ARIA APG tabパターン）是正確認（2026-07-03）
 *
 * 背景: Explore監査で、自領域の役割別カスタムtab実装3件（top-cases-tabs.tsx /
 * job-class-tabs.tsx / StatsDashboardImpl.tsx）がいずれも role="tab" を名乗りながら
 * onClickのみでキーボード操作（ArrowLeft/Right・Home/End・ローミングtabindex）が
 * 一切無く、キーボード/スイッチデバイス利用者がタブ切替できない欠陥を検出。
 * 加えて top-cases-tabs.tsx / StatsDashboardImpl.tsx は role="tabpanel" 自体が
 * 欠落しタブ↔パネルの関連付けも無かった。
 *
 * 是正: 共通フック web/src/lib/a11y/use-roving-tablist.ts を新設し3ファイルへ適用
 * （ローミングtabindex＋ArrowLeft/Right/Up/Down・Home/End、既存onClick/選択ロジックは
 * 不変＝既存破壊0）。role="tabpanel"未実装の2箇所にも新設（aria-controls連携）。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/tablist-keyboard-nav-noread-2026-07-03.mjs
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

// ---- 1) /accidents-reports/construction 「重大事故」期間タブ ----
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  console.log("\n[/accidents-reports/construction] 重大事故 期間タブ キーボード操作");
  await page.goto(`${BASE}/accidents-reports/construction`, { waitUntil: "domcontentloaded" });

  const tablist = page.getByRole("tablist", { name: "重大事故の表示期間" });
  await tablist.waitFor({ state: "visible", timeout: 10000 });
  const tabs = tablist.getByRole("tab");
  const count = await tabs.count();
  check("タブが3件検出される", count === 3, `count=${count}`);

  const first = tabs.nth(0);
  await first.focus();
  check("先頭タブ（全期間）が選択済み", (await first.getAttribute("aria-selected")) === "true");

  await page.keyboard.press("ArrowRight");
  const second = tabs.nth(1);
  check("ArrowRightで2番目のタブに選択が移動", (await second.getAttribute("aria-selected")) === "true");
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
  check("ArrowRight後にフォーカスも2番目のタブへ移動", focused.includes("30日"), focused);

  await page.keyboard.press("End");
  const third = tabs.nth(2);
  check("Endで末尾タブへ選択移動", (await third.getAttribute("aria-selected")) === "true");

  await page.keyboard.press("Home");
  check("Homeで先頭タブへ選択が戻る", (await first.getAttribute("aria-selected")) === "true");

  const panelId = await first.getAttribute("aria-controls");
  check("タブにaria-controlsが設定されている", Boolean(panelId));
  const panel = page.locator(`#${panelId}`);
  check("aria-controls先にrole=tabpanelが実在する", (await panel.getAttribute("role")) === "tabpanel");

  await ctx.close();
}

// ---- 2) /mental-health-management/interview-guidance 職種タブ ----
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  console.log("\n[/mental-health-management/interview-guidance] 職種タブ キーボード操作");
  await page.goto(`${BASE}/mental-health-management/interview-guidance`, { waitUntil: "domcontentloaded" });

  const tablist = page.getByRole("tablist", { name: "職種" });
  await tablist.waitFor({ state: "visible", timeout: 10000 });
  const tabs = tablist.getByRole("tab");
  const count = await tabs.count();
  check("職種タブが複数件検出される", count > 1, `count=${count}`);

  const first = tabs.nth(0);
  await first.focus();
  const firstLabel = (await first.textContent()) ?? "";

  await page.keyboard.press("ArrowRight");
  const second = tabs.nth(1);
  check("ArrowRightで2番目の職種タブに選択が移動", (await second.getAttribute("aria-selected")) === "true");

  await page.keyboard.press("ArrowLeft");
  check("ArrowLeftで先頭の職種タブに選択が戻る", (await first.getAttribute("aria-selected")) === "true", firstLabel);

  await page.keyboard.press("ArrowLeft");
  const last = tabs.nth(count - 1);
  check("先頭でArrowLeftすると末尾へラップする", (await last.getAttribute("aria-selected")) === "true");

  await ctx.close();
}

// ---- 3) /stats 期間切替タブ（GA4接続をモックしタブを表示させる） ----
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  console.log("\n[/stats] 期間切替タブ キーボード操作（GA4接続モック）");

  const mockStats = (period) => ({
    period,
    source: "ga4",
    generatedAt: new Date(0).toISOString(),
    summary: { dau: 10, mau: 100, pv: 500, avgSessionSec: 60, bounceRate: 0.3, deltas: { dau: 0, mau: 0, pv: 0, avgSessionSec: 0, bounceRate: 0 } },
    features: [],
    pages: [],
    sources: [],
    flow: [],
    conversions: { amazonClicks: 0, rakutenClicks: 0, ctr: 0, byPage: [] },
    chatbot: { totalQuestions: 0, avgResponseMs: 0, byCategory: [] },
    insights: { unusedFeatures: [], growingFeatures: [], summary: "" },
  });

  await page.route("**/api/stats?period=*", (route) => {
    const url = new URL(route.request().url());
    const period = url.searchParams.get("period") ?? "30d";
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockStats(period)) });
  });
  await page.route("**/api/search-console?period=*", (route) => route.fulfill({ status: 404, body: "" }));
  await page.route("**/api/stats/page-analytics?period=*", (route) => route.fulfill({ status: 404, body: "" }));

  await page.goto(`${BASE}/stats`, { waitUntil: "domcontentloaded" });

  const tablist = page.getByRole("tablist", { name: "期間切替" });
  await tablist.waitFor({ state: "visible", timeout: 10000 });
  const tabs = tablist.getByRole("tab");
  const count = await tabs.count();
  check("期間タブが3件検出される", count === 3, `count=${count}`);

  const first = tabs.nth(0);
  await first.focus();
  await page.keyboard.press("ArrowRight");
  const second = tabs.nth(1);
  check("ArrowRightで2番目の期間タブに選択が移動", (await second.getAttribute("aria-selected")) === "true");

  const panelId = await second.getAttribute("aria-controls");
  check("期間タブにaria-controlsが設定されている", Boolean(panelId));
  const panel = page.locator(`#${panelId}`);
  check("aria-controls先にrole=tabpanelが実在する", (await panel.getAttribute("role")) === "tabpanel");

  await ctx.close();
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
