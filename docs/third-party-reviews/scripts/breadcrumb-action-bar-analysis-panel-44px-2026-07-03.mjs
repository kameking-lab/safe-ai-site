/**
 * 無読テスト: 共通パンくず(breadcrumb.tsx)・事故アクションバー(accidents/action-bar.tsx)・
 *   事故分析パネル2種(MethodologyAccordion/CSVエクスポート)の44px是正（柱0補充・2026-07-03）
 *
 * ペルソナ: スマホで本文を読まず指でタップだけする初訪の一人親方（390×844）。
 * 背景: Exploreサーベイでroute個別ページはほぼ全て44px対応済みと判明した一方、
 *   共有コンポーネント側（breadcrumb・accidents/action-bar・accident-analysis-panel系）に
 *   未対応の高確信度候補が複数見つかった。担当route全体に波及する部品のため優先是正。
 *
 * 検証: 実boundingBoxがいずれも44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/breadcrumb-action-bar-analysis-panel-44px-2026-07-03.mjs
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

console.log("\n[/industries/construction] 共通パンくずの44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/industries/construction`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const nav = page.getByRole("navigation", { name: "パンくずリスト" });
const homeCrumb = nav.getByRole("link", { name: "ホーム" });
const homeBox = await homeCrumb.boundingBox();
check("パンくず「ホーム」アイコンリンクが44px以上", !!homeBox && homeBox.height >= 44, `height=${homeBox?.height}`);

const midCrumb = nav.getByRole("link", { name: "業種別案内", exact: true });
const midBox = await midCrumb.boundingBox();
check("パンくず「業種別案内」項目リンクが44px以上", !!midBox && midBox.height >= 44, `height=${midBox?.height}`);

console.log("\n[/accidents/[id]] 下部アクションバー(inline)の44pxタップ標的");
await page.goto(`${BASE}/accidents/mhlw-100003`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
// inline/sticky の2バリアントが同時にDOMへ存在するため .first() で明示指定
const kyLink = page.getByRole("link", { name: "KYを起票" }).first();
const kyBox = await kyLink.boundingBox();
check("「KYを起票」リンクが44px以上", !!kyBox && kyBox.height >= 44, `height=${kyBox?.height}`);

const equipLink = page.getByRole("link", { name: "必要保護具を見る" }).first();
const equipBox = await equipLink.boundingBox();
check("「必要保護具を見る」リンクが44px以上", !!equipBox && equipBox.height >= 44, `height=${equipBox?.height}`);

const lawsLink = page.getByRole("link", { name: "関連法令" }).first();
const lawsBox = await lawsLink.boundingBox();
check("「関連法令」リンクが44px以上", !!lawsBox && lawsBox.height >= 44, `height=${lawsBox?.height}`);

const liabilityLink = page.getByRole("link", { name: "問われる責任" }).first();
const liabilityBox = await liabilityLink.boundingBox();
check("「問われる責任」リンクが44px以上", !!liabilityBox && liabilityBox.height >= 44, `height=${liabilityBox?.height}`);

console.log("\n[/accidents] MHLW実データ分析パネルの44pxタップ標的");
await page.goto(`${BASE}/accidents`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const mhlwTab = page.getByRole("button", { name: "MHLW実データ分析" });
await mhlwTab.click();
await page.waitForTimeout(500);

const mhlwMethodologyBtn = page.getByRole("button", { name: /このデータについて/ }).first();
const mhlwMethodologyBox = await mhlwMethodologyBtn.boundingBox();
check("mhlw-accident-analysis-panel「このデータについて」ボタンが44px以上", !!mhlwMethodologyBox && mhlwMethodologyBox.height >= 44, `height=${mhlwMethodologyBox?.height}`);

const csvAggBtn = page.getByRole("button", { name: "集計CSV" });
const csvAggBox = await csvAggBtn.boundingBox();
check("「集計CSV」ボタンが44px以上", !!csvAggBox && csvAggBox.height >= 44, `height=${csvAggBox?.height}`);

console.log("\n[/accidents] 詳細事例（参考）分析パネルの44pxタップ標的");
const analysisTab = page.getByRole("button", { name: "詳細事例（参考）" });
await analysisTab.click();
await page.waitForTimeout(500);

const analysisMethodologyBtn = page.getByRole("button", { name: /このデータについて/ }).first();
const analysisMethodologyBox = await analysisMethodologyBtn.boundingBox();
check("accident-analysis-panel「このデータについて」ボタンが44px以上", !!analysisMethodologyBox && analysisMethodologyBox.height >= 44, `height=${analysisMethodologyBox?.height}`);

const csvExportBtn = page.getByRole("button", { name: "CSVエクスポート" });
const csvExportBox = await csvExportBtn.boundingBox();
check("「CSVエクスポート」ボタンが44px以上", !!csvExportBox && csvExportBox.height >= 44, `height=${csvExportBox?.height}`);

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
