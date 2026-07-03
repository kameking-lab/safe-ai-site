// 無読テスト補助: /industries 「関連ページ」リンクの実boundingBox 44px確認
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3111";
const HREFS = [
  "/accidents-reports",
  "/strategy/plan-generator",
  "/ky",
  "/chatbot",
  "/education-certification",
  "/circulars",
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${BASE}/industries`, { waitUntil: "networkidle" });

let allPass = true;
for (const href of HREFS) {
  const link = page.locator(`a[href="${href}"]:visible`).last();
  const box = await link.boundingBox();
  const h = box?.height ?? 0;
  const ok = h >= 44;
  allPass &&= ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${href} height=${h.toFixed(1)}px`);
}

await browser.close();
process.exit(allPass ? 0 : 1);
