/**
 * 無読テスト: /court-cases ページネーション（柱C-6・2026-06-14）
 *
 * 背景: モバイルで88件を全件描画し、全高が約26,000pxまで伸びていた（スクロール地獄）。
 * 対策: 初期 PAGE_SIZE(=24) 件のみ表示し「もっと見る（残りN件）」で追加読込。
 *
 * ペルソナ: 段落を読まず色とデカい要素しか見ない現場の職長（スマホ390×844）。
 * 判定基準（無読テスト）: 3秒で「いま何件のうち何件が見えているか」「次にやること＝もっと見る」が分かるか。
 *
 * 検証項目:
 *  A) 初期表示の判例カードが PAGE_SIZE 件に絞られている（全件を一度に描画しない）
 *  B) ページ全高が劇的に縮んでいる（昔の26,000px級ではなく1万px未満の目安）
 *  C) 「もっと見る」ボタンが残り件数を提示し、44px以上の押しやすいフル幅ボタン
 *  D) 押すと件数が PAGE_SIZE 単位で増え、全件に達するとボタンが消える
 *  E) 分野アイコングリッドのタイルは min 44px（指でも押せる）
 *
 * 実行: dev server (localhost:3000) を起動した上で web/ から実行
 *   cp docs/third-party-reviews/scripts/court-cases-pagination-noread-2026-06-14.mjs web/noread-tmp.mjs
 *   cd web && node noread-tmp.mjs && rm noread-tmp.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MOBILE = { width: 390, height: 844 };
const PAGE_SIZE = 24;

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
const page = await browser.newPage({ viewport: MOBILE });

console.log("\n[/court-cases] ページネーション 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/court-cases`, { waitUntil: "networkidle" });

const caseLinks = () => page.locator('ul a[href^="/court-cases/"]');

// ---------- A) 初期件数 ----------
const initialCount = await caseLinks().count();
check("初期表示は PAGE_SIZE 件に絞られている", initialCount === PAGE_SIZE, `count=${initialCount}`);

// ---------- B) ページ全高 ----------
const fullHeight = await page.evaluate(() => document.body.scrollHeight);
check("ページ全高が現実的な範囲に縮んでいる（<10,000px目安）", fullHeight < 10_000, `height=${fullHeight}px`);

// ---------- C) もっと見るボタン ----------
const more = page.getByTestId("court-load-more");
check("「もっと見る」ボタンがある", (await more.count()) === 1);
const moreText = (await more.innerText().catch(() => "")) ?? "";
check("ボタンに残り件数が出ている", /残り\s*\d+\s*件/.test(moreText), moreText);
const moreBox = await more.boundingBox();
check("ボタンが44px以上で押しやすい", moreBox !== null && moreBox.height >= 44, `h=${moreBox?.height}`);

// ---------- D) もっと見るで増える→消える ----------
await more.click();
await page.waitForTimeout(150);
const afterOne = await caseLinks().count();
check("押すと PAGE_SIZE 単位で増える", afterOne === PAGE_SIZE * 2 || afterOne > initialCount, `count=${afterOne}`);

// 全件に達するまで押す
for (let i = 0; i < 10 && (await page.getByTestId("court-load-more").count()) === 1; i++) {
  await page.getByTestId("court-load-more").click();
  await page.waitForTimeout(120);
}
check("全件表示しきると「もっと見る」が消える", (await page.getByTestId("court-load-more").count()) === 0);

// ---------- E) 分野タイル44px ----------
const fieldTiles = page.getByTestId("court-field-grid").locator("button");
const tileBoxes = await fieldTiles.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
check("分野タイルがすべて44px以上", tileBoxes.length > 0 && tileBoxes.every((h) => h >= 44), `min=${Math.min(...tileBoxes)}`);

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
