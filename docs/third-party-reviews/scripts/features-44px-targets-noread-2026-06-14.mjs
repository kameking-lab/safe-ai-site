/**
 * 無読テスト: 柱0 /features 機能一覧 44pxタップ標的化（2026-06-14）
 *
 * 対象: /features （機能紹介ハブ）。フィルタチップ・クイックリンク・各カードの
 *       主CTA「機能を試す →」/副CTA「詳しく見る」・下部CTA を44pxタップ標的へ。
 *
 * ペルソナ: 段落を読まず、色とデカい押せる要素しか見ない初訪の一人親方（スマホ390×844）。
 * 判定基準（無読テスト）: 3秒で「全機能が並ぶ一覧」と分かり、指で押せる要素が
 *   すべて44px以上（押し損ねない）か。スクショで視覚（スクリーンショット付きカード）を確認。
 *
 * 検証項目（実 boundingBox で測定）:
 *  A) ヒーロー見出しが見える（=ここが機能一覧だと分かる）
 *  B) クイックリンク「5分ツアー」が44px以上
 *  C) カテゴリフィルタ「すべて」チップが44px以上
 *  D) カテゴリフィルタの先頭チップが44px以上
 *  E) カード主CTA「機能を試す →」（先頭）が44px以上
 *  F) カード副CTA「詳しく見る」（先頭）が44px以上
 *  G) 下部CTA「ご意見・改善提案を送る →」が44px以上
 *  H) カードがスクリーンショット画像を伴う（ビジュアルファースト・1枚以上）
 *
 * 実行: dev server (localhost:3000) を起動した上で web/ から実行
 *   cp ../docs/third-party-reviews/scripts/features-44px-targets-noread-2026-06-14.mjs noread-tmp.mjs
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

console.log("\n[/features] 44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/features`, { waitUntil: "networkidle" });

// A) ヒーロー見出し
check(
  "ヒーロー見出しが見える（機能一覧だと分かる）",
  await page.getByText("安全AIポータルの全機能を、1ページで。").isVisible(),
);

// B) クイックリンク
{
  const r = await tapOk(page.getByRole("link", { name: "5分ツアー", exact: true }));
  check("クイックリンク「5分ツアー」が44px以上", r.ok, `h=${r.h}`);
}

// C) フィルタ「すべて」
{
  const r = await tapOk(page.getByRole("button", { name: /^すべて（/ }));
  check("フィルタ「すべて」チップが44px以上", r.ok, `h=${r.h}`);
}

// D) フィルタ先頭カテゴリ
{
  const chips = page.locator("section button.rounded-full");
  // 先頭(=すべて)の次=最初のカテゴリ
  const r = await tapOk(chips.nth(1));
  check("カテゴリフィルタ先頭チップが44px以上", r.ok, `h=${r.h}`);
}

// E) 主CTA
{
  const r = await tapOk(page.getByRole("link", { name: "機能を試す →" }).first());
  check("カード主CTA「機能を試す →」が44px以上", r.ok, `h=${r.h}`);
}

// F) 副CTA
{
  const r = await tapOk(page.getByRole("link", { name: "詳しく見る" }).first());
  check("カード副CTA「詳しく見る」が44px以上", r.ok, `h=${r.h}`);
}

// G) 下部CTA
{
  const r = await tapOk(page.getByRole("link", { name: "ご意見・改善提案を送る →" }));
  check("下部CTA「ご意見・改善提案を送る →」が44px以上", r.ok, `h=${r.h}`);
}

// H) ビジュアルファースト（スクリーンショット画像）
{
  const imgs = await page.locator("section img").count();
  check("カードがスクリーンショット画像を伴う（1枚以上）", imgs >= 1, `imgs=${imgs}`);
}

await page.screenshot({ path: "features-44px-2026-06-14.png", fullPage: false });
await browser.close();

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
