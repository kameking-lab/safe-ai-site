/**
 * 無読テスト（柱0バッチ4/9 法令検索系 /law-search・/circulars・/law-hierarchy・2026-06-13）
 * 雛形: risk-prediction-noread-2026-06-13.mjs
 *
 * ペルソナ「条文の所在を3秒で知りたい安全担当・段落は読まない」。
 * 色とデカ数字・アイコンだけ見て「いま何件ヒットしているか／どこを押すか」が分かるか。
 *
 * 判定:
 *   /circulars  ① h1=1 ② 結論カード(role=status)がファーストビュー内・デカ数字≥40px
 *               ③ 種別チップがアイコン付き(svg) ④ 初期描画は24件前後(≤30=39,461px是正)
 *               ⑤「さらに表示」ボタンが出る ⑥ 判例セクションの説明が初期折りたたみ
 *   /law-search ① h1=1 ② 結論カード・デカ数字≥40px ③「出典の見分け方」が初期折りたたみ
 *   /law-hierarchy ① h1=1 ② 結論カード・デカ数字≥40px ③ 絵文字📄🏛📘が本文から消えている
 *               ④ 出典注記が初期折りたたみ ⑤「使い方」段落が初期折りたたみ
 *
 * 実行: cp docs/third-party-reviews/scripts/law-search-visual-first-2026-06-13.mjs web/tmp-noread-ls.mjs
 *       cd web && node tmp-noread-ls.mjs && rm tmp-noread-ls.mjs
 * 前提: localhost:3000 起動済み（devハング回避のため npm run start 推奨）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

// 結論カード内の最大フォントサイズ（デカ数字）を取得
const bigFontIn = async (card) =>
  card.evaluate((root) => {
    let max = 0;
    root.querySelectorAll("span").forEach((el) => {
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (Number.isFinite(px) && px > max) max = px;
    });
    return max;
  });

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();

  // ===== /circulars =====
  await page.goto(`${BASE}/circulars`, { waitUntil: "networkidle" });

  ok("circulars ① h1=1", (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);

  const cCard = page.locator('section[role="status"]').first();
  await cCard.waitFor({ state: "visible", timeout: 10000 });
  const cBox = await cCard.boundingBox();
  ok("circulars ② 結論カードがファーストビュー内(y<700)", cBox && cBox.y < 700, cBox ? `y=${Math.round(cBox.y)}` : "no box");
  const cFont = await bigFontIn(cCard);
  ok("circulars ② デカ数字≥40px", cFont >= 40, `${Math.round(cFont)}px`);

  // ③ 種別チップにアイコン(svg)
  const chipSvgs = await page.locator('button[aria-pressed] svg').count();
  ok("circulars ③ 種別チップにアイコン(svg)が付く", chipSvgs >= 4, `svg=${chipSvgs}`);

  // ④ 初期描画件数（通達タイトルリンク）が24件前後
  const noticeLinks = await page.locator('ul li a[href^="/circulars/"]').count();
  ok("circulars ④ 初期描画 ≤30件（39,461px是正）", noticeLinks > 0 && noticeLinks <= 30, `links=${noticeLinks}`);

  // ⑤ 「さらに表示」ボタン
  const moreBtn = page.getByRole("button", { name: /さらに表示/ });
  ok("circulars ⑤ 「さらに表示」ボタンが出る", (await moreBtn.count()) >= 1);
  // 押すと件数が増える
  if ((await moreBtn.count()) >= 1) {
    await moreBtn.first().click();
    await page.waitForTimeout(200);
    const after = await page.locator('ul li a[href^="/circulars/"]').count();
    ok("circulars ⑤ 押下で件数が増える", after > noticeLinks, `${noticeLinks}→${after}`);
  }

  // ⑥ 判例セクション説明が初期折りたたみ
  const precDetails = await page
    .locator("details", { hasText: "このセクションについて" })
    .first()
    .evaluate((el) => el.open)
    .catch(() => null);
  ok("circulars ⑥ 判例説明が初期折りたたみ", precDetails === false, `open=${precDetails}`);

  // ===== /law-search =====
  await page.goto(`${BASE}/law-search`, { waitUntil: "networkidle" });
  ok("law-search ① h1=1", (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);

  const lsCard = page.locator('section[role="status"]').first();
  await lsCard.waitFor({ state: "visible", timeout: 10000 });
  const lsFont = await bigFontIn(lsCard);
  ok("law-search ② 結論カード・デカ数字≥40px", lsFont >= 40, `${Math.round(lsFont)}px`);

  const legendOpen = await page
    .locator("details", { hasText: "出典の見分け方" })
    .first()
    .evaluate((el) => el.open)
    .catch(() => null);
  ok("law-search ③ 出典の見分け方が初期折りたたみ", legendOpen === false, `open=${legendOpen}`);

  // ===== /law-hierarchy =====
  await page.goto(`${BASE}/law-hierarchy`, { waitUntil: "networkidle" });
  ok("law-hierarchy ① h1=1", (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);

  const lhCard = page.locator('section[role="status"]').first();
  await lhCard.waitFor({ state: "visible", timeout: 10000 });
  const lhFont = await bigFontIn(lhCard);
  ok("law-hierarchy ② 結論カード・デカ数字≥40px", lhFont >= 40, `${Math.round(lhFont)}px`);

  // ③ 絵文字が本文から消えている
  const bodyText = await page.locator("body").innerText();
  const hasEmoji = /📄|🏛|📘/.test(bodyText);
  ok("law-hierarchy ③ 絵文字📄🏛📘が消えアイコン化", !hasEmoji, hasEmoji ? "絵文字残存" : "なし");

  const discOpen = await page
    .locator("details", { hasText: "出典・ご利用上の注意" })
    .first()
    .evaluate((el) => el.open)
    .catch(() => null);
  ok("law-hierarchy ④ 出典注記が初期折りたたみ", discOpen === false, `open=${discOpen}`);

  const howtoOpen = await page
    .locator("details", { hasText: "このマップの使い方" })
    .first()
    .evaluate((el) => el.open)
    .catch(() => null);
  ok("law-hierarchy ⑤ 使い方段落が初期折りたたみ", howtoOpen === false, `open=${howtoOpen}`);

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n===== ${passed}/${results.length} PASS =====`);
  if (passed !== results.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
