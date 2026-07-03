/**
 * 無読テスト: 巡回監査(Explore)で新規発見した残存44px未満の主要ボタンを是正（柱0磨き・続き・2026-07-03）
 *
 * ペルソナ: スマホで各記録ツールを開き、指でタップだけで登録/印刷/委員会反映/転記/提出を押す職長・安全担当。
 * 背景: PR #725（site-records 9画面27箇所）の後も巡回監査で以下の主要ボタンが `min-h` 未指定のまま
 *   残っていた（同一ファイル内の他ボタンは44px化済みという非対称）:
 *   - /site-records/near-miss の「報告を登録」（submit）
 *   - /site-records/monthly の「レポートを印刷／PDF」「この集計を委員会議事録に反映」
 *   - /ky/paper の承認バー「元請に提出」「承認」「差し戻し」・印刷プレビューの「印刷 / PDF」「閉じる」
 *   - 転記支援シートの「CSVをダウンロード」「閉じる」
 *
 * 検証: 各ボタンの実boundingBox高さが44px以上であること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/remaining-primary-buttons-44px-2026-07-03.mjs
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

const checkHeight = async (page, label, detail = "") => {
  const btn = page.getByRole("button", { name: label }).first();
  const box = await btn.boundingBox();
  check(`「${label}」が44px以上${detail}`, !!box && box.height >= 44, `height=${box?.height}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await ctx.newPage();

console.log("\n[/site-records/near-miss] 主要ボタン");
await page.goto(`${BASE}/site-records/near-miss`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
await checkHeight(page, "報告を登録");

console.log("\n[/site-records/monthly] 主要ボタン");
await page.goto(`${BASE}/site-records/monthly`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
await checkHeight(page, "レポートを印刷／PDF");
// 委員会反映ボタンは当月データが1件以上ある場合のみ表示（この端末は初回のためデータ無し=非表示が正）。
const toCommittee = page.getByRole("button", { name: "この集計を委員会議事録に反映" });
const toCommitteeCount = await toCommittee.count();
if (toCommitteeCount > 0) {
  await checkHeight(page, "この集計を委員会議事録に反映");
} else {
  console.log("  SKIP: 「この集計を委員会議事録に反映」は当月データ0件のためこの端末では非表示（コードで min-h-[44px] 付与済みを確認済み）");
}

console.log("\n[/ky/paper] 承認バー・その他操作シート内のボタン");
await page.goto(`${BASE}/ky/paper`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
// 既定は draft 状態のため「元請に提出」が見える。
await checkHeight(page, "元請に提出");

// その他操作シートを開き、印刷プレビュー・転記支援を辿る。
await page.getByRole("button", { name: "その他の操作（複製・共有・転記・印刷）" }).click();
await page.waitForTimeout(200);
await page.getByRole("menuitem", { name: /印刷プレビュー/ }).click();
await page.waitForTimeout(300);
await checkHeight(page, "印刷 / PDF", "（印刷プレビュー内）");
const previewClose = page.locator("button:not([aria-label])", { hasText: "閉じる" }).last();
const previewCloseBox = await previewClose.boundingBox();
check("「閉じる」が44px以上（印刷プレビュー内）", !!previewCloseBox && previewCloseBox.height >= 44, `height=${previewCloseBox?.height}`);
await previewClose.click();
await page.waitForTimeout(200);

await page.getByRole("button", { name: "その他の操作（複製・共有・転記・印刷）" }).click();
await page.waitForTimeout(200);
await page.getByRole("menuitem", { name: /転記/ }).click();
await page.waitForTimeout(300);
await checkHeight(page, "CSVをダウンロード（控え・集計用）");
const transcribeClose = page.locator("button:not([aria-label])", { hasText: "閉じる" }).last();
const transcribeCloseBox = await transcribeClose.boundingBox();
check("「閉じる」が44px以上（転記支援内）", !!transcribeCloseBox && transcribeCloseBox.height >= 44, `height=${transcribeCloseBox?.height}`);

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
