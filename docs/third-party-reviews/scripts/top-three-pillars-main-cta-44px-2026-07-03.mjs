/**
 * 無読テスト: トップ home-three-pillars.tsx の3柱・主CTAリンク44px是正（柱0補充・2026-07-03）
 *
 * ペルソナ: スマホでトップを開き、本文を読まず指でタップだけする初訪の一人親方（390×844）。
 * 背景: 3柱それぞれの本体CTA「業種別 事故分析レポートへ →」「気象リスク詳細を見る →」
 *   「法改正一覧を見る →」が px-3 py-2 text-xs のみ（実測≈32px）で44px未満だった既存欠陥。
 *   同ファイル内の他リンク/ボタンは既に is-44px 是正済みだったが、この3本の主動線だけ取り残されていた。
 *
 * 検証: 実boundingBoxが3本とも44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/top-three-pillars-main-cta-44px-2026-07-03.mjs
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

console.log("\n[/] トップ 3柱・主CTAリンクの44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const reportsLink = page.getByRole("link", { name: /業種別 事故分析レポートへ/ });
const reportsBox = await reportsLink.boundingBox();
check("「業種別 事故分析レポートへ」リンクが44px以上", !!reportsBox && reportsBox.height >= 44, `height=${reportsBox?.height}`);

const riskLink = page.getByRole("link", { name: /気象リスク詳細を見る/ });
const riskBox = await riskLink.boundingBox();
check("「気象リスク詳細を見る」リンクが44px以上", !!riskBox && riskBox.height >= 44, `height=${riskBox?.height}`);

const lawsLink = page.getByRole("link", { name: /法改正一覧を見る/ });
const lawsBox = await lawsLink.boundingBox();
check("「法改正一覧を見る」リンクが44px以上", !!lawsBox && lawsBox.height >= 44, `height=${lawsBox?.height}`);

console.log(`\n  無読まとめ: 3柱の主CTAが44px以上に是正`);
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
