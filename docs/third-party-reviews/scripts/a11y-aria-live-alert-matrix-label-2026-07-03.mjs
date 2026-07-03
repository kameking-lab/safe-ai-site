/**
 * 無読テスト: 44px/結論カード以外のアクセシビリティ欠陥3件の是正確認（2026-07-03）
 *
 * 背景: 柱0（タップ標的・結論カード）はほぼ飽和のため、別角度でExplore監査した
 * 未対応のa11y欠陥3件を是正。
 *   1) /chatbot 送信エラー表示に role="alert" が無く、通信エラーがスクリーンリーダーに
 *      通知されなかった（同ファイル内の音声入力エラーは role="alert" 実装済みで不整合）。
 *   2) /chatbot AI回答ストリーミング中のバブルに aria-live が無く、生成中/完了が
 *      スクリーンリーダーに一切通知されなかった。
 *   3) /risk-prediction リスクマトリクスの各セルが色のみでリスク段階
 *      （高/中高/中/低）を表現し、色覚多様性のあるユーザー・スクリーンリーダー
 *      利用者が判別できなかった（WCAG 1.4.1）。
 *
 * 是正: (1)(2) は chatbot-panel.tsx に role="alert" / aria-live="polite" を追加、
 *   (3) は risk-prediction-panel.tsx の各 <td> に aria-label（重大性×頻度: リスク段階
 *   （件数））を追加（視覚デザイン・onClick/href は不変＝既存破壊0）。
 *   (1)(2) は vitest 単体テスト（chatbot-panel.test.tsx）でも回帰固定済み。
 *   本スクリプトは実機DOMでの最終確認（role/aria属性の実在）を担う。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/a11y-aria-live-alert-matrix-label-2026-07-03.mjs
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

// ---- 1) /chatbot 送信エラーの role="alert" ----
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();

  // ストリーミングAPI・fallback JSON APIの両方を失敗させ、エラーバナー表示を強制する
  await page.route("**/api/chatbot/stream", (route) =>
    route.fulfill({ status: 500, body: "error", headers: { "Content-Type": "text/plain" } }),
  );
  await page.route("**/api/chatbot", (route) =>
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: "通信エラーが発生しました" }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  console.log("\n[/chatbot] 送信エラーの role=alert 通知");
  await page.goto(`${BASE}/chatbot`, { waitUntil: "domcontentloaded" });
  await page.getByText("足場の手すり高さは？").first().click();

  const alerts = page.locator('[role="alert"]:not(#__next-route-announcer__)');
  await alerts.first().waitFor({ state: "visible", timeout: 10000 });
  const text = (await alerts.first().innerText()).trim();
  check("送信エラーバナーがrole=alertで可視化される", text.length > 0, text);

  await ctx.close();
}

// ---- 2) /chatbot ストリーミング中バブルの aria-live ----
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();

  // /api/chatbot/stream を解決させず isSending=true の状態を維持し、
  // ストリーミング中プレースホルダの aria-live 属性を確認する
  await page.route("**/api/chatbot/stream", () => {
    /* fulfillしない = pending のまま維持 */
  });

  console.log("\n[/chatbot] AI回答ストリーミング中バブルの aria-live");
  await page.goto(`${BASE}/chatbot`, { waitUntil: "domcontentloaded" });
  await page.getByText("足場の手すり高さは？").first().click();

  const liveRegion = page.locator('[aria-live="polite"]');
  await liveRegion.first().waitFor({ state: "attached", timeout: 10000 });
  check("ストリーミング中バブルにaria-live=politeが付与される", (await liveRegion.count()) > 0);

  await ctx.close();
}

// ---- 3) /risk-prediction リスクマトリクスの色以外の手掛かり ----
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();

  console.log("\n[/risk-prediction] リスクマトリクスのaria-label（色のみに依存しない）");
  await page.goto(`${BASE}/risk-prediction`, { waitUntil: "domcontentloaded" });
  await page.locator("#risk-query").fill("高所での鉄骨組立作業");
  await page.getByRole("button", { name: "検索", exact: true }).click();
  await page.getByRole("button", { name: "リスクマトリクス" }).waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("button", { name: "リスクマトリクス" }).click();

  const cells = page.locator("table td[aria-label]");
  const count = await cells.count();
  check("マトリクスセルにaria-labelが1件以上検出", count > 0, `count=${count}`);

  const labels = await cells.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  const hasRiskWord = labels.some((l) => /高リスク|中高リスク|中リスク|低リスク/.test(l));
  check("aria-labelにリスク段階の文言（色以外の手掛かり）が含まれる", hasRiskWord, labels.slice(0, 5).join(" / "));

  await ctx.close();
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
