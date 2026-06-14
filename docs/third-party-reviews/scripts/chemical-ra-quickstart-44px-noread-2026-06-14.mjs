/**
 * 無読/タップ標的テスト（柱0・機能UX班-B・2026-06-14）
 *
 * 対象: /chemical-ra「職種別クイックスタート」の物質名チップ。
 * これは「クリックするとその物質でRAを開始する」主要CTAだが、従来 px-2.5 py-1
 * で高さ約30pxとなり、現場の指タップには小さすぎた（柱0「タップしやすいサイズ」違反）。
 * 是正後、全チップが 44×44px 以上であることを実機(prod 3100・スマホ390×844)で固定する。
 *
 * 判定:
 *   1) 「職種別クイックスタート」ブロックが存在
 *   2) ブロック内の各物質チップ（/chemical-ra?name=...&run=1 リンク）が
 *      高さ>=44px かつ 幅>=44px
 *   3) チップをタップすると ?name=...&run=1 でRA入力に遷移する（href健全性）
 *
 * 実行: BASE_URL=http://localhost:3100 node <このファイル>
 *   （@playwright/test 解決のため web/ ディレクトリから実行すること）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const MIN = 44;

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();
  let pass = 0;
  let fail = 0;
  const check = (cond, msg) => {
    if (cond) {
      pass += 1;
      console.log(`PASS ${msg}`);
    } else {
      fail += 1;
      console.log(`FAIL ${msg}`);
    }
  };

  await page.goto(`${BASE}/chemical-ra`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1) ブロック存在
  const hasBlock = await page.getByText("職種別クイックスタート").count();
  check(hasBlock > 0, "「職種別クイックスタート」ブロックが存在");

  // 2)+3) 各チップの寸法と href
  const chips = await page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll('a[href*="/chemical-ra?name="]')
    ).filter((a) => a.getAttribute("href").includes("run=1"));
    return links.map((a) => {
      const r = a.getBoundingClientRect();
      return {
        text: (a.textContent || "").trim(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        href: a.getAttribute("href"),
      };
    });
  });

  check(chips.length >= 13, `クイックスタート物質チップを検出（${chips.length}件 >= 13）`);

  for (const c of chips) {
    check(
      c.h >= MIN && c.w >= MIN,
      `チップ「${c.text}」が44px以上（${c.w}x${c.h}）`
    );
    check(
      /\/chemical-ra\?name=.+&run=1/.test(c.href),
      `チップ「${c.text}」のhrefがRA開始リンク（${c.href}）`
    );
  }

  await browser.close();
  console.log(`\nDone: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
