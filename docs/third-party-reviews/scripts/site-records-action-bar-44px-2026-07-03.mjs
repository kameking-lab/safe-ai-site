/**
 * 無読テスト: site-records 各ツールの下部操作バー主要ボタン44px是正（柱0磨き・2026-07-03）
 *
 * ペルソナ: スマホで各記録ツールを開き、記入し終えて指でタップだけで保存/印刷/CSV/新規を押す職長・安全担当。
 * 背景: 巡回監査(Explore)の結果、site-records 全9画面（committee/incident-report/induction/
 *   inspection/near-miss/patrol/procedure/qualifications/records-backup(トップ埋込)）の
 *   下部操作バーが軒並み `px-3 py-2 text-xs` のみでタップ標的44px未満（実測約32〜36px）だった。
 *   ConclusionCard action・CheckRow 等 既に確立済みの `min-h-[44px]` の型を主要CTAへ横展開して是正。
 *
 * 検証: 各画面の主要ボタン群がすべて実boundingBox高さ44px以上であること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/site-records-action-bar-44px-2026-07-03.mjs
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

const checkButtons = async (page, path, labels) => {
  console.log(`\n[${path}] 下部操作バー主要ボタンの44pxタップ標的`);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  for (const label of labels) {
    const btn = page.getByRole("button", { name: label }).first();
    const box = await btn.boundingBox();
    check(`「${label}」が44px以上`, !!box && box.height >= 44, `height=${box?.height}`);
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await ctx.newPage();

await checkButtons(page, "/site-records", ["バックアップを書き出す", "バックアップを取り込む"]);
await checkButtons(page, "/site-records/committee", ["この端末に保存", "議事録を印刷", "CSV出力", "新規（白紙）"]);
await checkButtons(page, "/site-records/incident-report", ["この端末に保存", "下書きを印刷", "CSV出力", "新規"]);
await checkButtons(page, "/site-records/induction", ["この端末に保存", "保存して同じ現場で次の人へ", "受講記録を印刷", "新規"]);
await checkButtons(page, "/site-records/inspection", ["この端末に保存", "点検表を印刷", "CSV出力", "新規"]);
await checkButtons(page, "/site-records/near-miss", ["集計・一覧を印刷", "CSV出力（全件）"]);
await checkButtons(page, "/site-records/patrol", ["この端末に保存", "巡視記録を印刷", "指摘CSV", "新規"]);
await checkButtons(page, "/site-records/procedure", ["この端末に保存", "手順書を印刷", "CSV出力", "新規"]);
await checkButtons(page, "/site-records/qualifications", ["この端末に保存", "印刷", "名簿CSV（全員）", "新規"]);

console.log(`\n  無読まとめ: site-records 全9画面の下部操作バー主要ボタンが44px以上に是正`);
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
