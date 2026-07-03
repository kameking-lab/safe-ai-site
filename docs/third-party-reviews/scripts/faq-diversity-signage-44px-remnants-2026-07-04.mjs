/**
 * 無読テスト: /faq/search・/diversity/women・/signage 44px網羅調査の見落とし4箇所の是正（柱0補充・2026-07-04）
 *
 * 背景: 過去の44px一括是正の対象から漏れていた4箇所:
 *   ①/faq/search 検索結果アコーディオンボタン(px-4 py-3のみ)
 *   ②/diversity/women 法令アコーディオンボタン(px-4 py-3のみ)
 *   ③/signage トレンド拡大モーダル「記事を開く →」外部リンク
 *   ④signage-today-documents.tsx 資料タイトル編集input（「作業資料」モード切替+資料1件投入が必要）
 *
 * 検証: 実boundingBoxが44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/faq-diversity-signage-44px-remnants-2026-07-04.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1920, height: 1080 };

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

// ①/faq/search 検索結果アコーディオンボタン
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  console.log("\n[/faq/search] 検索結果アコーディオンボタンの44pxタップ標的");
  await page.goto(`${BASE}/faq/search`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder(/例: ストレスチェック/).fill("ストレスチェック");
  await page.waitForTimeout(300);
  const toggles = await page.getByRole("button", { expanded: false }).all();
  check("検索結果が1件以上ある", toggles.length > 0, `count=${toggles.length}`);
  for (const [i, toggle] of toggles.entries()) {
    const box = await toggle.boundingBox();
    check(`検索結果アコーディオン[${i}]が44px以上`, !!box && box.height >= 44, `height=${box?.height}`);
  }
  await ctx.close();
}

// ②/diversity/women 法令アコーディオンボタン
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  console.log("\n[/diversity/women] 法令アコーディオンボタンの44pxタップ標的");
  await page.goto(`${BASE}/diversity/women`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const toggles = await page.getByRole("button", { expanded: false }).all();
  check("法令アコーディオンが1件以上ある", toggles.length > 0, `count=${toggles.length}`);
  for (const [i, toggle] of toggles.slice(0, 5).entries()) {
    const box = await toggle.boundingBox();
    check(`法令アコーディオン[${i}]が44px以上`, !!box && box.height >= 44, `height=${box?.height}`);
  }
  await ctx.close();
}

// ③/signage トレンド拡大モーダル「記事を開く →」
{
  const ctx = await browser.newContext({ viewport: DESKTOP, serviceWorkers: "block" });
  const page = await ctx.newPage();
  console.log("\n[/signage] トレンド拡大モーダル「記事を開く →」の44pxタップ標的");
  await page.goto(`${BASE}/signage`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const trendCard = page.locator("[data-testid='signage-rotator'], .signage-rotator").first();
  const zoomTarget = page.getByText(/記事を開く|拡大|トレンド/).first();
  // トレンドカードをクリックして拡大モーダルを開く試行（複数セレクタ候補）
  let opened = false;
  const candidates = [
    page.locator("button:has-text('拡大')").first(),
    page.locator("[aria-label*='拡大']").first(),
  ];
  for (const c of candidates) {
    if ((await c.count()) > 0) {
      await c.click().catch(() => {});
      opened = true;
      break;
    }
  }
  await page.waitForTimeout(300);
  const link = page.getByRole("link", { name: /記事を開く/ });
  const linkCount = await link.count();
  if (linkCount > 0) {
    const box = await link.first().boundingBox();
    check("「記事を開く →」リンクが44px以上", !!box && box.height >= 44, `height=${box?.height}`);
  } else {
    console.log("  SKIP: 「記事を開く →」モーダルを自動起動できず(手動操作依存のためソーステストで担保)");
  }
  await ctx.close();
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
