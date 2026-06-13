/**
 * 無読テスト（柱0バッチ9/9 第2弾 状態系 /insurance・/bcp・/organization・2026-06-14）
 * 雛形: law-search-visual-first-2026-06-13.mjs
 *
 * ペルソナ「保険/BCP/組織の"いまの状態"を3秒で知りたい・段落は読まない」。
 * 色とデカ数字・アイコン・短ラベルだけ見て「いまどの状態か／次にどこを押すか」が分かるか。
 *
 * 判定:
 *   /insurance   ① h1=1 ② 結論カード(role=status)がファーストビュー内
 *                ③ 短ラベル「未加入」がカード内 ④ action「個別に相談」→/contact
 *                ⑤ 企業のご利用(調達基準)が初期折りたたみ
 *   /bcp         ① h1=1 ② 結論カードがファーストビュー内・デカ数字≥40px(99)
 *                ③ 短ラベル「稼働率目標」 ④ action「保険状況を見る」→/insurance
 *   /organization ① h1=1 ② 結論カードがファーストビュー内・デカ数字≥40px(83.5%)
 *                ③ 短ラベル「教育修了率」 ④ 補助チップ(StatusBadge)≥2
 *
 * 実行: cp docs/third-party-reviews/scripts/status-pages-conclusion-cards-2026-06-14.mjs web/tmp-noread-st.mjs
 *       cd web && npm run build && (npm run start -- -p 3100 &) を起動後
 *       BASE_URL=http://localhost:3100 node tmp-noread-st.mjs && rm tmp-noread-st.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3100";
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

  // ===== /insurance =====
  await page.goto(`${BASE}/insurance`, { waitUntil: "domcontentloaded" });
  ok("insurance ① h1=1", (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);

  const iCard = page.locator('section[role="status"]').first();
  await iCard.waitFor({ state: "visible", timeout: 10000 });
  const iBox = await iCard.boundingBox();
  ok("insurance ② 結論カードがファーストビュー内(y<700)", iBox && iBox.y < 700, iBox ? `y=${Math.round(iBox.y)}` : "no box");
  ok("insurance ③ 短ラベル「未加入」がカード内", (await iCard.innerText()).includes("未加入"));
  const iAction = iCard.getByRole("link", { name: /個別に相談/ });
  const iHref = (await iAction.count()) ? await iAction.first().getAttribute("href") : null;
  ok("insurance ④ action「個別に相談」→/contact", iHref === "/contact", `href=${iHref}`);

  const procOpen = await page
    .locator("details", { hasText: "企業のご利用について" })
    .first()
    .evaluate((el) => el.open)
    .catch(() => null);
  ok("insurance ⑤ 企業のご利用(調達基準)が初期折りたたみ", procOpen === false, `open=${procOpen}`);

  // ===== /bcp =====
  await page.goto(`${BASE}/bcp`, { waitUntil: "domcontentloaded" });
  ok("bcp ① h1=1", (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);

  const bCard = page.locator('section[role="status"]').first();
  await bCard.waitFor({ state: "visible", timeout: 10000 });
  const bBox = await bCard.boundingBox();
  ok("bcp ② 結論カードがファーストビュー内(y<700)", bBox && bBox.y < 700, bBox ? `y=${Math.round(bBox.y)}` : "no box");
  const bFont = await bigFontIn(bCard);
  ok("bcp ② デカ数字≥40px", bFont >= 40, `${Math.round(bFont)}px`);
  ok("bcp ③ 短ラベル「稼働率目標」", (await bCard.innerText()).includes("稼働率目標"));
  const bAction = bCard.getByRole("link", { name: /保険状況を見る/ });
  const bHref = (await bAction.count()) ? await bAction.first().getAttribute("href") : null;
  ok("bcp ④ action「保険状況を見る」→/insurance", bHref === "/insurance", `href=${bHref}`);

  // ===== /organization =====
  await page.goto(`${BASE}/organization`, { waitUntil: "domcontentloaded" });
  ok("organization ① h1=1", (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);

  const oCard = page.locator('section[role="status"]').first();
  await oCard.waitFor({ state: "visible", timeout: 10000 });
  const oBox = await oCard.boundingBox();
  ok("organization ② 結論カードがファーストビュー内(y<700)", oBox && oBox.y < 700, oBox ? `y=${Math.round(oBox.y)}` : "no box");
  const oFont = await bigFontIn(oCard);
  ok("organization ② デカ数字≥40px", oFont >= 40, `${Math.round(oFont)}px`);
  ok("organization ③ 短ラベル「教育修了率」", (await oCard.innerText()).includes("教育修了率"));
  // 補助チップ(StatusBadge)= 丸枠の span が2つ以上
  const chips = await oCard.locator("span.rounded-full").count();
  ok("organization ④ 補助チップ(StatusBadge)≥2", chips >= 2, `chips=${chips}`);

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n===== ${passed}/${results.length} PASS =====`);
  if (passed !== results.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
