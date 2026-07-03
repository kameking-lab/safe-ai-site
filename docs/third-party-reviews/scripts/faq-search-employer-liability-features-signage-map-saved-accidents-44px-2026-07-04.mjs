/**
 * 無読テスト: /faq/search検索input・/court-cases/employer-liability予防4リンク・
 *   /features/[category]「他のカテゴリ」グリッド・/signage/mapピン選択ボタン・
 *   /accidentsの保存済み事故事例リンクの44px是正（柱0補充・2026-07-04）
 *
 * ペルソナ: スマホ/PCで本文を読まず指でタップだけする初訪の一人親方・現場の人。
 * 背景: 5箇所とも同一ファイル内の他ボタン/リンクは既に44px是正済みだったが、この1〜2箇所だけ
 *   一括是正の網羅調査から取り残されていた既存欠陥。
 *
 * 検証: 実boundingBoxがいずれも44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/faq-search-employer-liability-features-signage-map-saved-accidents-44px-2026-07-04.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

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

console.log("\n[/faq/search] 検索inputの44pxタップ標的（スマホ390×844）");
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/faq/search`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const input = page.getByPlaceholder(/ストレスチェック/);
  const box = await input.boundingBox();
  check("検索inputが44px以上", !!box && box.height >= 44, `height=${box?.height}`);
  await ctx.close();
}

console.log("\n[/court-cases/employer-liability] 予防アクション4リンクの44pxタップ標的（スマホ390×844）");
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/court-cases/employer-liability`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const hrefs = [
    ["/ky/paper", "KY（危険予知）"],
    ["/site-records", "受入教育・パトロール"],
    ["/heat-illness-prevention", "熱中症対策"],
    ["/court-cases", "判例で「何が問われたか」"],
  ];
  for (const [href, label] of hrefs) {
    const link = page.locator(`a[href="${href}"]:visible`).first();
    const box = await link.boundingBox();
    check(`予防リンク「${label}」が44px以上`, !!box && box.height >= 44, `height=${box?.height}`);
  }
  await ctx.close();
}

console.log("\n[/features/ai-chat] 「他のカテゴリ」グリッドの44pxタップ標的（スマホ390×844）");
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/features/ai-chat`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const grid = page.locator("h2:text('他のカテゴリ') ~ div a");
  const count = await grid.count();
  check("「他のカテゴリ」グリッドにリンクが存在する", count > 0, `count=${count}`);
  for (let i = 0; i < count; i++) {
    const box = await grid.nth(i).boundingBox();
    const label = await grid.nth(i).textContent();
    check(`カテゴリリンク「${label?.trim()}」が44px以上`, !!box && box.height >= 44, `height=${box?.height}`);
  }
  await ctx.close();
}

console.log("\n[/signage/map] ピン選択ボタンの44pxタップ標的（PC 1280×900）");
{
  const ctx = await browser.newContext({ viewport: DESKTOP, serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.addInitScript(
    ({ key, items }) => window.localStorage.setItem(key, JSON.stringify(items)),
    {
      key: "signage-map-pins",
      items: [{ id: "pin-1", label: "無読テスト地点", lat: 35.681, lng: 139.767, email: null }],
    },
  );
  await page.goto(`${BASE}/signage/map`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const openPanel = page.getByRole("button", { name: /パネルを開く/ });
  if (await openPanel.isVisible().catch(() => false)) {
    await openPanel.click();
    await page.waitForTimeout(300);
  }
  const pinButton = page.getByText("無読テスト地点").locator("..");
  const box = await pinButton.boundingBox();
  check("ピン選択ボタンが44px以上", !!box && box.height >= 44, `height=${box?.height}`);
  await ctx.close();
}

console.log("\n[/accidents] 保存済み事故事例リンクの44pxタップ標的（スマホ390×844）");
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.addInitScript(
    ({ key, items }) => window.localStorage.setItem(key, JSON.stringify(items)),
    {
      key: "safe-ai:favorites:v1",
      items: [
        {
          kind: "accident",
          id: "acc-noread-test",
          title: "無読テスト事故事例",
          subtitle: "テスト・墜落",
          href: "/accidents/acc-noread-test",
          addedAt: "2026-07-04T00:00:00.000Z",
        },
      ],
    },
  );
  await page.goto(`${BASE}/accidents`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const link = page.getByRole("link", { name: /無読テスト事故事例/ });
  const box = await link.boundingBox();
  check("保存済み事故事例リンクが44px以上", !!box && box.height >= 44, `height=${box?.height}`);
  await ctx.close();
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
