/**
 * 無読テスト（柱0補充／未レビュー route の初回柱0適用＋タップ標的是正・2026-07-03）
 * 雛形: batch9-count-cards-noread-2026-06-14.mjs
 *
 * 対象: /stats（利用統計ダッシュボード）。ローカル未接続環境では GA4/Search Console が
 * live にならないため、本スクリプトは「未接続」結論カードの表示を固定する
 * （ga4Live 分岐の PV 実績カードは StatsDashboardImpl.test.tsx の単体テストで検証済み）。
 *
 * ペルソナ「段落を絶対に読まず色とデカい要素しか見ない現場/担当」。
 *   ① 結論カード(section[role=status])がファーストビュー内にある
 *   ② サンプル(モック)数値を一切表示しない（捏造防止＝未接続時は value なし）
 *   ③ DOM順で結論カードが期間切替タブより前（結論ファースト）
 *   ④ 期間切替タブ(role=tab)が44px以上のタップ標的
 *   ⑤ h1=1（多重/欠落h1なし）
 * を本文を読まず3秒で満たすか固定する。
 *
 * 実行: cp docs/third-party-reviews/scripts/stats-conclusion-card-44px-noread-2026-07-03.mjs web/tmp-noread-stats.mjs
 *       cd web && BASE_URL=http://localhost:3100 node tmp-noread-stats.mjs && rm tmp-noread-stats.mjs
 * 前提: prod サーバ起動済み（npm run build && PORT=3100 npm run start 推奨）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, serviceWorkers: "block" });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/stats`, { waitUntil: "domcontentloaded" });

  const card = page.locator('section[role="status"]').first();
  await card.waitFor({ state: "visible", timeout: 10000 });
  const box = await card.boundingBox();
  const txt = (await card.innerText()).replace(/\s+/g, " ").trim();

  ok(`① 結論カードがファーストビュー内(y<${VIEWPORT.height})`, box && box.y >= 0 && box.y < VIEWPORT.height, box ? `y=${Math.round(box.y)}` : "no box");
  ok("② 未接続時はサンプル数値なし（結論カードにデカ数字なし）", (await card.locator(".text-5xl").count()) === 0, txt.slice(0, 60));
  ok("② 「未接続」表示", txt.includes("未接続"), txt.slice(0, 60));

  const cardBeforeTabs = await page.evaluate(() => {
    const card = document.querySelector('section[role="status"]');
    const tab = document.querySelector('[role="tab"]');
    if (!card) return false;
    if (!tab) return true;
    return !!(card.compareDocumentPosition(tab) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  ok("③ 結論カードが期間切替タブより前(結論ファースト)", cardBeforeTabs);

  const tabCount = await page.locator('[role="tab"]').count();
  if (tabCount > 0) {
    const heights = [];
    for (let i = 0; i < tabCount; i++) {
      const b = await page.locator('[role="tab"]').nth(i).boundingBox();
      heights.push(b ? Math.round(b.height) : 0);
    }
    ok(`④ 期間切替タブ(${tabCount}個)が44px以上`, heights.every((h) => h >= 44), `heights=${heights.join(",")}`);
  } else {
    ok("④ 期間切替タブ(未接続のため非表示=対象外)", true, "anyLive=false");
  }

  const h1 = await page.locator("h1").count();
  ok("⑤ h1=1(多重/欠落なし)", h1 === 1, `h1=${h1}`);

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    console.log("FAILED:", failed.map((f) => f.name).join("; "));
    process.exit(1);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
