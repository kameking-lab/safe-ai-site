/**
 * /favorites 無読テスト 2026-06-14（柱0 44pxタップ標的 ＋ accident 種別の表示是正）
 *
 * ペルソナ: 現場で条文/通達/事故事例を「⭐」した一人親方が、スマホ(390×844)で
 * 保存一覧を3秒見て「何が・どの種別で保存されているか」「消す/開く」が押せるか。
 *
 * 検証対象（このサイクルの変更）:
 *  1) lib/favorites の kind は article/notice/accident の3種。/accidents で⭐した
 *     事故事例も同じストアに入るが、本リストは article 以外を一律「通達(violet)」と
 *     誤表示し、事故事例で絞り込むタブも無かった → 「事故事例」バッジ＋タブを是正。
 *  2) タブ・削除ボタン・空状態CTA が 44px 未満(WCAG 2.5.5不適合) → 44pxへ。
 *
 * 実行方法（build+start の本番サーバーで実行）:
 *   cd web && npm run build && npm run start   # 別ターミナル
 *   cp docs/third-party-reviews/scripts/favorites-pillar0-accident-noread-2026-06-14.mjs web/tmp-noread.mjs
 *   cd web && node tmp-noread.mjs && rm tmp-noread.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${name}`);
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// 3種のお気に入りを仕込む（accident を含めるのが要点）
const FAV_SEED = JSON.stringify([
  {
    kind: "article",
    id: "anzen|22",
    title: "第22条 健康障害の防止",
    subtitle: "安衛法 第22条",
    href: "/law-search?law=anzen&article=22",
    addedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    kind: "notice",
    id: "kihatsu-0401-1",
    title: "基発0401第1号 化学物質規制",
    subtitle: "厚生労働省 2026-04-01",
    href: "/circulars/kihatsu-0401-1",
    addedAt: "2026-06-02T09:00:00.000Z",
  },
  {
    kind: "accident",
    id: "acc-001",
    title: "足場からの墜落（建設業・死亡）",
    subtitle: "建設業",
    href: "/accidents/acc-001",
    addedAt: "2026-06-03T09:00:00.000Z",
  },
]);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

await page.addInitScript((seed) => {
  window.localStorage.setItem("safe-ai:favorites:v1", seed);
}, FAV_SEED);

await page.goto(`${BASE}/favorites`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[role="tablist"]', { timeout: 20000 });

// ---------------------------------------------------------------------------
console.log("\n■ accident 種別: 「事故事例」で正しく表示される（旧:通達と誤表示）");
{
  const accidentRow = page
    .locator("li", { has: page.locator('a:has-text("足場からの墜落")') })
    .first();
  await accidentRow.waitFor({ timeout: 10000 });
  check("事故事例エントリの行が描画される", await accidentRow.isVisible());
  check(
    "行内バッジが「事故事例」",
    await accidentRow.locator('text="事故事例"').first().isVisible(),
  );
  const hasNoticeBadge = await accidentRow.locator('span:has-text("通達")').count();
  check("旧バグ解消: 同じ行に「通達」バッジが無い", hasNoticeBadge === 0, `通達バッジ${hasNoticeBadge}個`);
}

// ---------------------------------------------------------------------------
console.log("\n■ 「事故事例」タブが出て、絞り込める（到達性）");
{
  const accidentTab = page.getByRole("tab", { name: /事故事例/ });
  check("事故事例タブが存在", (await accidentTab.count()) === 1);
  await accidentTab.click();
  await page.waitForTimeout(150);
  check(
    "絞り込み後 事故事例だけ残る",
    (await page.locator('a:has-text("足場からの墜落")').count()) === 1 &&
      (await page.locator('a:has-text("第22条")').count()) === 0,
  );
}

// ---------------------------------------------------------------------------
console.log("\n■ 柱0: 主要コントロールが 44px タップ標的（実測 boundingBox）");
{
  // すべてに戻してから測る
  await page.getByRole("tab", { name: /すべて/ }).click();
  await page.waitForTimeout(100);

  const tabs = await page.getByRole("tab").all();
  let minTab = Infinity;
  for (const t of tabs) {
    const b = await t.boundingBox();
    if (b) minTab = Math.min(minTab, b.height);
  }
  check(`全タブ高さ>=44px 実測min=${minTab}px`, minTab >= 44);

  const delBtns = await page.getByRole("button", { name: /を削除$/ }).all();
  let minDel = Infinity;
  for (const d of delBtns) {
    const b = await d.boundingBox();
    if (b) minDel = Math.min(minDel, b.width, b.height);
  }
  check(`全削除ボタンが44×44px以上 実測min辺=${minDel}px`, minDel >= 44);
}

await page.screenshot({ path: "favorites-pillar0-2026-06-14.png", fullPage: true });

// ---------------------------------------------------------------------------
console.log("\n■ 空状態の導線CTAも 44px（初訪で⭐ゼロのとき）");
{
  // 別コンテキスト（localStorage 未シード）= ⭐ゼロの初訪状態
  const emptyCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const empty = await emptyCtx.newPage();
  await empty.goto(`${BASE}/favorites`, { waitUntil: "domcontentloaded" });
  await empty.waitForSelector('a:has-text("法令検索を開く")', { timeout: 20000 });
  const ctas = await empty
    .locator('a:has-text("法令検索を開く"), a:has-text("通達一覧を開く")')
    .all();
  let minCta = Infinity;
  for (const c of ctas) {
    const b = await c.boundingBox();
    if (b) minCta = Math.min(minCta, b.height);
  }
  check(`空状態CTA高さ>=44px 実測min=${minCta}px (${ctas.length}件)`, minCta >= 44 && ctas.length === 2);
  await empty.close();
  await emptyCtx.close();
}

await ctx.close();
await browser.close();

console.log(`\n==== 無読テスト結果: ${pass} PASS / ${fail} FAIL ====`);
if (failures.length) {
  console.log("失敗項目:");
  for (const f of failures) console.log(` - ${f}`);
  process.exit(1);
}
