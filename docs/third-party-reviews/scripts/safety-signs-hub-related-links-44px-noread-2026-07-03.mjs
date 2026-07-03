import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3901";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/safety-signs`, { waitUntil: "networkidle" });

  const links = await page.locator("main a", { hasText: /→/ }).all();
  const targets = [];
  for (const link of links) {
    const text = (await link.innerText()).trim();
    if (/サイネージ表示|KY簡易作成|建設業のリスク・対策/.test(text)) {
      const box = await link.boundingBox();
      targets.push({ text, height: box?.height });
    }
  }

  console.log("=== /safety-signs 関連機能リンク 実測 ===");
  for (const t of targets) {
    console.log(`${t.text}: height=${t.height}px ${t.height >= 44 ? "PASS" : "FAIL"}`);
  }

  const allPass = targets.length === 3 && targets.every((t) => (t.height ?? 0) >= 44);
  console.log(allPass ? "\n無読テスト: PASS (3/3)" : "\n無読テスト: FAIL");

  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main();
