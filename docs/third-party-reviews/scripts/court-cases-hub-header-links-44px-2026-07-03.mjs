// 無読テスト: /court-cases ハブ最上部(h1直下)の2リンクが実機で44px以上のタップ標的を満たすか
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3901";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${BASE}/court-cases`, { waitUntil: "networkidle" });

const targets = [
  { name: "3つの責任ガイド", pattern: /3つの責任」ガイド/ },
  { name: "A4まとめ資料で印刷／PDF保存", pattern: /A4まとめ資料で印刷／PDF保存/ },
];

let allPass = true;
for (const t of targets) {
  const link = page.getByRole("link", { name: t.pattern });
  const box = await link.boundingBox();
  const h = box?.height ?? 0;
  const ok = h >= 44;
  if (!ok) allPass = false;
  console.log(`${ok ? "PASS" : "FAIL"} ${t.name}: height=${h.toFixed(1)}px`);
}

await browser.close();
process.exit(allPass ? 0 : 1);
