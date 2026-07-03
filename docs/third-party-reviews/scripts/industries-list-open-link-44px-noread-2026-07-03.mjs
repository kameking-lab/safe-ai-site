// playwright は web/node_modules にあるため、本スクリプト位置から相対解決する。
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3901";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(`${BASE}/industries`, { waitUntil: "networkidle" });

  const links = await page.getByRole("link", { name: "開く →" }).all();
  if (links.length === 0) {
    console.log("業種一覧テーブルの「開く →」リンクが見つかりませんでした");
    await browser.close();
    process.exit(1);
  }

  const results = [];
  let i = 0;
  for (const link of links) {
    i++;
    const box = await link.boundingBox();
    results.push({ label: `「開く →」リンク[${i}]`, height: box?.height });
  }

  console.log("=== /industries 一覧テーブル 44px 実測 ===");
  for (const r of results) {
    console.log(`${r.label}: height=${r.height}px ${(r.height ?? 0) >= 44 ? "PASS" : "FAIL"}`);
  }

  const allPass = results.every((r) => (r.height ?? 0) >= 44);
  console.log(allPass ? `\n無読テスト: PASS (${results.length}/${results.length})` : "\n無読テスト: FAIL");

  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main();
