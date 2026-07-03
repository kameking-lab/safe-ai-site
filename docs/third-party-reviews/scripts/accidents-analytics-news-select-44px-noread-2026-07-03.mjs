/**
 * 無読テスト: /accidents-analytics・/accident-news のフィルタ select/button 44px化（2026-07-03）
 *
 * 背景: 柱0タップ標的監査（2026-06-14, PR #570）の申し送り「フォームselectがまだ33〜40px」を実測して是正。
 *  - /accidents-analytics: 軸G業種select（px-2.5 py-1.5, min-h無し）・フィルタバー2 select（px-2 py-1.5, min-h無し）・
 *    絞り込みクリアボタン（px-2.5 py-1.5, min-h無し）・詳細分析トグルボタン（px-3 py-1.5, min-h無し）
 *  - /accident-news: 3 select + キーワード入力 + 検索/クリアボタン（min-h-[40px]<44px）
 * 対策: いずれも min-h-[44px] を付与。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する元請安全担当。
 * 判定基準（無読テスト）: フィルタ操作が指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   cp ../docs/third-party-reviews/scripts/accidents-analytics-news-select-44px-noread-2026-07-03.mjs noread-tmp.mjs
 *   node noread-tmp.mjs && rm noread-tmp.mjs
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

console.log("\n[/accidents-analytics] タップ標的44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/accidents-analytics`, { waitUntil: "domcontentloaded" });
await page.locator("#quick-industry").waitFor({ state: "visible", timeout: 10000 });

{
  const box = await page.locator("#quick-industry").boundingBox();
  check("軸G業種selectが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}
{
  const box = await page.locator("#industry-filter").boundingBox();
  check("フィルタバー業種selectが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}
{
  const box = await page.locator("#type-filter").boundingBox();
  check("フィルタバー事故種類selectが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}
// 絞り込みをクリア: 選択後にのみ出現するので選択して確認
await page.locator("#quick-industry").selectOption({ index: 1 });
{
  const clearBtn = page.getByRole("button", { name: "絞り込みをクリア" });
  await clearBtn.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  const box = await clearBtn.boundingBox();
  check("絞り込みをクリアボタンが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}
{
  const toggleBtn = page.getByRole("button", { name: /詳細項目を展開|詳細項目を折りたたむ/ });
  const box = await toggleBtn.boundingBox();
  check("詳細分析トグルボタンが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}

console.log("\n[/accident-news] タップ標的44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/accident-news`, { waitUntil: "domcontentloaded" });
await page.locator("form").first().waitFor({ state: "visible", timeout: 10000 });

const selects = page.locator("form select");
{
  const heights = await selects.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check(
    "業種/事故型/年 selectが全て44px以上",
    heights.length === 3 && heights.every((h) => h >= 44),
    `heights=${heights.join(",")}`,
  );
}
{
  const box = await page.locator('input[name="q"]').boundingBox();
  check("キーワード入力欄が44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}
{
  const box = await page.getByRole("button", { name: "検索", exact: true }).boundingBox();
  check("検索ボタンが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
