// 無読テスト: /notifications 気象警報メール登録フォームの 44px タップ標的（実 boundingBox 測定）
// 使い方: node docs/third-party-reviews/scripts/notifications-44px-form-noread-2026-06-14.mjs
// 前提: web/ で `npm run dev`（または build+start）し、BASE を起動URLに合わせる。
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const MIN = 44;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 12 相当
await page.goto(`${BASE}/notifications`, { waitUntil: "networkidle" });

const targets = [
  { label: "メールアドレス入力", selector: "#notify-email" },
  { label: "対象地域セレクト", selector: "#notify-prefecture" },
  { label: "登録ボタン", selector: 'button[type="submit"]' },
];

let pass = 0;
for (const t of targets) {
  const box = await page.locator(t.selector).boundingBox();
  const ok = box && box.height >= MIN;
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"} ${t.label}: ${box ? box.height.toFixed(1) : "?"}px (>= ${MIN}px)`);
}

console.log(`\n無読タップ標的: ${pass}/${targets.length} PASS`);
await browser.close();
process.exit(pass === targets.length ? 0 : 1);
