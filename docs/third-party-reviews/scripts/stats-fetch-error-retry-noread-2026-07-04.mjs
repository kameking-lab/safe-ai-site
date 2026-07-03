/**
 * 無読テスト（柱0外バグ是正／取得失敗時の状態矛盾・2026-07-04）
 *
 * 背景: /stats（StatsDashboardImpl.tsx）は取得失敗時に「データ取得に失敗しました」バナーと
 *       「読み込み中…」ボックスが同時かつ永続的に表示され続けていた（loading===falseでも
 *       data===nullのままなので `loading || !data` が真のまま固定＝再試行手段も無し）。
 *       是正=エラー時はエラーバナー＋「再試行」ボタンのみを表示し、「読み込み中…」は消す。
 *       「再試行」タップで再取得し成功すれば通常表示へ復帰する。
 *
 * ペルソナ「段落を絶対に読まず色とデカい要素しか見ない現場/担当」。
 *   ① /api/stats を失敗させると「読み込み中…」は残留しない（エラーのみ表示）
 *   ② エラーバナーに「再試行」ボタン(44px以上)がある
 *   ③ 「再試行」タップ後、/api/stats が成功すれば通常の結論カード表示に復帰する
 *   ④ h1=1（多重/欠落なし）
 * を本文を読まず3秒で満たすか固定する。
 *
 * 実行: cp docs/third-party-reviews/scripts/stats-fetch-error-retry-noread-2026-07-04.mjs web/tmp-noread-stats-error.mjs
 *       cd web && BASE_URL=http://localhost:3100 node tmp-noread-stats-error.mjs && rm tmp-noread-stats-error.mjs
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

  let fail = true;
  await page.route("**/api/stats?*", (route) => {
    if (fail) {
      return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        period: "30d",
        source: "ga4",
        generatedAt: "2026-07-04T00:00:00.000Z",
        summary: {
          dau: 12,
          mau: 340,
          pv: 12345,
          avgSessionSec: 90,
          bounceRate: 0.4,
          deltas: { dau: 0, mau: 0, pv: 0, avgSessionSec: 0, bounceRate: 0 },
        },
        features: [],
        pages: [],
        sources: [],
        flow: [],
        conversions: { amazonClicks: 0, rakutenClicks: 0, ctr: 0, byPage: [] },
        chatbot: { totalQuestions: 0, avgResponseMs: 0, byCategory: [] },
        insights: { unusedFeatures: [], growingFeatures: [], summary: "" },
      }),
    });
  });

  await page.goto(`${BASE}/stats`, { waitUntil: "domcontentloaded" });

  const errorBanner = page.getByText(/データ取得に失敗しました/);
  await errorBanner.waitFor({ state: "visible", timeout: 15000 });

  // ① 「読み込み中…」の残留なし
  const stuckLoading = await page.getByText("読み込み中…").count();
  ok("① 取得失敗後「読み込み中…」が残留しない", stuckLoading === 0, `count=${stuckLoading}`);

  // ② 再試行ボタンが44px以上
  const retryButton = page.getByRole("button", { name: "再試行" });
  await retryButton.waitFor({ state: "visible" });
  const retryBox = await retryButton.boundingBox();
  ok("② 再試行ボタンが44px以上", retryBox && retryBox.height >= 44, retryBox ? `h=${Math.round(retryBox.height)}px` : "no button");

  // ③ 再試行タップ後、成功すれば通常表示に復帰
  fail = false;
  await retryButton.click();
  const card = page.locator('section[role="status"]').first();
  await card.waitFor({ state: "visible", timeout: 15000 });
  const cardTxt = (await card.innerText()).replace(/\s+/g, " ").trim();
  ok("③ 再試行成功で結論カード(アクセス実績)に復帰", cardTxt.includes("アクセス実績") && cardTxt.includes("12,345"), cardTxt.slice(0, 60));
  ok("③ エラーバナーが消える", (await page.getByText(/データ取得に失敗しました/).count()) === 0);

  // ④ h1=1
  const h1 = await page.locator("h1").count();
  ok("④ h1=1(多重/欠落なし)", h1 === 1, `h1=${h1}`);

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
