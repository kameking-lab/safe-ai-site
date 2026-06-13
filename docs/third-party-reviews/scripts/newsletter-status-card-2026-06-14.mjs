/**
 * 無読テスト（柱0バッチ9/9 その他ツール=メルマガ登録前後の状態カード・2026-06-14）
 * 雛形: tools-conclusion-cards-2026-06-14.mjs
 *
 * ペルソナ「段落を絶対に読まず色とデカい要素しか見ない現場/担当」。
 * /newsletter の最上部に「いまの状態（未登録／登録完了）」を伝える
 * 結論カード(ConclusionCard=section[role=status])があり、登録の前後で
 * 案内(青) → 完了(緑) に色帯が切り替わるか。本文を読まず3秒で分かるか。
 *
 * 判定:
 *   ① 結論カード(role=status)がファーストビュー内(y<700)
 *   ② 登録前は案内色 info(sky)＋「未登録」＋「登録する」導線
 *   ③ h1=1（多重h1なし）
 *   ④ 登録後は完了色 safe(emerald)＋「登録完了」へ切り替わる
 *      （RESEND未設定ローカルでは addSubscriber がメモリ保存で ok:true を返す）
 *
 * 実行: cp docs/third-party-reviews/scripts/newsletter-status-card-2026-06-14.mjs web/tmp-noread-nl.mjs
 *       cd web && node tmp-noread-nl.mjs && rm tmp-noread-nl.mjs
 * 前提: localhost:3000 起動済み（npm run build && npm run start 推奨）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/newsletter`, { waitUntil: "domcontentloaded" });

  // ① 結論カードがファーストビュー内
  const card = page.locator('section[role="status"]').first();
  await card.waitFor({ state: "visible", timeout: 10000 });
  const box = await card.boundingBox();
  ok("/newsletter ① 結論カードがファーストビュー内(y<700)", box && box.y < 700, box ? `y=${Math.round(box.y)}` : "no box");

  // ② 登録前=案内色 info(sky)＋「未登録」
  const clsIdle = (await card.getAttribute("class")) || "";
  ok("/newsletter ② 登録前は案内色 sky", /sky/.test(clsIdle), clsIdle.slice(0, 70));
  const txtIdle = await card.innerText();
  ok("/newsletter ② 結論に「未登録」", txtIdle.includes("未登録"), txtIdle.replace(/\s+/g, " ").slice(0, 50));
  ok("/newsletter ② 次の行動「登録する」導線", txtIdle.includes("登録する"), "");

  // ③ h1=1
  const h1 = await page.locator("h1").count();
  ok("/newsletter ③ h1=1", h1 === 1, `h1=${h1}`);

  // ④ 登録後=完了色 safe(emerald)＋「登録完了」
  const uniq = `noread-${box ? Math.round(box.y) : 0}-${txtIdle.length}@example.com`;
  await page.locator("#nl-email").fill(uniq);
  await page.getByRole("button", { name: /応援者として登録する/ }).click();
  // カードのテキストが「登録完了」へ変わるのを待つ
  await page.locator('section[role="status"]', { hasText: "登録完了" }).first().waitFor({ timeout: 10000 });
  const cardAfter = page.locator('section[role="status"]').first();
  const clsAfter = (await cardAfter.getAttribute("class")) || "";
  const txtAfter = await cardAfter.innerText();
  ok("/newsletter ④ 登録後は完了色 emerald", /emerald/.test(clsAfter), clsAfter.slice(0, 70));
  ok("/newsletter ④ 結論に「登録完了」", txtAfter.includes("登録完了"), txtAfter.replace(/\s+/g, " ").slice(0, 50));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    console.log("FAILED:", failed.map((f) => f.name).join("; "));
    process.exit(1);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
