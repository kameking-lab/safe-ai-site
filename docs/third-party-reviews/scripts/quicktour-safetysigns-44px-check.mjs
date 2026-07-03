// 無読テスト: /features/quick-tour ジャンプナビ、/safety-signs/industry/[id] 標識名リンク・チェックボックス、
// /safety-signs/sign/[id] 業種別使用例リンクの実boundingBoxが44px以上か確認する。
import { chromium } from "playwright";

const BASE = "http://localhost:3100";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const results = [];

  await page.goto(`${BASE}/features/quick-tour`, { waitUntil: "networkidle" });
  const jumpLinks = await page.locator('nav[aria-label="ステップへジャンプ"] a[href^="#step-"]').all();
  for (const link of jumpLinks) {
    const box = await link.boundingBox();
    results.push(["quick-tour jump-nav", box.width, box.height]);
  }

  await page.goto(`${BASE}/safety-signs/industry/construction`, { waitUntil: "networkidle" });
  const signLinks = await page.locator('a[href^="/safety-signs/sign/"]').all();
  for (const link of signLinks.slice(0, 5)) {
    const box = await link.boundingBox();
    results.push(["industry sign-name link", box.width, box.height]);
  }
  const checkboxLabels = await page.locator('input[type="checkbox"]').all();
  for (const cb of checkboxLabels.slice(0, 5)) {
    const label = cb.locator("xpath=..");
    const box = await label.boundingBox();
    results.push(["industry checkbox label", box.width, box.height]);
  }

  await page.goto(`${BASE}/safety-signs/sign/fire-extinguisher`, { waitUntil: "networkidle" });
  const usageLinks = await page.locator('a[href^="/safety-signs/industry/"]:not(.rounded-lg)').all();
  for (const link of usageLinks.slice(0, 5)) {
    const box = await link.boundingBox();
    results.push(["sign-detail industry-usage link", box.width, box.height]);
  }

  await browser.close();

  // このサイトの柱0慣行: インラインテキストリンクは min-h-[44px] のみを要求する
  // （幅はテキスト内容に追従。checkbox label は min-h/min-w 両方を明示指定）。
  let fail = 0;
  for (const [label, w, h] of results) {
    const requireWidth = label.includes("checkbox") || label.includes("jump-nav");
    const ok = h >= 44 && (!requireWidth || w >= 44);
    if (!ok) fail++;
    console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${w.toFixed(1)}x${h.toFixed(1)}`);
  }
  console.log(`\n${results.length - fail}/${results.length} PASS`);
  if (fail > 0) process.exit(1);
}

main();
