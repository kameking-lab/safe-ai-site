#!/usr/bin/env node
/**
 * NIQ-SEO2: 横断検索の応答ms実測ベンチ（スコアカード§2-4「測定不能（自側未計測）」の解消）。
 *
 * ⌘K/（/search）に代表クエリを入力→結果が描画されるまでの時間を Playwright で実測し、
 * p50/p95 を出す。クライアント内検索（ネットワーク往復なし）の体感速度を数値化する。
 * CI常設は不要（四半期再計測 NIQ-OPS1 から手動で呼ぶ）。生成JSONはコミットしない。
 *
 * 代表クエリ10語は web/src/lib/field-vernacular-bench.fixture.ts の searchQuery から
 * 抽出した現場語（俗称着地率100%の実測対象）。数字の陳腐化を防ぐため、四半期再計測時に
 * 本スクリプトを再実行してスコアカード§2-4を更新する。
 *
 * Usage:
 *   1) 別ターミナルで本番同等のビルドを起動:  npm run build && npm start
 *   2) node scripts/search-latency-bench.mjs
 *   環境変数: SEARCH_BENCH_BASE_URL（既定 http://127.0.0.1:3000）/ SEARCH_BENCH_RUNS（各クエリの計測回数・既定3）
 */
import { chromium } from "@playwright/test";

const BASE_URL = process.env.SEARCH_BENCH_BASE_URL || "http://127.0.0.1:3000";
const RUNS = Number(process.env.SEARCH_BENCH_RUNS || 3);
const NAV_TIMEOUT = 20000;
const RESULT_TIMEOUT = 10000;

// field-vernacular-bench.fixture.ts の searchQuery から抽出した代表10語（現場語・俗称）。
const QUERIES = [
  "ユンボ 免許",
  "クビ 何日前",
  "残業 上限",
  "有給 日数",
  "マンホール 資格",
  "アーク溶接 資格",
  "フォークリフト 資格",
  "足場 高さ",
  "石綿 事前調査",
  "熱中症 対策",
];

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return NaN;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

async function measureOnce(page, query) {
  // 毎回まっさらな /search から測る（結果メモの温まりを避ける）。
  await page.goto(`${BASE_URL}/search`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  const input = page.getByLabel("サイト内を横断検索");
  await input.waitFor({ state: "visible", timeout: NAV_TIMEOUT });
  await input.fill(query);
  // 入力→描画の実測。performance.now を page 内で基準化し、結果ヘッダ出現までを測る。
  const t0 = await page.evaluate(() => performance.now());
  await input.press("Enter");
  // 「「…」の検索結果 N件」ヘッダ、または結果0件メッセージのどちらかが出れば描画完了。
  await page.waitForFunction(
    () => /の検索結果|該当する結果|見つかりま/.test(document.body.innerText),
    undefined,
    { timeout: RESULT_TIMEOUT }
  );
  const t1 = await page.evaluate(() => performance.now());
  return t1 - t0;
}

async function main() {
  // 一部の実行環境は @playwright/test 同梱のブラウザDLが無い。その場合は
  // SEARCH_BENCH_CHROMIUM に既存 Chromium の実行パスを渡す（未指定なら既定DLを使う）。
  const executablePath = process.env.SEARCH_BENCH_CHROMIUM || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage();
  const samples = [];
  const perQuery = [];

  try {
    for (const q of QUERIES) {
      const qSamples = [];
      // 1回はウォームアップとして捨てる。
      try {
        await measureOnce(page, q);
      } catch {
        /* ウォームアップ失敗は無視 */
      }
      for (let i = 0; i < RUNS; i += 1) {
        const ms = await measureOnce(page, q);
        qSamples.push(ms);
        samples.push(ms);
      }
      const sorted = [...qSamples].sort((a, b) => a - b);
      perQuery.push({ query: q, p50: Math.round(percentile(sorted, 50)) });
      console.log(`  ${q.padEnd(18)} p50=${Math.round(percentile(sorted, 50))}ms  (n=${qSamples.length})`);
    }
  } finally {
    await browser.close();
  }

  const sortedAll = [...samples].sort((a, b) => a - b);
  const summary = {
    baseUrl: BASE_URL,
    queries: QUERIES.length,
    runsPerQuery: RUNS,
    totalSamples: samples.length,
    p50Ms: Math.round(percentile(sortedAll, 50)),
    p95Ms: Math.round(percentile(sortedAll, 95)),
    minMs: Math.round(Math.min(...samples)),
    maxMs: Math.round(Math.max(...samples)),
  };
  console.log("\n=== 横断検索 応答ms（入力→結果描画） ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\n※ この要約を docs/nihonichi-scorecard.md §2-4 に転記（生成JSONはコミットしない）。");
}

main().catch((err) => {
  console.error("search-latency-bench failed:", err?.message ?? err);
  process.exit(1);
});
