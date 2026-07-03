// playwright は web/node_modules にあるため、本スクリプト位置から相対解決する。
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3901";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const results = [];

  await page.goto(`${BASE}/features/use-cases`, { waitUntil: "networkidle" });
  const pills = await page.locator("main a", { hasText: "→" }).all();
  let pillCount = 0;
  for (const pill of pills) {
    const href = await pill.getAttribute("href");
    if (!href || href.startsWith("/features/use-cases")) continue;
    const box = await pill.boundingBox();
    pillCount++;
    results.push({ label: `/features/use-cases 関連機能ピル[${pillCount}] href=${href}`, height: box?.height });
  }

  await page.goto(`${BASE}/court-cases/employer-liability`, { waitUntil: "networkidle" });
  const chips = await page.locator('main a[href^="/court-cases?issue="]').all();
  let chipCount = 0;
  for (const chip of chips) {
    const box = await chip.boundingBox();
    chipCount++;
    results.push({ label: `/court-cases/employer-liability 論点チップ[${chipCount}]`, height: box?.height });
  }

  console.log("=== 柱0補充 44px 実測 ===");
  for (const r of results) {
    console.log(`${r.label}: height=${r.height}px ${(r.height ?? 0) >= 44 ? "PASS" : "FAIL"}`);
  }

  const allPass = results.length > 0 && results.every((r) => (r.height ?? 0) >= 44);
  console.log(allPass ? `\n無読テスト: PASS (${results.length}/${results.length})` : "\n無読テスト: FAIL");

  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main();
