/**
 * 無読テスト（柱0・/mental-health ハブへの結論カード新設＋フッターCTA 44px化・2026-07-03）
 * 雛形: treatment-work-balance-conclusion-cards-noread-2026-07-03.mjs
 *
 * 背景: /mental-health（メンタルヘルス・ハラスメント・VDT作業ハブ）は PageHeader直後が
 *       AlertCircleの制度説明プローズ（「見えない半分」の説明）のみで、色帯・デカ数字・
 *       「次にやること」の視覚結論(ConclusionCard)を持たなかった。
 *       末尾の相談窓口セクションのCTAリンク2本もmin-h指定が無く44px未満だった。
 *       → PageHeader直後にConclusionCardを新設（既存4分野の見出し数を転記のみ）、
 *         フッターCTA2本にmin-h-[44px]を付与。
 *
 * ペルソナ「段落を絶対に読まず色とデカい要素しか見ない人事・安全衛生担当」。
 *   ① ConclusionCard(role=status)がファーストビュー内にある
 *   ② デカ数字(font-size>=32px)＋アクション導線(44px以上)を持つ
 *   ③ DOM順で結論カードが既存の制度説明プローズ(「見えない半分」を含むsection)より前
 *   ④ h1=1（多重/欠落なし）
 *   ⑤ フッターCTA2本（多様な働き方の安全／安全用語辞書）が44px以上
 * を本文を読まず満たすか固定する。
 *
 * 実行: cp docs/third-party-reviews/scripts/mental-health-hub-conclusion-card-44px-noread-2026-07-03.mjs web/tmp-noread-mh.mjs
 *       cd web && BASE_URL=http://localhost:3100 node tmp-noread-mh.mjs && rm tmp-noread-mh.mjs
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
  await page.goto(`${BASE}/mental-health`, { waitUntil: "domcontentloaded" });

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
  ok(`② 短ラベル「要点まとめ」`, txt.includes("要点まとめ"), txt.slice(0, 60));

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
      (s.textContent || "").includes("見えない半分"),
    );
    if (!card || !prose) return false;
    return !!(card.compareDocumentPosition(prose) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  ok(`③ 結論カードが制度説明プローズより前(結論ファースト)`, cardFirst);

  // ④ h1=1
  const h1 = await page.locator("h1").count();
  ok(`④ h1=1(多重/欠落なし)`, h1 === 1, `h1=${h1}`);

  // ⑤ フッターCTA2本が44px以上
  const diversityLink = page.getByRole("link", { name: "多様な働き方の安全 →" });
  const glossaryLink = page.getByRole("link", { name: "安全用語辞書" });
  await diversityLink.scrollIntoViewIfNeeded();
  const diversityBox = await diversityLink.boundingBox();
  const glossaryBox = await glossaryLink.boundingBox();
  ok(
    `⑤ 「多様な働き方の安全」CTAが44px以上`,
    diversityBox && diversityBox.height >= 44,
    diversityBox ? `h=${Math.round(diversityBox.height)}px` : "no link",
  );
  ok(
    `⑤ 「安全用語辞書」CTAが44px以上`,
    glossaryBox && glossaryBox.height >= 44,
    glossaryBox ? `h=${Math.round(glossaryBox.height)}px` : "no link",
  );

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
