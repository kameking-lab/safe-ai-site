/**
 * 無読テスト（柱0・/mental-health-management ハブへの結論カード新設・2026-07-03）
 * 雛形: mental-health-hub-conclusion-card-44px-noread-2026-07-03.mjs
 *
 * 背景: /mental-health-management（メンタルヘルス対策実務ガイド・ハブ）は PageHeader直後が
 *       AlertCircleの制度説明プローズ（労務管理ガイドとしての位置付け）のみで、色帯・デカ数字・
 *       「次にやること」の視覚結論(ConclusionCard)を持たなかった。
 *       配下の3子ページ（stress-check/small-business/interview-guidance）はいずれも既に
 *       ConclusionCardを持つのに、親のハブページ自体だけが無読テストに落ちていた。
 *       → PageHeader直後にConclusionCardを新設（既存3実務ガイドの本数を転記のみ）。
 *
 * ペルソナ「段落を絶対に読まず色とデカい要素しか見ない人事・産業保健担当者」。
 *   ① ConclusionCard(role=status)がファーストビュー内にある
 *   ② デカ数字(font-size>=32px)＋アクション導線(44px以上)を持つ
 *   ③ DOM順で結論カードが既存の制度説明プローズ(「事業者・人事・産業保健担当者向けの労務管理ガイド」を含むsection)より前
 *   ④ h1=1（多重/欠落なし）
 * を本文を読まず満たすか固定する。
 *
 * 実行: cp docs/third-party-reviews/scripts/mental-health-mgmt-hub-conclusion-card-noread-2026-07-03.mjs web/tmp-noread-mhm.mjs
 *       cd web && BASE_URL=http://localhost:3100 node tmp-noread-mhm.mjs && rm tmp-noread-mhm.mjs
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
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    serviceWorkers: "block",
  });

  const page = await ctx.newPage();
  await page.goto(`${BASE}/mental-health-management`, { waitUntil: "domcontentloaded" });

  const card = page.locator('section[role="status"]').first();
  await card.waitFor({ state: "visible", timeout: 15000 });
  const box = await card.boundingBox();
  const txt = (await card.innerText()).replace(/\s+/g, " ").trim();

  // ① ファーストビュー内
  ok(
    `① 結論カードがファーストビュー内(y<${VIEWPORT.height})`,
    box && box.y >= 0 && box.y < VIEWPORT.height,
    box ? `y=${Math.round(box.y)}` : "no box",
  );

  // ② デカ数字(>=32px)＋短ラベル
  const maxFont = await card.evaluate((root) => {
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
  ok(`② デカ数字(>=32px)`, maxFont >= 32, `maxFont=${maxFont}px`);
  ok(`② 短ラベル「実務ガイド」`, txt.includes("実務ガイド"), txt.slice(0, 60));

  const actionLink = card.locator("a").first();
  const actionBox = await actionLink.boundingBox();
  ok(
    `② アクション導線44px以上`,
    actionBox && actionBox.height >= 44,
    actionBox ? `h=${Math.round(actionBox.height)}px` : "no action link",
  );

  // ③ DOM順で結論カードが既存の制度説明プローズより前
  const cardFirst = await page.evaluate(() => {
    const card = document.querySelector('section[role="status"]');
    const prose = Array.from(document.querySelectorAll("section")).find((s) =>
      (s.textContent || "").includes("事業者・人事・産業保健担当者向けの労務管理ガイド"),
    );
    if (!card || !prose) return false;
    return !!(card.compareDocumentPosition(prose) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  ok(`③ 結論カードが制度説明プローズより前(結論ファースト)`, cardFirst);

  // ④ h1=1
  const h1 = await page.locator("h1").count();
  ok(`④ h1=1(多重/欠落なし)`, h1 === 1, `h1=${h1}`);

  await page.close();
  await browser.close();
  const fails = results.filter((r) => !r.pass);
  console.log(`\n${results.length - fails.length}/${results.length} PASS`);
  if (fails.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
