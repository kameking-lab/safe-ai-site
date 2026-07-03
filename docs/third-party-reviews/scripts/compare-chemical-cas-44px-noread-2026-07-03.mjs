/**
 * 無読テスト: /accidents-reports/compare 業種比較セレクタ・詳細リンク・期間タブ、
 * /chemical-database/[cas] 個票CTA の残存44px漏れを是正（2026-07-03）
 *
 * 背景: lane backlogが要data班確認の1件のみでブロック中のため、前回イテレーションが
 * 申し送った「次点」候補（accidents-reports/compare比較セレクタ・[industry]表示期間タブ・
 * chemical-database/[cas]個票CTA）をExploreで実装検証し、以下がmin-h未指定で44px未満と判明:
 *  - comparison-industry-selector.tsx: 業種選択トグル・「選択を戻す」・「比較を更新」
 *  - comparison-view.tsx: 各業種カードの「詳細」リンク・末尾「〜の詳細レポート」リンク
 *  - top-cases-tabs.tsx（[industry]で使用される「重大事故の表示期間」タブ）
 *  - chemical-database/[cas]/page.tsx: 「RAを開始」「一覧に戻る」
 * industries/[industry]/page.tsx 自体には表示期間タブは存在せず既存要素は44px対応済みのため対象外。
 * 対策: 計8箇所にmin-h-[44px]を付与（寸法のみ、文言・onClick/href不変）。既存破壊0。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する安全担当。
 * 判定基準（無読テスト）: 比較・詳細遷移・期間切替・RA開始の主要操作が指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/compare-chemical-cas-44px-noread-2026-07-03.mjs
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

console.log("\n[/accidents-reports/compare] 業種選択トグル・選択を戻す・比較を更新 44px 無読テスト");
await page.goto(`${BASE}/accidents-reports/compare`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });
{
  const toggles = page.locator('ul[aria-label="業種選択"] button');
  await toggles.first().waitFor({ state: "visible", timeout: 8000 });
  const count = await toggles.count();
  const heights = await Promise.all(
    Array.from({ length: count }, (_, i) => toggles.nth(i).evaluate((e) => e.getBoundingClientRect().height)),
  );
  check("業種選択トグル全件が44px以上", heights.every((h) => h >= 44), `heights=${heights.join(",")}`);

  // 初期状態は全業種が選択済みのことがあるため、選択済みトグルを1つ解除して「選択を戻す」ボタンを出現させる
  const activeToggle = page.locator('ul[aria-label="業種選択"] button[aria-pressed="true"]:not([disabled])').first();
  const inactiveToggle = page.locator('ul[aria-label="業種選択"] button[aria-pressed="false"]').first();
  const toggleToClick = (await inactiveToggle.count()) ? inactiveToggle : activeToggle;
  if (await toggleToClick.count()) {
    await toggleToClick.click();
    const resetBtn = page.getByRole("button", { name: "選択を戻す" });
    await resetBtn.waitFor({ state: "visible", timeout: 5000 });
    const rh = await resetBtn.evaluate((e) => e.getBoundingClientRect().height);
    check("「選択を戻す」ボタンが44px以上", rh >= 44, `height=${rh}`);

    const applyBtn = page.getByRole("button", { name: "比較を更新" });
    await applyBtn.waitFor({ state: "visible", timeout: 5000 });
    const ah = await applyBtn.evaluate((e) => e.getBoundingClientRect().height);
    check("「比較を更新」ボタンが44px以上", ah >= 44, `height=${ah}`);
  } else {
    console.log("  SKIP: 未選択の業種トグルが見当たらず");
  }
}

console.log("\n[/accidents-reports/compare] 各業種カードの「詳細」リンク・末尾「詳細レポート」リンク 44px 無読テスト");
{
  const detailLinks = page.getByRole("link", { name: "詳細", exact: false });
  const dCount = await detailLinks.count();
  if (dCount > 0) {
    const heights = await Promise.all(
      Array.from({ length: dCount }, (_, i) => detailLinks.nth(i).evaluate((e) => e.getBoundingClientRect().height)),
    );
    check("各業種カード「詳細」リンク全件が44px以上", heights.every((h) => h >= 44), `heights=${heights.join(",")}`);
  } else {
    console.log("  SKIP: 「詳細」リンクが見当たらず");
  }

  const reportLinks = page.getByRole("link", { name: /の詳細レポート/ });
  const rCount = await reportLinks.count();
  if (rCount > 0) {
    const heights = await Promise.all(
      Array.from({ length: rCount }, (_, i) => reportLinks.nth(i).evaluate((e) => e.getBoundingClientRect().height)),
    );
    check("末尾「〜の詳細レポート」リンク全件が44px以上", heights.every((h) => h >= 44), `heights=${heights.join(",")}`);
  } else {
    console.log("  SKIP: 「〜の詳細レポート」リンクが見当たらず");
  }
}

console.log("\n[/accidents-reports/[industry]] 重大事故の表示期間タブ 44px 無読テスト");
await page.goto(`${BASE}/accidents-reports/construction`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });
{
  const tabs = page.getByRole("tab");
  const count = await tabs.count();
  if (count > 0) {
    const heights = await Promise.all(
      Array.from({ length: count }, (_, i) => tabs.nth(i).evaluate((e) => e.getBoundingClientRect().height)),
    );
    check("重大事故の表示期間タブ全件が44px以上", heights.every((h) => h >= 44), `heights=${heights.join(",")}`);

    // 非退行: タブ切替で選択状態が変わる
    const second = tabs.nth(1);
    if (count > 1) {
      await second.click();
      const selected = await second.getAttribute("aria-selected");
      check("タブ切替でaria-selectedが変化する（非退行）", selected === "true", `aria-selected=${selected}`);
    }
  } else {
    console.log("  SKIP: role=tabが見当たらず");
  }
}

console.log("\n[/chemical-database/71-43-2] RAを開始・一覧に戻る 44px 無読テスト");
await page.goto(`${BASE}/chemical-database/71-43-2`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });
{
  const raLink = page.getByRole("link", { name: /RAを開始/ }).first();
  await raLink.waitFor({ state: "visible", timeout: 8000 });
  const rh = await raLink.evaluate((e) => e.getBoundingClientRect().height);
  check("「RAを開始」リンクが44px以上", rh >= 44, `height=${rh}`);

  const backLink = page.getByRole("link", { name: /一覧に戻る/ }).first();
  const bh = await backLink.evaluate((e) => e.getBoundingClientRect().height);
  check("「一覧に戻る」リンクが44px以上", bh >= 44, `height=${bh}`);
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
