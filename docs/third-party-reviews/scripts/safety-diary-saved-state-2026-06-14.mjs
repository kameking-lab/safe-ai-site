// 柱3 安全日誌(/safety-diary) 結論カードの「下書き／保存済み」無読チェック。
// 毎日書く職長ペルソナ: 開いた瞬間に「いまの状態(記入のこり/記入完了・未保存/保存済み)」と
// 「次にやること」を3秒で言えるか。本文を読まず色とラベルだけで判定する。
// 実行: cd web && (PORT=3110 npm run start &) ; node ../docs/third-party-reviews/scripts/safety-diary-saved-state-2026-06-14.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3110";
const out = process.env.OUT || "/tmp/safety-diary-saved-state";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当
  serviceWorkers: "block", // PWAのSWがfetchを握るのを防ぐ
});
const page = await ctx.newPage();

const card = () => page.getByRole("status", { name: /いまの状態/ }).first();
const cardText = async () => (await card().innerText().catch(() => "(なし)")).replace(/\n/g, " / ");

let pass = 0;
let fail = 0;
const check = (label, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label} — ${detail}`); }
};

// localStorage を毎回まっさらにして「初めて開く」状態から始める。
await page.goto(`${BASE}/safety-diary`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);

// --- 状態1: 初見（空）= 青「記入のこり」+ 次は作業所名 ---
console.log("【状態1】初めて開いた空の打合せ書");
{
  const t = await cardText();
  console.log("  card:", t);
  check("記入のこり が読める", /記入のこり/.test(t), t);
  check("デカ数字 4 が出る", /4/.test(t), t);
  check("次にやること=作業所名を記入", /作業所名を記入/.test(t), t);
  await card().screenshot({ path: `${out}-1-incomplete.png` }).catch(() => {});
}

// 必須4項目を最短入力（作業所名 / 会社名+作業内容 / 予想災害 / 指示事項）。
// 用紙UIは <label> が span+input を包む構造なので、一意な list= 属性と構造で堅く狙う。
await page.locator('input[list="mtg-sites"]').first().fill("○○ビル新築工事");
if ((await page.locator('input[list="mtg-companies"]').count()) === 0) {
  await page.getByRole("button", { name: "＋元請" }).first().click();
}
await page.locator('input[list="mtg-companies"]').first().fill("元請建設");
await page.locator('input[list="mtg-works"]').first().fill("鉄骨建方");
const disasterField = page.locator("label", { hasText: "予想災害" }).first().locator('input[aria-label="追加"]');
await disasterField.fill("開口部からの墜落");
await disasterField.press("Enter");
await page.locator("label", { hasText: "安全衛生指示事項" }).first().locator("textarea").fill("親綱を使用し開口部養生を徹底する");
await page.waitForTimeout(300);

// --- 状態2: 記入完了だが未保存 = 青「記入完了・未保存」+ 次は保存する ---
console.log("【状態2】必須が揃ったが未保存");
{
  const t = await cardText();
  console.log("  card:", t);
  check("記入完了・未保存 が読める", /記入完了・未保存/.test(t), t);
  check("次にやること=保存する", /保存する/.test(t), t);
  await card().screenshot({ path: `${out}-2-complete-unsaved.png` }).catch(() => {});
}

// 手動「保存」を押す（保存一覧へスナップショット）。
await page.getByRole("button", { name: "保存", exact: true }).first().click();
await page.waitForTimeout(400);

// --- 状態3: 保存済み = 緑「保存済み」+ 次は保存一覧で確認 ---
console.log("【状態3】保存後");
{
  const t = await cardText();
  console.log("  card:", t);
  check("保存済み が読める", /保存済み/.test(t), t);
  check("次にやること=保存一覧で確認", /保存一覧で確認/.test(t), t);
  const bottom = await page.getByText("保存一覧に保存済み").first().isVisible().catch(() => false);
  check("下部バーも『保存一覧に保存済み』", bottom, "未表示");
  await card().screenshot({ path: `${out}-3-saved.png` }).catch(() => {});
}

// 保存後に1文字編集すると緑が外れて青「記入完了・未保存」に戻る（保存済みの誤表示が無いこと）。
await page.locator("label", { hasText: "安全衛生指示事項" }).first().locator("textarea").fill("親綱を使用し開口部養生を徹底する。要KY。");
await page.waitForTimeout(300);
console.log("【状態4】保存後に編集（緑が外れる）");
{
  const t = await cardText();
  console.log("  card:", t);
  check("編集で未保存に戻る", /記入完了・未保存/.test(t), t);
}

console.log(`\n無読結果: ${pass}/${pass + fail} 合格`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
