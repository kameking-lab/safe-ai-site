/**
 * 無読テスト: /risk-prediction タブ・/law-search モード切替+チップ+e-Gov/AI要約ボタンの44px化（2026-07-03）
 *
 * 背景: 柱0補充スウィープでの発見（BACKLOG-ux-tools.md 補充の指針）:
 *  - /risk-prediction: `risk-prediction-panel.tsx` の TabButton（検索/傾向/マトリクス/スコアの主タブ）が min-h未指定≒32〜36px
 *  - /law-search: `law-search-panel.tsx` のモード切替（キュレーション/MHLW公式PDF）が min-h未指定≒32px
 *  - /law-search: `law-search-results.tsx` の e-Govリンク・AI要約ボタン・法令名フィルタチップが min-h未指定≒24〜28px
 * 対策: いずれも min-h-[44px] を付与（寸法のみ、文言・機能・onClick/href不変）。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する安全担当。
 * 判定基準（無読テスト）: 主要タブ・CTAが指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/risk-lawsearch-tabs-44px-noread-2026-07-03.mjs
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

console.log("\n[/risk-prediction] 検索/傾向/マトリクス/スコア タブ 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/risk-prediction`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });

{
  const tabs = page.getByRole("button", { name: /^(検索|傾向|マトリクス|スコア)$/ });
  const count = await tabs.count();
  check("主タブが1件以上検出", count > 0, `count=${count}`);
  const heights = await tabs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check(
    "全主タブが44px以上",
    heights.length > 0 && heights.every((h) => h >= 44),
    `heights=${heights.join(",")}`,
  );
}

console.log("\n[/law-search] モード切替・法令名フィルタチップ 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/law-search`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
// クライアントコンポーネントのhydration待ち（モード切替タブはハイドレーション後に描画）
await page.getByRole("button", { name: "MHLW公式法令PDF" }).waitFor({ state: "visible", timeout: 10000 });

{
  const modeTabs = page.getByRole("button", { name: /(キュレーション|MHLW公式法令PDF)/ });
  const count = await modeTabs.count();
  check("モード切替タブが1件以上検出", count > 0, `count=${count}`);
  const heights = await modeTabs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check(
    "全モード切替タブが44px以上",
    heights.length > 0 && heights.every((h) => h >= 44),
    `heights=${heights.join(",")}`,
  );
}

{
  const chips = page.getByRole("button", { name: "すべての法令" });
  const box = await chips.first().boundingBox();
  check("「すべての法令」フィルタチップが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}

{
  const eGovLinks = page.getByRole("link", { name: "e-Gov" });
  const count = await eGovLinks.count();
  if (count > 0) {
    const heights = await eGovLinks.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    check("全e-Govリンクが44px以上", heights.every((h) => h >= 44), `heights=${heights.join(",")}`);
  } else {
    check("e-Govリンク（該当条文なし=スキップ）", true, "count=0");
  }
}

{
  const aiButtons = page.getByRole("button", { name: "AI要約" });
  const count = await aiButtons.count();
  if (count > 0) {
    const heights = await aiButtons.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    check("全AI要約ボタンが44px以上", heights.every((h) => h >= 44), `heights=${heights.join(",")}`);
  } else {
    check("AI要約ボタン（該当条文なし=スキップ）", true, "count=0");
  }
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
