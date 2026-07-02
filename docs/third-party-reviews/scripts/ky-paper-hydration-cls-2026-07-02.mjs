// O13検証: /ky/paper の React error #418 (hydration mismatch) 是正確認。
// 実行: cd web && npm run build && (npm run start -- -p 4173 &) ; node ../docs/third-party-reviews/scripts/ky-paper-hydration-cls-2026-07-02.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 412, height: 823 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  serviceWorkers: "block",
});
const page = await ctx.newPage();

await page.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__shifts.push({ value: e.value, hadRecentInput: e.hadRecentInput });
    }
  }).observe({ type: "layout-shift", buffered: true });
});

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => {
  consoleErrors.push(`pageerror: ${err.message}`);
});

for (let run = 1; run <= 3; run++) {
  await page.goto("http://localhost:4173/ky/paper", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  const shifts = await page.evaluate(() => window.__shifts);
  const cls = shifts.filter((s) => !s.hadRecentInput).reduce((a, b) => a + b.value, 0);
  const year = await page.getByLabel("年").inputValue();
  const month = await page.getByLabel("月").inputValue();
  const day = await page.getByLabel("日").inputValue();
  console.log(`--- run ${run}: CLS=${cls.toFixed(4)} 作業日=${year}-${month}-${day}`);
  await page.evaluate(() => (window.__shifts = []));
}

console.log(`\nconsole errors: ${consoleErrors.length}`);
for (const e of consoleErrors) console.log(`  ${e}`);

await browser.close();
process.exit(consoleErrors.length > 0 ? 1 : 0);
