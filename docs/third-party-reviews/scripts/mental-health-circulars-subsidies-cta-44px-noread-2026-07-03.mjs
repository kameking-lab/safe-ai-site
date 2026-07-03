/**
 * 無読テスト: /mental-health・/circulars/[id]・/subsidies フッターCTAの44px化（2026-07-03）
 *
 * 背景: 自領域の柱0横展開スウィープ（`px-4 py-2 text-xs` の rounded-lg CTA Link/a に
 * min-h指定が無いパターンをgrep）で3ページ7箇所を検出。text-xs(line-height 1rem=16px)
 * + py-2(8px×2)＝実測約32〜34pxで44px未満。いずれも「次にやること」の主要導線
 *  （/mental-health=多様な働き方の安全・安全用語辞書、/circulars/[id]=本文/PDF/通達一覧、
 *   /subsidies=料金プラン・導入相談）。
 * 対策: min-h-[44px] を付与（寸法のみ、文言・機能・href不変）。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する元請安全担当。
 * 判定基準（無読テスト）: 主要CTAが指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/mental-health-circulars-subsidies-cta-44px-noread-2026-07-03.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await context.newPage();

console.log("\n[/mental-health] 相談・支援窓口 CTA 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/mental-health`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
{
  const links = [
    page.getByRole("link", { name: "多様な働き方の安全 →" }),
    page.getByRole("link", { name: "安全用語辞書" }),
  ];
  for (const link of links) {
    const box = await link.boundingBox();
    const name = await link.textContent();
    check(`CTA「${name?.trim()}」が44px以上`, box !== null && box.height >= 44, `h=${box?.height}`);
  }
}

console.log("\n[/circulars/[id]] 出典CTA 44px 無読テスト（スマホ390×844）");
// 一覧から最初の通達詳細へ遷移（id直打ちを避け実データに追従）
await page.goto(`${BASE}/circulars`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
const firstDetailLink = page.locator('a[href^="/circulars/"]').first();
const detailHref = await firstDetailLink.getAttribute("href");
check("通達一覧から詳細リンクを検出", !!detailHref, `href=${detailHref}`);
if (detailHref) {
  await page.goto(`${BASE}${detailHref}`, { waitUntil: "domcontentloaded" });
  await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
  const links = page.getByRole("link", { name: /本文（出典）を開く|^PDF$|通達一覧（出典）/ });
  const count = await links.count();
  check("出典CTAが1件以上検出", count > 0, `count=${count}`);
  const heights = await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check(
    "全出典CTAが44px以上",
    heights.length > 0 && heights.every((h) => h >= 44),
    `heights=${heights.join(",")}`,
  );
}

console.log("\n[/subsidies] 料金・導入相談CTA 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/subsidies`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
{
  const links = [
    page.getByRole("link", { name: "料金プランを見る" }),
    page.getByRole("link", { name: "導入相談をする" }),
  ];
  for (const link of links) {
    const box = await link.boundingBox();
    const name = await link.textContent();
    check(`CTA「${name?.trim()}」が44px以上`, box !== null && box.height >= 44, `h=${box?.height}`);
  }
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
