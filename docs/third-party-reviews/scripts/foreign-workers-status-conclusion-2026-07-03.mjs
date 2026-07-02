/**
 * 無読テスト（柱0補充 /foreign-workers/status/[status] 全11ページ・2026-07-03）
 * 雛形: status-pages-conclusion-cards-2026-06-14.mjs
 *
 * ペルソナ「初めてこの在留資格の外国人材を受け入れる現場の安全担当」。
 * 本文を読まず3秒で「この在留資格は何か」「就労制限・転職可否」「次にやること」が分かるか。
 *
 * 判定（全11ページ共通）:
 *   ① h1=1
 *   ② 結論カード(role=status)がファーストビュー内(y<700)
 *   ③ 在留資格名がカード内の短ラベルとして読める
 *   ④ 補助チップ(StatusBadge)が3つ（在留期間・就労制限・転職可否）
 *   ⑤ action「多言語安全教育教材を見る」→/foreign-workers/safety-training
 * 就労制限・転職可否の対称チェック（代表3種）:
 *   ⑥ technical-intern-2（就労制限あり・転籍原則不可）が正しいラベル
 *   ⑦ specified-skilled-1（就労制限あり・転職可能）が正しいラベル
 *   ⑧ permanent-resident（就労制限なし・転職可能）が正しいラベル
 *
 * 実行: cp docs/third-party-reviews/scripts/foreign-workers-status-conclusion-2026-07-03.mjs web/tmp-noread-fw.mjs
 *       cd web && npm run build && (npm run start -- -p 3100 &) を起動後
 *       BASE_URL=http://localhost:3100 node tmp-noread-fw.mjs && rm tmp-noread-fw.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const STATUS_IDS = [
  "technical-intern-1",
  "technical-intern-2",
  "technical-intern-3",
  "specified-skilled-1",
  "specified-skilled-2",
  "engineer-humanities-intl",
  "skilled-labor",
  "permanent-resident",
  "long-term-resident",
  "spouse-of-japanese",
  "designated-activities-employment",
];

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();

  for (const id of STATUS_IDS) {
    await page.goto(`${BASE}/foreign-workers/status/${id}`, { waitUntil: "domcontentloaded" });

    ok(`${id} ① h1=1`, (await page.locator("h1").count()) === 1);

    const card = page.locator('section[role="status"]').first();
    await card.waitFor({ state: "visible", timeout: 10000 });
    const box = await card.boundingBox();
    ok(`${id} ② 結論カードがファーストビュー内(y<700)`, box && box.y < 700, box ? `y=${Math.round(box.y)}` : "no box");

    const h1Text = await page.locator("h1").first().innerText();
    const labelJa = h1Text.replace("の安全衛生ガイド", "");
    const cardText = await card.innerText();
    ok(`${id} ③ 在留資格名がカード内の短ラベル`, cardText.includes(labelJa), `labelJa=${labelJa}`);

    const chips = await card.locator("span.rounded-full").count();
    ok(`${id} ④ 補助チップ(StatusBadge)=3`, chips === 3, `chips=${chips}`);

    const action = card.getByRole("link", { name: /多言語安全教育教材を見る/ });
    const href = (await action.count()) ? await action.first().getAttribute("href") : null;
    ok(`${id} ⑤ action「多言語安全教育教材を見る」→/foreign-workers/safety-training`, href === "/foreign-workers/safety-training", `href=${href}`);
  }

  // ⑥⑦⑧ 就労制限・転職可否の対称チェック（代表3種）
  await page.goto(`${BASE}/foreign-workers/status/technical-intern-2`, { waitUntil: "domcontentloaded" });
  let card = page.locator('section[role="status"]').first();
  await card.waitFor({ state: "visible" });
  let text = await card.innerText();
  ok("⑥ technical-intern-2: 就労制限あり・転籍原則不可", text.includes("就労制限あり") && text.includes("転籍原則不可"));

  await page.goto(`${BASE}/foreign-workers/status/specified-skilled-1`, { waitUntil: "domcontentloaded" });
  card = page.locator('section[role="status"]').first();
  await card.waitFor({ state: "visible" });
  text = await card.innerText();
  ok("⑦ specified-skilled-1: 就労制限あり・転職可能", text.includes("就労制限あり") && text.includes("転職可能"));

  await page.goto(`${BASE}/foreign-workers/status/permanent-resident`, { waitUntil: "domcontentloaded" });
  card = page.locator('section[role="status"]').first();
  await card.waitFor({ state: "visible" });
  text = await card.innerText();
  ok("⑧ permanent-resident: 就労制限なし・転職可能", text.includes("就労制限なし") && text.includes("転職可能"));

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n===== ${passed}/${results.length} PASS =====`);
  if (passed !== results.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
