// playwright は web/node_modules にあるため、本スクリプト位置から相対解決する。
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3901";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const results = [];

  // 事故一覧（型フィルタ適用でリスト表示）から詳細ページへ遷移し、類似事例セクションが出る事故を数件試す。
  await page.goto(`${BASE}/accidents?tab=list&acc_type=${encodeURIComponent("墜落")}#accident-results`, {
    waitUntil: "networkidle",
  });
  const detailLinks = await page.locator('a[href^="/accidents/"]').evaluateAll((els) =>
    Array.from(new Set(els.map((e) => e.getAttribute("href")).filter((h) => h && /^\/accidents\/[^?]/.test(h))))
  );

  let checked = false;
  for (const href of detailLinks.slice(0, 15)) {
    await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    const backLink = page.getByRole("link", { name: /事故DBに戻る/ });
    if ((await backLink.count()) === 0) continue;

    const backBox = await backLink.boundingBox();
    results.push({ label: `${href} 「事故DBに戻る →」リンク`, height: backBox?.height });

    const similarLinks = await page.locator('section:has(h2:has-text("類似する事故事例")) a[href^="/accidents/"]').all();
    let i = 0;
    for (const link of similarLinks) {
      i++;
      const box = await link.boundingBox();
      results.push({ label: `${href} 類似事例タイトルリンク[${i}]`, height: box?.height });
    }
    checked = true;
    break;
  }

  if (!checked) {
    console.log("類似事例セクションを持つ事故詳細ページが見つかりませんでした（データ不足の可能性）");
    await browser.close();
    process.exit(1);
  }

  console.log("=== /accidents/[id] 柱0補充 44px 実測 ===");
  for (const r of results) {
    console.log(`${r.label}: height=${r.height}px ${(r.height ?? 0) >= 44 ? "PASS" : "FAIL"}`);
  }

  const allPass = results.length > 0 && results.every((r) => (r.height ?? 0) >= 44);
  console.log(allPass ? `\n無読テスト: PASS (${results.length}/${results.length})` : "\n無読テスト: FAIL");

  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main();
