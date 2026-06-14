// 無読テスト: /court-cases/[id] 判例詳細 最上部・実務導線の 44px タップ標的（実 boundingBox 測定）
// ペルソナ視点: 一覧から1判例にタップで入った一人親方/コンサルが「戻る」「印刷／PDF」「現場の実務へ」を
//   指で押し損ねないか。本文を読まず、操作の押せるサイズだけを3秒で確認する。
// 使い方: node docs/third-party-reviews/scripts/court-case-detail-44px-noread-2026-06-14.mjs
// 前提: web/ で `npm run dev`（または build+start）し、BASE を起動URLに合わせる。
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3000";
// 安定した先頭の判例（generateStaticParams の1件目）。存在しない場合は CASE_ID で上書き可。
const CASE_ID = process.env.CASE_ID ?? "rikujou-jieitai-hachinohe";
const MIN = 44;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 12 相当
await page.goto(`${BASE}/court-cases/${CASE_ID}`, { waitUntil: "networkidle" });

const targets = [
  { label: "戻る（労災裁判例コーナーに戻る）", selector: 'a:has-text("労災裁判例コーナーに戻る")' },
  { label: "この判例を印刷／PDF", selector: 'a:has-text("この判例を印刷／PDF")' },
  { label: "KY用紙で危険予知", selector: 'a:has-text("KY用紙で危険予知")' },
  { label: "重大災害事例を見る", selector: 'a:has-text("重大災害事例を見る")' },
  { label: "安衛法を質問する", selector: 'a:has-text("安衛法を質問する")' },
];

let pass = 0;
for (const t of targets) {
  const box = await page.locator(t.selector).first().boundingBox();
  const ok = box && box.height >= MIN;
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"} ${t.label}: ${box ? box.height.toFixed(1) : "?"}px (>= ${MIN}px)`);
}

console.log(`\n無読タップ標的: ${pass}/${targets.length} PASS`);
await browser.close();
process.exit(pass === targets.length ? 0 : 1);
