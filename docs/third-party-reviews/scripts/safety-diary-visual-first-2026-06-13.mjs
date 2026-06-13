// 柱0バッチ1/9 安全日誌(/safety-diary)ビジュアルファースト 無読チェック。
// 実行: cd web && (PORT=3100 npm run start &) ; node ../docs/third-party-reviews/scripts/safety-diary-visual-first-2026-06-13.mjs
// 確認点: (1)最上部に結論カード「記入のこり4 項目」が出るか (2)はじめての方へが折りたたみか (3)画面上のh1が1個か
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
// playwright は web/node_modules にあるため、スクリプト位置から web/ を解決して require する。
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";
const out = process.env.OUT || "/tmp/safety-diary-noread.png";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当
  serviceWorkers: "block", // PWAのSWがfetchを握るのを防ぐ（memory: dev-server-hang-prod-fallback）
});
const page = await ctx.newPage();
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

// 画面上に見えているh1の数（display:noneの印刷シートは除外＝getByRole は可視のみ集計しない点に注意のため両方測る）
const h1DomCount = await page.locator("h1").count();
const h1VisibleCount = await page.getByRole("heading", { level: 1 }).count();
const conclusion = await page.getByRole("status", { name: /いまの状態/ }).first().innerText().catch(() => "(なし)");
const hasIntroDetails = await page.getByText("はじめての方へ").first().isVisible().catch(() => false);
const introOpen = await page.locator("details", { hasText: "はじめての方へ" }).first().evaluate((el) => el.open).catch(() => null);

console.log("h1 (DOM全体, 印刷シート含む):", h1DomCount);
console.log("h1 (アクセシビリティツリー/可視):", h1VisibleCount);
console.log("結論カード本文:", conclusion.replace(/\n/g, " / "));
console.log("『はじめての方へ』可視:", hasIntroDetails, " 初期open:", introOpen);

await page.screenshot({ path: out, fullPage: false });
console.log("screenshot:", out);

await browser.close();
