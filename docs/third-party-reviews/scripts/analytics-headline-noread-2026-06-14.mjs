/**
 * 無読テスト（柱0・/accidents-analytics 統計DB規模ヘッドライン・2026-06-14）
 * 雛形: batch9-count-cards-noread-2026-06-14.mjs
 *
 * 背景: 自領域25ルートの無読スウィープ（tools-noread-sweep）で /accidents-analytics は
 *       ファーストビュー maxFont=22・デカ数字なしと判定。事故統計ダッシュボードなのに
 *       初期ビューはナビ＋h1＋出力ツールバー＋「業種を選んで」案内のみで、肝心の
 *       「このDBは何件の労働災害を集計しているか」が fold 下（サマリーKPIは line441）。
 *       → h1直下に統計DBの規模をデカ数字で出すヘッドラインを新設（結論ファースト）。
 *
 * ペルソナ「段落を絶対に読まず色とデカい要素しか見ない現場/担当」。
 * ヘッドライン([data-testid=analytics-headline]) が
 *   ① ファーストビュー（初期ビューポート内）にある
 *   ② デカ数字(font-size>=32px)＋単位「件」＋漢字短ラベル「収録」で規模を伝える
 *   ③ DOM順で最初の入力(業種select等)より前にある（結論ファースト＝最上部）
 *   ④ h1=1（多重/欠落h1なし）
 *   ⑤ 値が下のサマリーKPI「収録総件数」と一致（転記＝捏造なし）
 * を本文を読まず満たすか固定する。
 *
 * 実行: cp docs/third-party-reviews/scripts/analytics-headline-noread-2026-06-14.mjs web/tmp-noread-ah.mjs
 *       cd web && BASE_URL=http://localhost:3100 node tmp-noread-ah.mjs && rm tmp-noread-ah.mjs
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

const PATH = "/accidents-analytics";

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}${PATH}`, { waitUntil: "domcontentloaded" });

  // ダッシュボードは ssr:false（dynamic import）のため描画を待つ
  const headline = page.locator('[data-testid="analytics-headline"]').first();
  await headline.waitFor({ state: "visible", timeout: 15000 });
  const box = await headline.boundingBox();
  const txt = (await headline.innerText()).replace(/\s+/g, " ").trim();

  // ① ファーストビュー内
  ok(
    `${PATH} ① ヘッドラインがファーストビュー内(y<${VIEWPORT.height})`,
    box && box.y >= 0 && box.y < VIEWPORT.height,
    box ? `y=${Math.round(box.y)}` : "no box",
  );

  // ② デカ数字(font-size>=32px)＋単位＋漢字短ラベル
  const maxFont = await headline.evaluate((root) => {
    let max = 0;
    root.querySelectorAll("*").forEach((el) => {
      const hasOwnText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim().length > 0,
      );
      if (!hasOwnText) return;
      const f = parseFloat(getComputedStyle(el).fontSize) || 0;
      if (f > max) max = f;
    });
    return Math.round(max);
  });
  ok(`${PATH} ② デカ数字(>=32px)`, maxFont >= 32, `maxFont=${maxFont}px`);
  ok(`${PATH} ② 単位「件」`, txt.includes("件"), txt.slice(0, 60));
  ok(`${PATH} ② 漢字短ラベル「収録」`, txt.includes("収録"), txt.slice(0, 60));

  // ③ DOM順でヘッドラインが最初の入力(業種select等)より前
  const beforeInput = await page.evaluate(() => {
    const h = document.querySelector('[data-testid="analytics-headline"]');
    const input = document.querySelector("input, select, textarea");
    if (!h) return false;
    if (!input) return true;
    return !!(h.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  ok(`${PATH} ③ ヘッドラインが最初の入力より前(結論ファースト)`, beforeInput);

  // ④ h1=1
  const h1 = await page.locator("h1").count();
  ok(`${PATH} ④ h1=1(多重/欠落なし)`, h1 === 1, `h1=${h1}`);

  // ⑤ ヘッドラインのデカ数字が下のサマリーKPI「収録総件数」と一致（転記＝捏造なし）
  const consistent = await page.evaluate(() => {
    const onlyDigits = (s) => (s.match(/[\d,]+/g) || []).map((x) => x.replace(/,/g, ""));
    const h = document.querySelector('[data-testid="analytics-headline"]');
    if (!h) return { pass: false, detail: "no headline" };
    // ヘッドラインの最大の数（＝収録総件数）
    const headNums = onlyDigits(h.textContent || "").map(Number);
    const headMax = Math.max(...headNums, 0);
    // サマリーKPI「収録総件数」カードの数
    const kpi = Array.from(document.querySelectorAll("div")).find(
      (d) =>
        (d.textContent || "").includes("収録総件数") &&
        d.querySelector(".tabular-nums"),
    );
    if (!kpi) return { pass: false, detail: "no 収録総件数 KPI" };
    const kpiNums = onlyDigits(kpi.querySelector(".tabular-nums").textContent || "").map(
      Number,
    );
    const kpiVal = Math.max(...kpiNums, 0);
    return { pass: headMax === kpiVal && headMax > 0, detail: `headline=${headMax} kpi=${kpiVal}` };
  });
  ok(`${PATH} ⑤ デカ数字=サマリーKPI収録総件数(転記)`, consistent.pass, consistent.detail);

  await browser.close();
  const fails = results.filter((r) => !r.pass);
  console.log(`\n${results.length - fails.length}/${results.length} PASS`);
  if (fails.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
