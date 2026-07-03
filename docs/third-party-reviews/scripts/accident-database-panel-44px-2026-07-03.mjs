// 無読テスト: /accidents 事故データベースの主要フィルタ・ページネーション・カード操作が
// 44pxタップ標的を満たすかを実機(next start)で boundingBox 実測する。
// playwright は web/node_modules にあるため createRequire の相対解決で repo ルートから直接実行可能にした。
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3211";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/accidents`, { waitUntil: "networkidle" });

  // タブ切替で「サイト収録事例」等、AccidentDatabasePanel が描画されるビューへ。
  const tab = page.getByRole("button", { name: /サイト収録事例|詳細事例/ }).first();
  if (await tab.count()) {
    await tab.click();
    await page.waitForTimeout(500);
  }

  const results = [];
  async function measure(locator, label) {
    const count = await locator.count();
    for (let i = 0; i < count; i++) {
      const el = locator.nth(i);
      if (!(await el.isVisible())) continue;
      const box = await el.boundingBox();
      if (box) results.push({ label: `${label}[${i}]`, height: box.height });
    }
  }

  await measure(page.locator("button", { hasText: "建設" }), "業種フィルタ:建設");
  await measure(page.locator("button", { hasText: "女性労働者" }), "対象属性:女性労働者");
  await measure(page.locator("button", { hasText: "全規模" }), "事業所規模:全規模");
  await measure(page.getByRole("button", { name: "詳細を見る" }).first(), "詳細を見る");
  await measure(page.getByRole("link", { name: "→ 詳細ページへ" }).first(), "詳細ページへ");
  await measure(page.getByRole("link", { name: "→ 日誌に記録" }).first(), "日誌に記録");

  let pass = true;
  for (const r of results) {
    const ok = r.height >= 44 - 0.5;
    if (!ok) pass = false;
    console.log(`${ok ? "PASS" : "FAIL"} ${r.label}: ${r.height.toFixed(1)}px`);
  }
  console.log(pass ? "\n無読テスト: 全PASS" : "\n無読テスト: FAIL あり");

  await browser.close();
  process.exit(pass ? 0 : 1);
}

main();
