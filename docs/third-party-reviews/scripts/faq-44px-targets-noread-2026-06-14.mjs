/**
 * 無読テスト: 柱0 /faq ハブ/ナビ系 44pxタップ標的化（2026-06-14）
 *
 * 対象: /faq（ハブ）・/faq/search（検索）・/faq/[category]（カテゴリ）。
 *   ハブのカテゴリ「質問一覧を見る」リンク／関連ツールチップ、
 *   検索の「よく検索されるキーワード」チップ、
 *   カテゴリ内絞り込み入力・関連ページリンク を44pxタップ標的へ。
 *
 * ペルソナ: 段落を読まず、色とデカい押せる要素しか見ない初訪の一人親方（スマホ390×844）。
 * 判定基準（無読テスト）: 3秒で「質問の探し先（カテゴリ／検索）」が分かり、
 *   指で押せる要素がすべて44px以上（押し損ねない）か。
 *
 * 検証項目（実 boundingBox で測定）:
 *  A) /faq でハブ見出し「労働安全衛生FAQ 200問」が見える
 *  B) /faq カテゴリ「…の質問一覧を見る →」リンク（先頭）が44px以上
 *  C) /faq 関連ツールチップ「法令チャット（AI）」が44px以上
 *  D) /faq/search 検索見出しが見える
 *  E) /faq/search 「よく検索されるキーワード」チップ（先頭）が44px以上
 *  F) /faq/law-system カテゴリ内絞り込み入力が44px以上
 *  G) /faq/law-system 設問を開いた関連ページリンクが44px以上（存在する場合）
 *
 * 実行: dev server (localhost:3000) を起動した上で web/ から実行
 *   cp ../docs/third-party-reviews/scripts/faq-44px-targets-noread-2026-06-14.mjs noread-tmp.mjs
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

// ===== /faq ハブ =====
console.log("\n[/faq] ハブ 44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/faq`, { waitUntil: "networkidle" });

// A) ハブ見出し
check("ハブ見出し「労働安全衛生FAQ 200問」が見える", await page.getByText("労働安全衛生FAQ 200問").first().isVisible());

// B) カテゴリ「質問一覧を見る」リンク
{
  const r = await tapOk(page.getByRole("link", { name: /の質問一覧を見る/ }).first());
  check("カテゴリ「…の質問一覧を見る →」リンクが44px以上", r.ok, `h=${r.h}`);
}

// C) 関連ツールチップ
{
  const r = await tapOk(page.getByRole("link", { name: "法令チャット（AI）" }));
  check("関連ツールチップ「法令チャット（AI）」が44px以上", r.ok, `h=${r.h}`);
}

// ===== /faq/search 検索 =====
console.log("\n[/faq/search] 検索 44pxタップ標的");
await page.goto(`${BASE}/faq/search`, { waitUntil: "networkidle" });

// D) 検索見出し
check("検索見出し「FAQを検索する」が見える", await page.getByText("FAQを検索する").first().isVisible());

// E) 人気キーワードチップ
{
  const r = await tapOk(page.getByRole("button", { name: "ストレスチェック" }));
  check("「よく検索されるキーワード」チップが44px以上", r.ok, `h=${r.h}`);
}

// ===== /faq/law-system カテゴリ =====
console.log("\n[/faq/law-system] カテゴリ 44pxタップ標的");
await page.goto(`${BASE}/faq/law-system`, { waitUntil: "networkidle" });

// F) カテゴリ内絞り込み入力
{
  const r = await tapOk(page.getByPlaceholder("このカテゴリ内で絞り込み…"));
  check("カテゴリ内絞り込み入力が44px以上", r.ok, `h=${r.h}`);
}

// G) 設問を開いた関連ページリンク（存在する場合のみ）
{
  const firstQ = page.locator('button[aria-expanded]').first();
  await firstQ.click();
  await page.waitForTimeout(150);
  const related = page.locator('a.inline-flex.min-h-\\[44px\\]');
  const n = await related.count();
  if (n > 0) {
    const r = await tapOk(related.first());
    check("設問内の関連ページリンクが44px以上", r.ok, `h=${r.h}`);
  } else {
    console.log("  SKIP: 先頭設問に関連ページリンクなし（任意項目）");
  }
}

await page.screenshot({ path: "faq-44px-2026-06-14.png", fullPage: false });
await browser.close();

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
