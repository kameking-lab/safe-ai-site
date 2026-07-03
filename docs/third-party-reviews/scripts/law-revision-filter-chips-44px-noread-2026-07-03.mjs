/**
 * 無読テスト: /laws（LawRevisionList＝law-revision*所有コンポーネント）のフィルタ/ソートチップ・
 * 個票アクションボタンを44px化（2026-07-03）
 *
 * 背景: law-revision-list.tsx 内の「もっと見る」ボタンは既に min-h-[44px] 済みだったが、
 * 同じファイル内の業種/対象属性/事業所規模/種別/影響度/施行状況/施行日順の
 * 各フィルタ・ソートチップ（px-3 py-1 text-xs≒高さ約24px）と、各カードの
 * 「AIで要約」「質問する」ボタン（px-3 py-2 text-sm≒高さ約36px）、
 * ゼロヒット時の再検索導線、e-Gov原文リンク・自社版書き換えボタンが
 * 44px未満のまま取り残されていた（同一ファイル内の兄弟要素で一部のみ未是正）。
 * 対策: 全箇所に min-h-[44px]（+inline-flex items-center justify-center）を付与
 * （寸法のみ、文言・onClick・href不変）。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する元請安全担当。
 * 判定基準（無読テスト）: 法改正一覧の各種フィルタ・アクションが指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/law-revision-filter-chips-44px-noread-2026-07-03.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await context.newPage();

console.log("\n[/laws] LawRevisionList フィルタ/アクション 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/laws`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
await page.getByRole("heading", { name: "法改正一覧", level: 2 }).waitFor({ state: "visible", timeout: 10000 });

const heightsOfButtonsNear = async (labelText, { ancestorClass } = {}) => {
  const label = page.locator("p", { hasText: labelText }).first();
  const container = ancestorClass
    ? label.locator(`xpath=ancestor::div[contains(@class, "${ancestorClass}")][1]`)
    : label.locator("xpath=..");
  const buttons = container.locator("button");
  const count = await buttons.count();
  if (count === 0) return [];
  return buttons.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
};

for (const [label, opts] of [
  ["業種フィルタ", { ancestorClass: "print:hidden" }],
  ["対象属性", {}],
  ["事業所規模", {}],
  ["種別フィルタ", { ancestorClass: "print:hidden" }],
  ["影響度", {}],
  ["施行状況", {}],
  ["施行日順", {}],
]) {
  const heights = await heightsOfButtonsNear(label, opts);
  check(
    `「${label}」チップが全て44px以上`,
    heights.length > 0 && heights.every((h) => h >= 44),
    `heights=${heights.join(",")}`,
  );
}

{
  // 1件目カードの「AIで要約」「質問する」ボタン
  const summaryBtn = page.getByRole("button", { name: /AIで要約|AIが要約中/ }).first();
  await summaryBtn.waitFor({ state: "visible", timeout: 5000 });
  const questionBtn = page.getByRole("button", { name: "質問する" }).first();
  const summaryHeight = await summaryBtn.evaluate((e) => e.getBoundingClientRect().height);
  const questionHeight = await questionBtn.evaluate((e) => e.getBoundingClientRect().height);
  check("1件目カードの「AIで要約」ボタンが44px以上", summaryHeight >= 44, `height=${summaryHeight}`);
  check("1件目カードの「質問する」ボタンが44px以上", questionHeight >= 44, `height=${questionHeight}`);
}

{
  // 1件目カード常時表示の「e-Govで原文を確認」リンク（詳細展開前から可視）
  const eGovLinks = page.getByRole("link", { name: "e-Govで原文を確認 →" });
  const before = await eGovLinks.count();
  if (before > 0) {
    const height = await eGovLinks.first().evaluate((e) => e.getBoundingClientRect().height);
    check("常時表示の「e-Govで原文を確認」リンクが44px以上", height >= 44, `height=${height}`);
  } else {
    console.log("  SKIP: 1件目カードに source_url が無いため e-Gov リンク検証をスキップ");
  }

  // 出典情報を展開すると SourceInfoBox 内にも同名リンクが増える（両方とも44px以上）
  const toggle = page.getByRole("button", { name: "▼ 出典情報を表示" }).first();
  await toggle.click();
  const after = await eGovLinks.count();
  if (after > before) {
    const heights = await eGovLinks.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    check(
      "出典情報展開後、両方の「e-Govで原文を確認」リンクが44px以上",
      heights.every((h) => h >= 44),
      `heights=${heights.join(",")}`,
    );
  }
}

{
  // ゼロヒット状態のCTAボタン群（キーワードにヒットしない文字列で検索）
  const search = page.locator("#law-search");
  await search.fill("ZZZ絶対にヒットしないダミー検索語ZZZ");
  const retryBtn = page.getByRole("button", { name: "↺ 条件を全て解除して再検索" });
  await retryBtn.waitFor({ state: "visible", timeout: 5000 });
  const height = await retryBtn.evaluate((e) => e.getBoundingClientRect().height);
  check("ゼロヒット時「条件を全て解除して再検索」ボタンが44px以上", height >= 44, `height=${height}`);

  // 再検索ボタンで条件がリセットされ一覧が復帰することの非退行確認
  await retryBtn.click();
  const searchValueAfter = await search.inputValue();
  check("再検索ボタンでキーワードがクリアされる（非退行）", searchValueAfter === "", `value=${searchValueAfter}`);
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
