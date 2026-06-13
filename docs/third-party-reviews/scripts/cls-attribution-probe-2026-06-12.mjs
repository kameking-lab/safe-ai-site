// 一時診断: /accidents の layout-shift 発生源を attribution 付きで観測する
import { chromium } from "@playwright/test";

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
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

await page.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__shifts.push({
        t: Math.round(e.startTime),
        value: e.value,
        hadRecentInput: e.hadRecentInput,
        sources: (e.sources || []).map((s) => ({
          node: s.node
            ? s.node.tagName +
              "." +
              String(s.node.className).slice(0, 60) +
              " | " +
              (s.node.textContent || "").slice(0, 40)
            : null,
          prev: s.previousRect && `${s.previousRect.top},${s.previousRect.left} ${s.previousRect.width}x${s.previousRect.height}`,
          cur: s.currentRect && `${s.currentRect.top},${s.currentRect.left} ${s.currentRect.width}x${s.currentRect.height}`,
        })),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
});

for (let run = 1; run <= 3; run++) {
  await page.goto("http://localhost:3000/accidents", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  const shifts = await page.evaluate(() => window.__shifts);
  const total = shifts.filter((s) => !s.hadRecentInput).reduce((a, b) => a + b.value, 0);
  console.log(`--- run ${run}: CLS=${total.toFixed(4)} (${shifts.length} entries)`);
  for (const s of shifts) {
    if (s.value < 0.005) continue;
    console.log(`  t=${s.t}ms v=${s.value.toFixed(4)}`);
    for (const src of s.sources) {
      console.log(`    ${src.node}`);
      console.log(`      prev=${src.prev} -> cur=${src.cur}`);
    }
  }
  await page.evaluate(() => (window.__shifts = []));
}
await browser.close();
