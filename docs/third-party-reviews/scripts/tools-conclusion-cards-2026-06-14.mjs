/**
 * 無読テスト（柱0バッチ9/9 その他ツール=判定/件数結論カード・2026-06-14）
 * 雛形: mental-health-visual-first-2026-06-13.mjs
 *
 * ペルソナ「段落を絶対に読まず色とデカい要素しか見ない現場/担当」。
 * 各ツールの最上部に「いまの状態（該当件数・収録数・試算結果）」を伝える
 * 結論カード(ConclusionCard=section[role=status])が、本文を読まず3秒で見えるか。
 *
 * 対象（この巡回で着手したインタラクティブ判定/件数ツール5本）:
 *   /subsidies               … 件数結論カード（全7制度 / 絞り込みN件）
 *   /subsidies/calculator    … 試算状態カード（未試算 → 該当N件）
 *   /strategy/plan-generator … 規模カード（39テンプレート）
 *   /chemical-database       … 収録数カード（MHLW N物質 / 該当N件）
 *   /goods                   … 掲載数カード（N品目 / 該当N件）
 *
 * 共通判定:
 *   ① 結論カード(role=status)がファーストビュー内(y<700)
 *   ② 件数/収録数は「OK/完了」ではないため緑(emerald)を使わず案内色 info(sky)
 *      （試算「該当」だけは完了=緑(emerald)が正）
 *   ③ h1=1（多重h1なし）
 *
 * 実行: cp docs/third-party-reviews/scripts/tools-conclusion-cards-2026-06-14.mjs web/tmp-noread-tools.mjs
 *       cd web && node tmp-noread-tools.mjs && rm tmp-noread-tools.mjs
 * 前提: localhost:3000 起動済み（devハング回避のため npm run build && npm run start 推奨）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const gotoCardChecks = async (page, path, { tone = "sky", needle = "" } = {}) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  const card = page.locator('section[role="status"]').first();
  await card.waitFor({ state: "visible", timeout: 10000 });
  const box = await card.boundingBox();
  ok(`${path} ① 結論カードがファーストビュー内(y<700)`, box && box.y < 700, box ? `y=${Math.round(box.y)}` : "no box");
  const cls = (await card.getAttribute("class")) || "";
  ok(`${path} ② 案内色 ${tone}`, new RegExp(tone).test(cls), cls.slice(0, 70));
  if (needle) {
    const txt = await card.innerText();
    ok(`${path} ② 結論に「${needle}」`, txt.includes(needle), txt.replace(/\s+/g, " ").slice(0, 60));
  }
  const h1 = await page.locator("h1").count();
  ok(`${path} ③ h1=1`, h1 === 1, `h1=${h1}`);
  return { page, card };
};

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();

  // /subsidies — 全制度の件数カード（info=青）
  await gotoCardChecks(page, "/subsidies", { tone: "sky", needle: "制度" });

  // /strategy/plan-generator — 39テンプレートの規模カード（info=青）
  await gotoCardChecks(page, "/strategy/plan-generator", { tone: "sky", needle: "39" });

  // /chemical-database — 収録数カード（info=青）
  await gotoCardChecks(page, "/chemical-database", { tone: "sky", needle: "物質" });

  // /goods — 掲載品目数カード（info=青）
  await gotoCardChecks(page, "/goods", { tone: "sky", needle: "品目" });

  // /subsidies/calculator — 未試算(青) → 試算「該当N件」は完了=緑(emerald)
  {
    const { card } = await gotoCardChecks(page, "/subsidies/calculator", { tone: "sky", needle: "未試算" });
    // 既定は施策未選択で試算ボタン無効。施策「設備投資」を選んでから試算する。
    await page.getByRole("button", { name: /設備投資/ }).first().click();
    await page.getByRole("button", { name: /申請可能な助成金を試算する/ }).click();
    await page.waitForTimeout(500);
    const cls3 = (await card.getAttribute("class")) || "";
    const txt = await card.innerText();
    ok(
      "/subsidies/calculator ④ 試算後は緑(emerald)該当 か 黄(amber)該当なし",
      /emerald/.test(cls3) || /amber/.test(cls3),
      `${cls3.slice(0, 50)} | ${txt.replace(/\s+/g, " ").slice(0, 40)}`,
    );
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
