/**
 * 無読テスト: /chemical-database（ChemicalDatabaseClient）のタップ標的を44px化（2026-07-03）
 *
 * 背景: 化学物質データベースのモード切替タブ（MHLW統合 / 専門解説）・AND/OR結合トグル・
 * 規制法令タグの絞り込みチップ・クリアボタンが min-h 未指定で高さ約20〜32pxと44px未満だった。
 * さらに専門解説モードの主要CTA（この物質のリスクアセスメントを実施／厚労省SDS情報を見る）と
 * 下部「関連ページ」リンク3本は min-h-[36px] が明示されており、44pxに満たないまま固定されていた。
 * 対策: 全8箇所に min-h-[44px]（+inline-flex items-center justify-center）を付与
 * （寸法のみ、文言・onClick・href不変）。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する安全担当。
 * 判定基準（無読テスト）: 化学物質DBの主要操作（モード切替・絞り込み・次のアクション）が
 * 指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/chemical-database-tap-targets-44px-noread-2026-07-03.mjs
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

console.log("\n[/chemical-database] タップ標的 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/chemical-database`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });

{
  // モード切替タブ（MHLW統合 / 専門解説）
  const tabs = page.getByRole("button", { name: /MHLW.*物質|専門解説 50物質/ });
  const heights = await tabs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check("モード切替タブが全て44px以上", heights.length >= 2 && heights.every((h) => h >= 44), `heights=${heights.join(",")}`);
}

{
  // AND/OR 結合トグル
  const toggle = page.getByRole("radiogroup", { name: "複数タグの結合方法" });
  const buttons = toggle.locator("button");
  const heights = await buttons.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check("AND/OR結合トグルが全て44px以上", heights.length === 2 && heights.every((h) => h >= 44), `heights=${heights.join(",")}`);
}

{
  // 規制法令タグの絞り込みチップ（例: 建設業頻出でよく使う「石綿」等の1件をクリックしてクリアボタンを出す）
  const firstTag = page.getByRole("button", { name: "石綿則" }).first();
  await firstTag.waitFor({ state: "visible", timeout: 5000 });
  const tagHeight = await firstTag.evaluate((e) => e.getBoundingClientRect().height);
  check("規制法令タグチップ（石綿則）が44px以上", tagHeight >= 44, `height=${tagHeight}`);

  await firstTag.click();
  const clearBtn = page.getByRole("button", { name: "クリア" });
  await clearBtn.waitFor({ state: "visible", timeout: 5000 });
  const clearHeight = await clearBtn.evaluate((e) => e.getBoundingClientRect().height);
  check("クリアボタンが44px以上", clearHeight >= 44, `height=${clearHeight}`);

  await clearBtn.click();
  const stillChecked = await page.getByRole("button", { name: "クリア" }).count();
  check("クリアボタンで選択解除される（非退行）", stillChecked === 0, `count=${stillChecked}`);
}

{
  // 専門解説モードへ切替→カードの主要CTA2本
  await page.getByRole("button", { name: "専門解説 50物質" }).click();
  await page.getByRole("heading", { name: "検索 / 絞り込み", level: 2 }).waitFor({ state: "visible", timeout: 5000 });
  const raBtn = page.getByRole("link", { name: /この物質のリスクアセスメントを実施/ }).first();
  await raBtn.waitFor({ state: "visible", timeout: 5000 });
  const raHeight = await raBtn.evaluate((e) => e.getBoundingClientRect().height);
  check("「この物質のリスクアセスメントを実施」リンクが44px以上", raHeight >= 44, `height=${raHeight}`);

  const sdsLinks = page.getByRole("link", { name: /厚労省SDS情報を見る/ });
  const sdsCount = await sdsLinks.count();
  if (sdsCount > 0) {
    const sdsHeight = await sdsLinks.first().evaluate((e) => e.getBoundingClientRect().height);
    check("「厚労省SDS情報を見る」リンクが44px以上", sdsHeight >= 44, `height=${sdsHeight}`);
  } else {
    console.log("  SKIP: 1件目に sds_url が無いため厚労省SDSリンク検証をスキップ");
  }
}

{
  // 下部「関連ページ」リンク3本
  const relatedLinks = page.getByRole("link", { name: /化学物質リスクアセスメント|通達・判例|安全用語辞書/ });
  const heights = await relatedLinks.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check("「関連ページ」リンク3本が全て44px以上", heights.length === 3 && heights.every((h) => h >= 44), `heights=${heights.join(",")}`);
}

{
  const h1Count = await page.getByRole("heading", { level: 1 }).count();
  check("h1は1個のみ", h1Count === 1, `count=${h1Count}`);
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
