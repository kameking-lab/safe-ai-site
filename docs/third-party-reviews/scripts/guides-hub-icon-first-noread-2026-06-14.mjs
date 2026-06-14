// 無読テスト: /guides ハブ 柱0 アイコンファースト（本文を読まず3秒で4ガイドを見分けられるか）
// ペルソナ視点: 検索から /guides に着地した初訪の職長が、本文を読まずアイコン＋色で
//   「AI相談」「災害分析」「年次計画」「化学物質RA」の4つを瞬時に弁別し、目的のカードへ最短到達できるか。
// 検証: 各カードが (1) アイコンバッジを1つ持ち (2) 44px 以上の可視サイズで (3) 色が重複しないこと。
// 使い方: node docs/third-party-reviews/scripts/guides-hub-icon-first-noread-2026-06-14.mjs
// 前提: web/ で `npm run dev`（または build+start）し、BASE を起動URLに合わせる。
import { createRequire } from "node:module";
// playwright は web/node_modules にあるため、本スクリプト位置から相対解決する。
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/@playwright/test");

const BASE = process.env.BASE ?? "http://localhost:3000";
const MIN = 44;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 12 相当
await page.goto(`${BASE}/guides`, { waitUntil: "networkidle" });

const slugs = [
  { slug: "anzeneho-ai-chatbot", label: "安衛法AIチャット" },
  { slug: "industry-accident-reports", label: "業種別災害分析" },
  { slug: "annual-safety-plan-generator", label: "年次安全衛生計画" },
  { slug: "chemical-ra-create-simple", label: "化学物質RA" },
];

let pass = 0;
const colors = new Set();
for (const s of slugs) {
  const card = page.locator(`a[href="/guides/${s.slug}"]`).first();
  const badge = card.locator("span.rounded-xl").first();
  const box = await badge.boundingBox().catch(() => null);
  const cls = (await badge.getAttribute("class").catch(() => "")) ?? "";
  const color = cls.match(/bg-[a-z]+-\d+/)?.[0] ?? "";
  if (color) colors.add(color);
  const ok = box && box.width >= MIN && box.height >= MIN && color.length > 0;
  if (ok) pass++;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${s.label}: ${box ? `${box.width.toFixed(0)}x${box.height.toFixed(0)}` : "no-icon"}px / 色=${color || "なし"}`,
  );
}

const distinct = colors.size === slugs.length;
console.log(`\nアイコン色の弁別: ${colors.size}/${slugs.length} 色 ${distinct ? "(重複なし PASS)" : "(重複あり FAIL)"}`);
console.log(`無読アイコンファースト: ${pass}/${slugs.length} PASS`);
await browser.close();
process.exit(pass === slugs.length && distinct ? 0 : 1);
