import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3901";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/diversity/women`, { waitUntil: "networkidle" });

  const results = [];

  const amazonLinks = await page.locator("a", { hasText: "Amazonで探す" }).all();
  const rakutenLinks = await page.locator("a", { hasText: "楽天で探す" }).all();
  for (const link of [...amazonLinks, ...rakutenLinks]) {
    const text = (await link.innerText()).trim();
    const box = await link.boundingBox();
    results.push({ text, height: box?.height });
  }

  const nav = page.getByRole("navigation", { name: "関連ページ" });
  const navLinks = await nav.locator("a").all();
  for (const link of navLinks) {
    const text = (await link.innerText()).trim();
    const box = await link.boundingBox();
    results.push({ text, height: box?.height });
  }

  console.log("=== /diversity/women アフィリエイトボタン・関連ページリンク 実測 ===");
  for (const r of results) {
    console.log(`${r.text}: height=${r.height}px ${(r.height ?? 0) >= 44 ? "PASS" : "FAIL"}`);
  }

  const allPass = results.length > 0 && results.every((r) => (r.height ?? 0) >= 44);
  console.log(allPass ? `\n無読テスト: PASS (${results.length}/${results.length})` : "\n無読テスト: FAIL");

  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main();
