import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3000/accidents", { waitUntil: "networkidle" });

const buttons = await page.$$eval(
  "button",
  (els) =>
    els
      .filter((el) => /全件検索|死亡災害|業種別ランキング|MHLW実データ分析|サイト収録事例|詳細事例/.test(el.textContent ?? ""))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent?.trim(), height: r.height };
      })
);

console.log(JSON.stringify(buttons, null, 2));
const allOk = buttons.length > 0 && buttons.every((b) => b.height >= 44);
console.log(allOk ? "PASS: all >= 44px" : "FAIL: some under 44px");
await browser.close();
process.exit(allOk ? 0 : 1);
