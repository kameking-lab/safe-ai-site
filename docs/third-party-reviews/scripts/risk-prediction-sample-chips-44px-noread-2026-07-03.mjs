/**
 * 無読テスト: /risk-prediction「サンプル作業内容」チップの44px化（2026-07-03）
 *
 * 背景: 検索カード内の「業種・工種から呼び出す（1タップ）」チップ列は既に min-h-[44px] 済みだったが、
 * 直下の「サンプル作業内容」チップ列（px-2.5 py-1・text-[11px]≒高さ約21px）だけ44px未満のまま
 * 取り残されていた（同一カード内の兄弟要素で一方のみ未是正）。
 * 対策: min-h-[44px] を付与（寸法のみ、文言・onClick・href不変）。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する元請安全担当。
 * 判定基準（無読テスト）: サンプル作業内容チップが指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/risk-prediction-sample-chips-44px-noread-2026-07-03.mjs
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

console.log("\n[/risk-prediction] サンプル作業内容チップ 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/risk-prediction`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });

{
  const label = page.getByText("サンプル作業内容:");
  await label.waitFor({ state: "visible", timeout: 5000 });
  check("サンプル作業内容ラベルが可視", await label.isVisible());
}

{
  const chipsGroup = page.locator("p", { hasText: "サンプル作業内容:" }).locator("xpath=following-sibling::div[1]");
  const chips = chipsGroup.locator("button");
  const count = await chips.count();
  check("サンプル作業内容チップが1件以上検出", count > 0, `count=${count}`);
  const heights = await chips.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check(
    "全サンプル作業内容チップが44px以上",
    heights.length > 0 && heights.every((h) => h >= 44),
    `heights=${heights.join(",")}`,
  );
}

{
  // 兄弟チップ列（業種・工種）が非退行で44px以上のままか確認
  const workChips = page.getByText("業種・工種から呼び出す（1タップ）:").locator("xpath=following-sibling::div[1]").locator("button");
  const heights = await workChips.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check(
    "業種・工種チップは非退行で44px以上",
    heights.length > 0 && heights.every((h) => h >= 44),
    `heights=${heights.join(",")}`,
  );
}

{
  // タップで検索が実行されクエリが反映されることを非退行確認
  const firstChip = page.locator("p", { hasText: "サンプル作業内容:" }).locator("xpath=following-sibling::div[1]").locator("button").first();
  const label = (await firstChip.textContent())?.trim() ?? "";
  await firstChip.click();
  const input = page.locator("#risk-query");
  await input.waitFor({ state: "visible", timeout: 5000 });
  const value = await input.inputValue();
  check("チップタップで入力欄にサンプル文言が反映", value === label, `value=${value} expected=${label}`);
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
