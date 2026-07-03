// playwright は web/node_modules にあるため、本スクリプト位置から相対解決する。
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3901";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const results = [];

  // mhlw-<番号> 形式のIDは職場のあんぜんサイトへの出典URLが必ず解決される。
  await page.goto(`${BASE}/accidents?tab=list#accident-results`, { waitUntil: "networkidle" });
  const detailLinks = await page.locator('a[href^="/accidents/mhlw-"]').evaluateAll((els) =>
    Array.from(new Set(els.map((e) => e.getAttribute("href")).filter(Boolean)))
  );

  let checked = false;
  for (const href of detailLinks.slice(0, 15)) {
    await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    const sourceLink = page.getByRole("link", { name: /出典元を開く/ });
    if ((await sourceLink.count()) === 0) continue;

    const box = await sourceLink.boundingBox();
    results.push({ label: `${href} 「出典元を開く」外部リンク`, height: box?.height });
    checked = true;
    break;
  }

  if (!checked) {
    console.log("出典元URLを持つ事故詳細ページが見つかりませんでした（データ不足の可能性）");
    await browser.close();
    process.exit(1);
  }

  console.log("=== /accidents/[id] 出典元リンク 44px 実測 ===");
  for (const r of results) {
    console.log(`${r.label}: height=${r.height}px ${(r.height ?? 0) >= 44 ? "PASS" : "FAIL"}`);
  }

  const allPass = results.length > 0 && results.every((r) => (r.height ?? 0) >= 44);
  console.log(allPass ? `\n無読テスト: PASS (${results.length}/${results.length})` : "\n無読テスト: FAIL");

  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main();
