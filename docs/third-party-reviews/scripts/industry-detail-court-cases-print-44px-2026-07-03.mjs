/**
 * 無読テスト: /industries/[industry] 下部CTA・「他の業種」リンク＋court-cases-browser印刷リンクの44px是正（柱0補充・2026-07-03）
 *
 * ペルソナ: スマホで業種別ページ/判例コーナーを開き、本文を読まず指でタップだけする初訪の一人親方（390×844）。
 * 背景: /industries/[industry] ページ下部「次のアクション」CTA3件(KYを作成/年次計画を生成/事故分析を見る)と
 *   「他の業種」横断リンクが px-3 py-1.5 text-sm のみ（実測≈32px）で44px未満だった既存欠陥。
 *   同ページの副リンク6箇所・キーワードピルは既に是正済みだったが、この2箇所だけ取り残されていた。
 *   court-cases-browser.tsx の絞り込み中「A4で印刷／PDF保存」リンクも同一パターンで未着手。
 *
 * 検証: 実boundingBoxがそれぞれ44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/industry-detail-court-cases-print-44px-2026-07-03.mjs
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

console.log("\n[/industries/construction] 下部CTA・他の業種リンクの44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/industries/construction`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const kyLink = page.getByRole("link", { name: "📝 KYを作成" });
const kyBox = await kyLink.boundingBox();
check("「KYを作成」CTAが44px以上", !!kyBox && kyBox.height >= 44, `height=${kyBox?.height}`);

const planLink = page.getByRole("link", { name: "📋 年次計画を生成" });
const planBox = await planLink.boundingBox();
check("「年次計画を生成」CTAが44px以上", !!planBox && planBox.height >= 44, `height=${planBox?.height}`);

const accidentLink = page.getByRole("link", { name: "🚨 事故分析を見る" });
const accidentBox = await accidentLink.boundingBox();
check("「事故分析を見る」CTAが44px以上", !!accidentBox && accidentBox.height >= 44, `height=${accidentBox?.height}`);

// ヘッダーの業種ドロップダウン(app-shell所有・非表示)にも同一hrefが存在するため、
// 「他の業種」セクション本体(rounded-full)の可視リンクに絞る。
const otherIndustryLink = page.locator('a[href="/industries/manufacturing"].rounded-full');
const otherBox = await otherIndustryLink.boundingBox();
check("「他の業種」横断リンクが44px以上", !!otherBox && otherBox.height >= 44, `height=${otherBox?.height}`);

console.log("\n[/court-cases] 絞り込み中「A4で印刷／PDF保存」リンクの44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/court-cases`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
await page.getByPlaceholder(/安全配慮義務、墜落、過労、石綿/).fill("墜落");
await page.waitForTimeout(300);

const printLink = page.getByRole("link", { name: /A4で印刷／PDF保存/ });
const printBox = await printLink.boundingBox();
check("「A4で印刷／PDF保存」リンクが44px以上", !!printBox && printBox.height >= 44, `height=${printBox?.height}`);

console.log(`\n  無読まとめ: 業種詳細ページの下部CTA・他業種リンク、判例コーナーの印刷リンクが44px以上に是正`);
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
