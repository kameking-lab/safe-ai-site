/**
 * 無読テスト（柱0バッチ9/9 件数結論カードの回帰固定・2026-06-14）
 * 雛形: newsletter-status-card-2026-06-14.mjs
 *
 * 対象: 検索/件数系3ページ（PR #527 でデカ数字の件数結論カードを敷設済だが
 *       専用の無読スクリプトが無かった3本）。
 *   - /chemical-database … 収録物質数（mode=mhlw 既定）
 *   - /goods            … 掲載品目数
 *   - /subsidies        … 活用可能な制度数
 *
 * ペルソナ「段落を絶対に読まず色とデカい要素しか見ない現場/担当」。
 * 各ページの結論カード(ConclusionCard=section[role=status])が
 *   ① ファーストビュー（スクロールせず見える初期ビューポート内）にある
 *   ② デカ数字(text-5xl)＋単位＋漢字短ラベルで「いまの状態(件数)」を伝える
 *   ③ DOM順で検索/絞り込みコントロールより前にある（結論ファースト＝最上部）
 *   ④ h1=1（多重/欠落h1なし）
 * を本文を読まず3秒で満たすか固定する（既存実装の回帰防止）。
 *
 * 実行: cp docs/third-party-reviews/scripts/batch9-count-cards-noread-2026-06-14.mjs web/tmp-noread-b9.mjs
 *       cd web && BASE_URL=http://localhost:3100 node tmp-noread-b9.mjs && rm tmp-noread-b9.mjs
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

// 各ページの結論カード（既定状態）に出る漢字短ラベルと単位
const PAGES = [
  { path: "/chemical-database", label: "収録", unit: "物質" },
  { path: "/goods", label: "掲載", unit: "品目" },
  { path: "/subsidies", label: "活用可能", unit: "制度" },
];

const check = async (page, { path, label, unit }) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });

  const card = page.locator('section[role="status"]').first();
  await card.waitFor({ state: "visible", timeout: 10000 });
  const box = await card.boundingBox();
  const txt = (await card.innerText()).replace(/\s+/g, " ").trim();

  // ① ファーストビュー内（初期ビューポート高さ未満＝スクロール無しで見える）
  ok(
    `${path} ① 結論カードがファーストビュー内(y<${VIEWPORT.height})`,
    box && box.y >= 0 && box.y < VIEWPORT.height,
    box ? `y=${Math.round(box.y)}` : "no box",
  );

  // ② デカ数字(text-5xl)＋単位＋漢字短ラベル
  const bigCount = await card.locator(".text-5xl").count();
  ok(`${path} ② デカ数字(text-5xl)あり`, bigCount >= 1, `text-5xl=${bigCount}`);
  ok(`${path} ② 単位「${unit}」`, txt.includes(unit), txt.slice(0, 50));
  ok(`${path} ② 漢字短ラベル「${label}」`, txt.includes(label), txt.slice(0, 50));

  // ③ DOM順で結論カードが最初の検索/絞り込み入力より前（結論ファースト）
  const cardBeforeInput = await page.evaluate(() => {
    const card = document.querySelector('section[role="status"]');
    const input = document.querySelector(
      'input[type="search"], input[type="text"], select, textarea',
    );
    if (!card) return false;
    if (!input) return true; // 入力が無ければ結論カードのみ＝OK
    return !!(
      card.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING
    );
  });
  ok(`${path} ③ 結論カードが検索入力より前(結論ファースト)`, cardBeforeInput);

  // ④ h1=1
  const h1 = await page.locator("h1").count();
  ok(`${path} ④ h1=1(多重/欠落なし)`, h1 === 1, `h1=${h1}`);
};

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();

  for (const p of PAGES) {
    await check(page, p);
  }

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
