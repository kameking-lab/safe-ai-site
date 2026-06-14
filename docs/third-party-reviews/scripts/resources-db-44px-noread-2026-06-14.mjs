/**
 * 無読テスト: 柱0 /resources 厚労省一次資料DB(1,158件) フィルタ・検索・各エントリ操作 44pxタップ標的化（2026-06-14）
 *
 * 対象: /resources（通達・告示・指針・リーフレットを分類検索するDB）。
 *   キーワード検索入力／カテゴリ・法的拘束力・年度の3 select／条件クリアボタン／
 *   各エントリの原文リンク・目次に戻るリンク（リーフレットはPDF・一覧）を44pxタップ標的へ。
 *
 * ペルソナ: 段落を読まず、色とデカい押せる要素しか見ない初訪の一人親方（スマホ390×844）。
 * 判定基準（無読テスト）: 3秒で「ここは資料を絞り込んで探す場所」と分かり、
 *   フィルタ操作と各エントリの原文ボタンがすべて44px以上（押し損ねない）か。
 *
 * 検証項目（実 boundingBox で測定）:
 *  A) /resources で件数ヘッドライン（〜件）が見える
 *  B) キーワード検索入力が44px以上
 *  C) カテゴリ・法的拘束力・年度のフィルタselectが全て44px以上
 *  D) 条件クリアボタンが44px以上
 *  E) 先頭エントリの原文リンクが44px以上
 *  F) 先頭エントリの「目次に戻る」リンクが44px以上
 *  G) リーフレットタブの先頭エントリのPDF/詳細リンクが44px以上
 *
 * 実行: dev server (localhost:3000) を起動した上で web/ から実行
 *   cp ../docs/third-party-reviews/scripts/resources-db-44px-noread-2026-06-14.mjs noread-tmp.mjs
 *   node noread-tmp.mjs && rm noread-tmp.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MOBILE = { width: 390, height: 844 };
const MIN_TAP = 44;

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

const tapOk = async (locator) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  return { ok: !!box && box.height >= MIN_TAP, h: box?.height };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: MOBILE });

console.log("\n[/resources] 厚労省一次資料DB 44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/resources`, { waitUntil: "networkidle" });

// A) 件数ヘッドライン
check("件数ヘッドライン（〜件）が見える", await page.getByRole("heading", { level: 1 }).first().isVisible());

// B) キーワード検索入力
{
  const r = await tapOk(page.getByPlaceholder(/熱中症/));
  check("キーワード検索入力が44px以上", r.ok, `h=${r.h}`);
}

// C) フィルタselect（カテゴリ・法的拘束力・年度）
{
  const selects = page.locator("select");
  const n = await selects.count();
  check("フィルタselectが3つ以上ある", n >= 3, `count=${n}`);
  let allOk = true;
  let detail = "";
  for (let i = 0; i < n; i++) {
    const r = await tapOk(selects.nth(i));
    if (!r.ok) {
      allOk = false;
      detail += `[#${i} h=${r.h}]`;
    }
  }
  check("フィルタselectが全て44px以上", allOk, detail);
}

// D) 条件クリアボタン
{
  const r = await tapOk(page.getByRole("button", { name: /条件クリア/ }));
  check("条件クリアボタンが44px以上", r.ok, `h=${r.h}`);
}

// E) 先頭エントリの原文リンク
{
  const r = await tapOk(page.getByRole("link", { name: /原文（安全衛生情報センター）/ }).first());
  check("先頭エントリの原文リンクが44px以上", r.ok, `h=${r.h}`);
}

// F) 先頭エントリの「目次に戻る」リンク
{
  const r = await tapOk(page.getByRole("link", { name: /目次に戻る/ }).first());
  check("先頭エントリの「目次に戻る」リンクが44px以上", r.ok, `h=${r.h}`);
}

// G) リーフレットタブの先頭エントリのPDF/詳細リンク
{
  await page.getByRole("tab", { name: /リーフレット/ }).click();
  await page.waitForTimeout(200);
  const link = page.getByRole("link", { name: /（厚労省）/ }).first();
  const r = await tapOk(link);
  check("リーフレット先頭エントリのPDF/詳細リンクが44px以上", r.ok, `h=${r.h}`);
}

await page.screenshot({ path: "resources-db-44px-2026-06-14.png", fullPage: false });
await browser.close();

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
