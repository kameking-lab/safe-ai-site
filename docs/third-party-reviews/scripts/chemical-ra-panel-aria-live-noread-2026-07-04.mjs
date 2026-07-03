/**
 * 無読テスト: /chemical-ra AI詳細調査 失敗時のエラー表示にrole="alert"を新設（2026-07-04）
 *
 * 背景: Explore調査でchemical-ra-panel.tsx（/chemical-ra route本体）のローディング/
 * エラー表示ブロック全体にaria-live/role="alert"が皆無と判明。/chatbot等他画面では
 * 既に是正済みの「非同期処理の結果をスクリーンリーダーへ通知する」対応が、安全上重要な
 * 化学物質RA判定ツールで抜けていた（新規発見・診断書未記載）。
 *
 * 是正: エラー表示div(既存)にrole="alert"、再試行中の表示divにrole="status"+aria-live="polite"を付与。
 * 文言・視覚デザイン・判定/リトライロジックは無変更＝既存破壊0。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/chemical-ra-panel-aria-live-noread-2026-07-04.mjs
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

{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  console.log("\n[/chemical-ra] AI詳細調査 失敗時のrole=alert通知");

  // /api/chemical-ra を強制失敗させる
  await page.route("**/api/chemical-ra", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "AI呼び出しに失敗しました（無読テスト）" } }),
    }),
  );

  await page.goto(`${BASE}/chemical-ra`, { waitUntil: "domcontentloaded" });

  const nameInput = page.locator("#chemical-ra-name-input");
  await nameInput.waitFor({ state: "visible", timeout: 10000 });
  await nameInput.fill("トルエン");

  const searchButton = page.getByRole("button", { name: "AI 詳細調査" });
  await searchButton.click();

  const alert = page.getByRole("alert").filter({ hasText: "AIによる生成に失敗しました" });
  await alert.waitFor({ state: "visible", timeout: 15000 });
  check("AI詳細調査失敗時、role=alertのエラー表示が出る", await alert.isVisible());
  check("role=alert内にエラー文言が含まれる", (await alert.textContent())?.includes("AI呼び出しに失敗しました") ?? false);

  await ctx.close();
}

await browser.close();

console.log(`\n合計: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
