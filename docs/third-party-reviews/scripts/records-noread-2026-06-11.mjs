/**
 * 無読テスト（柱0 記録キット6画面・2026-06-11）
 * 雛形: heat-noread-2026-06-10.mjs / ky-noread-2026-06-10.mjs
 *
 * ペルソナ: 「直行直帰の現場監督・段落を絶対に読まない45歳」
 *   - 朝礼前の3分でスマホから開く。文章は読まない。色とデカい数字しか見ない。
 *   - 3秒見て「いまの状態」と「次にやること」が分からなければ紙に戻る。
 *
 * 判定（docs/visual-language-2026-06-10.md §4 無読テスト）:
 *   ①結論カード(role=status)がスマホ390×844のファーストビュー内
 *   ②状態が変わると色の文法（赤=停止級/黄=要対応/緑=良好/青=案内）どおり即変わる
 *   ③次にやることのタップ対象が44px以上
 *
 * シナリオは実UI操作でデータを作る（localStorage直書きしない＝スキーマ非依存・実フロー検証）。
 * 1つのブラウザコンテキストを共有し、最後の月次レポートで各記録が横断集計されることまで確認。
 *
 * 実行: cp docs/third-party-reviews/scripts/records-noread-2026-06-11.mjs web/tmp-records-noread.mjs
 *       cd web && node tmp-records-noread.mjs && rm tmp-records-noread.mjs
 * 前提: dev server (localhost:3000) 起動済み
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const pad2 = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const main = async () => {
  const browser = await chromium.launch();
  // 同一コンテキスト共有＝localStorageを引き継ぎ、最後に月次レポートの横断集計を検証する
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

  const card = (page) => page.getByRole("status");
  const cardClass = async (page) => (await card(page).getAttribute("class")) || "";
  const cardText = async (page) => ((await card(page).textContent()) || "").trim();
  const firstView = async (page) => {
    const box = await card(page).boundingBox();
    return box && box.y + 80 < 844 ? `y=${Math.round(box.y)}` : null;
  };

  // --- シナリオ1: パトロール（空 → 緑「未是正なし」） ---
  const p1 = await ctx.newPage();
  await p1.goto(`${BASE}/site-records/patrol`, { waitUntil: "networkidle" });
  await card(p1).waitFor({ state: "visible", timeout: 15000 });
  ok("①パトロール空: 結論カードがファーストビュー内", await firstView(p1), await firstView(p1));
  ok("パトロール空: 緑「未是正なし」", (await cardText(p1)).includes("未是正なし") && (await cardClass(p1)).includes("emerald"));

  // 期日超過の指摘を1件作って保存 → 赤「期日超過 1件」
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
  await p1.getByRole("button", { name: "指摘を追加" }).click();
  await p1.getByPlaceholder("指摘内容（不安全な状態・行動）").fill("開口部の手すり欠落");
  await p1.locator("select").last().selectOption("high");
  await p1.locator("input[type='date']").last().fill(iso(yesterday));
  await p1.getByRole("button", { name: "この端末に保存" }).click();
  await p1.waitForTimeout(400);
  const c1 = await cardText(p1);
  ok("②パトロール期日超過: 赤＋デカ数字1件", /期日超過/.test(c1) && /1/.test(c1) && (await cardClass(p1)).includes("rose"), c1.slice(0, 40));
  const act1 = card(p1).locator("a", { hasText: "指摘を見る" });
  const actBox1 = await act1.boundingBox();
  ok("③パトロール: 次の一手が44px以上", actBox1 && actBox1.height >= 44, `h=${actBox1?.height}`);
  await act1.click();
  await p1.waitForTimeout(500);
  const tracker = await p1.locator("#open-findings").boundingBox();
  ok("パトロール: タップで未是正トラッカーへ移動", tracker && tracker.y < 400, `y=${tracker ? Math.round(tracker.y) : "?"}`);
  await p1.close();

  // --- シナリオ2: ヒヤリハット（空 → 青「報告なし」 → 重大1件登録で赤「重大未対策」） ---
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/site-records/near-miss`, { waitUntil: "networkidle" });
  await card(p2).waitFor({ state: "visible", timeout: 15000 });
  ok("①ヒヤリ空: 結論カードがファーストビュー内", await firstView(p2), await firstView(p2));
  ok("ヒヤリ空: 青「報告なし」（緑にしない＝報告ゼロは安全ではない）", (await cardText(p2)).includes("報告なし") && (await cardClass(p2)).includes("sky"));
  await p2.locator("textarea").first().fill("脚立がぐらつき転落しかけた");
  await p2.getByRole("button", { name: "報告を登録" }).click();
  await p2.waitForTimeout(400);
  const c2 = await cardText(p2);
  ok("②ヒヤリ重大未対策: 赤＋デカ数字1件", /重大未対策/.test(c2) && /1/.test(c2) && (await cardClass(p2)).includes("rose"), c2.slice(0, 40));
  // 対策済にすると緑「全件対策済」へ
  await p2.getByRole("button", { name: "対応中" }).first().click();
  await p2.waitForTimeout(400);
  ok("ヒヤリ全件対策済: 緑へ即時に変わる", (await cardText(p2)).includes("全件対策済") && (await cardClass(p2)).includes("emerald"));
  // 月次集計用に未対策の軽微1件を残す
  await p2.locator("textarea").first().fill("資材の仮置きが通路にはみ出し");
  await p2.locator("select").nth(1).selectOption("low");
  await p2.getByRole("button", { name: "報告を登録" }).click();
  await p2.waitForTimeout(400);
  ok("ヒヤリ軽微未対策: 黄「対応中」", (await cardText(p2)).includes("対応中") && (await cardClass(p2)).includes("amber"));
  await p2.close();

  // --- シナリオ3: 点検（空 → 青の案内 → 使用不可で保存 → 赤「使用不可」） ---
  const p3 = await ctx.newPage();
  await p3.goto(`${BASE}/site-records/inspection`, { waitUntil: "networkidle" });
  await card(p3).waitFor({ state: "visible", timeout: 15000 });
  ok("①点検空: 青「今日の点検から」", (await cardText(p3)).includes("今日の点検から") && (await cardClass(p3)).includes("sky"));
  await p3.getByRole("button", { name: "使用不可", exact: true }).click();
  await p3.getByRole("button", { name: "この端末に保存" }).click();
  await p3.waitForTimeout(400);
  const c3 = await cardText(p3);
  ok("②点検使用不可: 赤＋デカ数字1件", /使用不可/.test(c3) && /1/.test(c3) && (await cardClass(p3)).includes("rose"), c3.slice(0, 40));
  ok("点検: 保存一覧の使用不可行に赤帯バッジ", (await p3.locator("#saved-inspections .bg-rose-600").count()) >= 1);
  await p3.close();

  // --- シナリオ4: 委員会（今月未開催=黄 → 保存で緑「今月開催済」） ---
  const p4 = await ctx.newPage();
  await p4.goto(`${BASE}/site-records/committee`, { waitUntil: "networkidle" });
  await card(p4).waitFor({ state: "visible", timeout: 15000 });
  ok("①委員会: 黄「今月未開催」", (await cardText(p4)).includes("今月未開催") && (await cardClass(p4)).includes("amber"));
  await p4.getByRole("button", { name: "この端末に保存" }).click();
  await p4.waitForTimeout(400);
  ok("②委員会保存: 緑「今月開催済」へ即時に変わる", (await cardText(p4)).includes("今月開催済") && (await cardClass(p4)).includes("emerald"));
  await p4.close();

  // --- シナリオ5: 受入教育（青「記入のこりN」→ 記入完了で緑） ---
  const p5 = await ctx.newPage();
  await p5.goto(`${BASE}/site-records/induction`, { waitUntil: "networkidle" });
  await card(p5).waitFor({ state: "visible", timeout: 15000 });
  const c5a = await cardText(p5);
  ok("①受入教育: 青「記入のこり」＋デカ数字", /記入のこり/.test(c5a) && /\d/.test(c5a) && (await cardClass(p5)).includes("sky"), c5a.slice(0, 40));
  const fs5 = await card(p5).locator("span").first().evaluate((el) => {
    const big = el.closest("[role='status']")?.querySelector("span.text-5xl");
    return big ? parseFloat(getComputedStyle(big).fontSize) : 0;
  });
  ok("受入教育: デカ数字40px以上", fs5 >= 40, `${fs5}px`);
  await p5.getByPlaceholder("例: 新人 太郎").fill("無読 太郎");
  await p5.getByRole("button", { name: "全て実施" }).click();
  await p5.getByText("実施者確認").click();
  await p5.getByText("本人 受講確認").click();
  await p5.waitForTimeout(300);
  ok("②受入教育: 全て揃うと緑「記入完了」へ即時に変わる", (await cardText(p5)).includes("記入完了") && (await cardClass(p5)).includes("emerald"));
  await p5.getByRole("button", { name: "この端末に保存", exact: true }).click();
  await p5.waitForTimeout(300);
  await p5.close();

  // --- シナリオ6: 月次レポート（上の記録を横断集計 → 赤「要対応」、内訳: 未是正1＋対応中1＋使用不可1=3） ---
  const p6 = await ctx.newPage();
  await p6.goto(`${BASE}/site-records/monthly`, { waitUntil: "networkidle" });
  await card(p6).waitFor({ state: "visible", timeout: 15000 });
  const c6 = await cardText(p6);
  ok("①月次: 結論カードがファーストビュー内", await firstView(p6), await firstView(p6));
  ok("②月次: 赤「要対応 3件」（パトロール1＋ヒヤリ1＋使用不可1の横断集計）", /要対応/.test(c6) && /3/.test(c6) && (await cardClass(p6)).includes("rose"), c6.slice(0, 40));
  await p6.close();

  await browser.close();
  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n=== ${passCount}/${results.length} PASS ===`);
  process.exit(passCount === results.length ? 0 : 1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
