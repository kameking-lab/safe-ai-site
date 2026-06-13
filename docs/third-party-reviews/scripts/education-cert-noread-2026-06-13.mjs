/**
 * 無読テスト（柱0バッチ5/9 教育・資格 ビジュアルファースト・2026-06-13）
 * 雛形: risk-prediction-noread-2026-06-13.mjs
 *
 * 対象: /education-certification（DB）・/education-certification/finder（判定）・/education（ハブ）
 *
 * ペルソナ「人を新しく現場に入れる一人親方・52歳」— 段落は絶対に読まない。色とデカい数字・
 *   アイコンだけ見る。スマホで3秒見て「何種あるか／うちの作業に必要な資格は何か」が
 *   分からなければ閉じて電話で問い合わせる。
 *
 * 判定（docs/visual-language-2026-06-10.md §4 無読テスト）:
 *  DB    ① h1は1個 ② 結論カード(role=status)がデカ数字(≥40px) ③ 区分タイル4枚（ピクトグラム＋デカ数字）
 *        ④ 法的根拠の段落は初期折りたたみ（消さず詳細層へ＝法令正確性は不可侵）
 *  判定  ⑤ 未検索では結論カードなし（空状態） ⑥ シナリオ1タップで結論カード(role=status)が出る ⑦ h1は1個
 *  ハブ  ⑧ h1は1個 ⑨ 区分見出し3つにピクトグラム（svg） ⑩ プロジェクト説明は初期折りたたみ
 *
 * 実行: cp docs/third-party-reviews/scripts/education-cert-noread-2026-06-13.mjs web/tmp-noread-edu.mjs
 *       cd web && node tmp-noread-edu.mjs && rm tmp-noread-edu.mjs
 * 前提: サーバー (localhost:3000) 起動済み（devハング回避のため npm run start 推奨）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();

  // ===== /education-certification（DB）=====
  await page.goto(`${BASE}/education-certification`, { waitUntil: "networkidle" });

  ok("① DB: h1は1個", (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);

  const dbCard = page.locator('[role="status"]').first();
  await dbCard.waitFor({ state: "visible", timeout: 10000 });
  const dbBox = await dbCard.boundingBox();
  ok("② DB: 結論カードがファーストビュー上部", dbBox && dbBox.y >= -1 && dbBox.y + 80 < 844, dbBox ? `y=${Math.round(dbBox.y)}` : "no box");
  const dbBig = dbCard.locator("span.text-5xl").first();
  const dbFont = await dbBig.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)).catch(() => 0);
  const dbBigText = ((await dbBig.textContent().catch(() => "")) || "").trim();
  ok("② DB: 収録数がデカ数字(≥40px)", dbFont >= 40, `${Math.round(dbFont)}px "${dbBigText}"`);

  // ③ 区分タイル4枚（アンカーリンク＋svgピクトグラム＋デカ数字）
  const tiles = page.locator('section[aria-label="資格区分別の収録数"] a[href^="#sec-"]');
  const tileCount = await tiles.count();
  let tilesWithIcon = 0;
  for (let i = 0; i < tileCount; i++) {
    if ((await tiles.nth(i).locator("svg").count()) > 0) tilesWithIcon++;
  }
  ok("③ DB: 区分タイル4枚にピクトグラム", tileCount === 4 && tilesWithIcon === 4, `tiles=${tileCount} icon=${tilesWithIcon}`);

  // ④ 法的根拠は初期折りたたみ
  const legalOpen = await page
    .locator("details", { hasText: "法的根拠について" })
    .first()
    .evaluate((el) => el.open)
    .catch(() => null);
  ok("④ DB: 法的根拠の段落は初期折りたたみ", legalOpen === false, `open=${legalOpen}`);

  // ===== /education-certification/finder（判定）=====
  await page.goto(`${BASE}/education-certification/finder`, { waitUntil: "networkidle" });
  ok("⑦ 判定: h1は1個", (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);

  // ⑤ 未検索では結論カードなし
  const cardBefore = await page.locator('[role="status"]').count();
  ok("⑤ 判定: 未検索では結論カードなし（空状態）", cardBefore === 0, `role=status count=${cardBefore}`);

  // ⑥ シナリオ1タップ → 結論カードが出る
  await page.getByRole("button", { name: "高所作業車の運転", exact: true }).click();
  const finderCard = page.locator('[role="status"]').first();
  await finderCard.waitFor({ state: "visible", timeout: 10000 });
  const finderBig = finderCard.locator("span.text-5xl").first();
  const finderFont = await finderBig.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)).catch(() => 0);
  const finderText = ((await finderCard.textContent().catch(() => "")) || "").trim();
  ok("⑥ 判定: シナリオ1タップで結論カード(デカ数字)が出る", finderFont >= 40, `${Math.round(finderFont)}px "${finderText.slice(0, 40)}"`);

  // ===== /education（ハブ）=====
  await page.goto(`${BASE}/education`, { waitUntil: "networkidle" });
  ok("⑧ ハブ: h1は1個", (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);

  // ⑨ 区分見出し3つにピクトグラム
  const headings = page.locator("h3.border-l-4");
  const hCount = await headings.count();
  let hWithIcon = 0;
  for (let i = 0; i < hCount; i++) {
    if ((await headings.nth(i).locator("svg").count()) > 0) hWithIcon++;
  }
  ok("⑨ ハブ: 区分見出し3つにピクトグラム", hCount === 3 && hWithIcon === 3, `h3=${hCount} icon=${hWithIcon}`);

  // ⑩ プロジェクト説明は初期折りたたみ
  const aboutOpen = await page
    .locator("details", { hasText: "このプロジェクトについて" })
    .first()
    .evaluate((el) => el.open)
    .catch(() => null);
  ok("⑩ ハブ: プロジェクト説明は初期折りたたみ", aboutOpen === false, `open=${aboutOpen}`);

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n===== ${passed}/${results.length} PASS =====`);
  if (passed !== results.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
