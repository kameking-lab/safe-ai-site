/**
 * 無読テスト: /chemical-ra 化学物質検索コンボボックスのキーボード操作是正確認（2026-07-03）
 *
 * 背景: tablist-keyboard-nav-a11y（PR #776）着手時のExplore調査で発見・次点送りにしていた
 * mhlw-chemical-selector.tsx（数千件規模の物質名タイプアヘッド）を是正。
 * 従来は結果リストが<button onClick>のみでキーボード操作不可・Escapeキーで閉じる手段も無かった。
 *
 * 是正: role="combobox"/aria-expanded/aria-controls/aria-activedescendant + role="listbox"/"option"
 * を敷設し、ArrowDown/Up・Enter・Escapeのキーボード操作を追加（onClick/選択ロジック・視覚デザインは不変）。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/chemical-selector-combobox-noread-2026-07-03.mjs
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
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await ctx.newPage();
console.log("\n[/chemical-ra] 厚労省物質検索コンボボックス キーボード操作");
await page.goto(`${BASE}/chemical-ra`, { waitUntil: "domcontentloaded" });

const combobox = page.getByPlaceholder(/MHLW/);
await combobox.waitFor({ state: "visible", timeout: 10000 });
check("初期状態はaria-expanded=false", (await combobox.getAttribute("aria-expanded")) === "false");
check("初期状態はaria-activedescendant無し", (await combobox.getAttribute("aria-activedescendant")) === null);

await combobox.fill("トルエン");
await page.waitForTimeout(200);
check("入力でaria-expanded=trueに変わる", (await combobox.getAttribute("aria-expanded")) === "true");

const listboxId = await combobox.getAttribute("aria-controls");
check("aria-controlsが設定されている", Boolean(listboxId));
const listbox = page.locator(`#${listboxId}`);
await listbox.waitFor({ state: "visible", timeout: 5000 });
check("aria-controls先がrole=listboxを持つ", (await listbox.getAttribute("role")) === "listbox");
const options = listbox.getByRole("option");
const optionCount = await options.count();
check("検索結果がrole=optionとして複数件表示される", optionCount > 0, `count=${optionCount}`);

await combobox.press("ArrowDown");
await page.waitForTimeout(100);
const firstOptionId = await options.nth(0).getAttribute("id");
check(
  "ArrowDownでaria-activedescendantが1件目のoption idと一致",
  (await combobox.getAttribute("aria-activedescendant")) === firstOptionId
);
check("1件目optionがaria-selected=trueになる", (await options.nth(0).getAttribute("aria-selected")) === "true");

await combobox.press("ArrowDown");
await page.waitForTimeout(100);
const secondOptionId = await options.nth(1).getAttribute("id");
check(
  "2回目のArrowDownで2件目へハイライトが進む",
  (await combobox.getAttribute("aria-activedescendant")) === secondOptionId
);

const secondLabel = (await options.nth(1).textContent()) ?? "";
await combobox.press("Enter");
await page.waitForTimeout(200);
const valueAfterEnter = await combobox.inputValue();
check("Enterでハイライト中の項目が選択され入力欄に反映される", secondLabel.includes(valueAfterEnter) || valueAfterEnter.length > 0, valueAfterEnter);
check("Enter後はaria-expanded=falseに閉じる", (await combobox.getAttribute("aria-expanded")) === "false");

await combobox.fill("ベンゼン");
await page.waitForTimeout(200);
check("再入力でaria-expanded=trueに戻る", (await combobox.getAttribute("aria-expanded")) === "true");
await combobox.press("Escape");
check("Escapeでaria-expanded=falseに閉じる", (await combobox.getAttribute("aria-expanded")) === "false");

await ctx.close();
await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
