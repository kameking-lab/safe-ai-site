/**
 * 無読テスト: /chemical-ra 主要入力3箇所のlabel/input関連付け是正確認（2026-07-03）
 *
 * 背景: chemical-ra-panel.tsx のSTEP1(MhlwChemicalSelector)・STEP2(InputWithVoice)・
 *   作業内容(TextareaWithVoice)の3箇所で <label> がテキストのみで閉じ、実際の
 *   <input>/<textarea> は兄弟要素として描画されていたためhtmlFor/idの関連付けが
 *   一切なく、スクリーンリーダー利用者がラベルなしの「検索、テキストフィールド」
 *   としか読み上げられなかった（WCAG 1.3.1 / 4.1.2）。
 *
 * 是正: 各labelにhtmlFor、対応する入力にidを付与（MhlwChemicalSelectorにid props
 *   転送を追加、InputWithVoice/TextareaWithVoiceは既存の...restでid転送済み）。
 *   文言・レイアウト・onClick等ロジックは無変更＝既存破壊0。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/chemical-ra-label-association-noread-2026-07-03.mjs
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
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await ctx.newPage();

console.log("\n[/chemical-ra] 主要入力3箇所のlabel/input関連付け");
await page.goto(`${BASE}/chemical-ra`, { waitUntil: "domcontentloaded" });

// 1) STEP1 厚労省物質選択（MhlwChemicalSelector）
const step1 = page.getByLabel(/厚労省.*物質から選ぶ/);
await step1.first().waitFor({ state: "visible", timeout: 10000 });
check("①厚労省物質選択のlabelでinputが取得できる", (await step1.count()) > 0);
if ((await step1.count()) > 0) {
  check("①のinputはtype=searchのテキスト入力", (await step1.getAttribute("type")) === "search");
}

// 2) STEP2 物質名直接入力（InputWithVoice）
const step2 = page.getByLabel("② 物質名を直接入力（リストにない物質・俗称・英語名）");
check("②物質名直接入力のlabelでinputが取得できる", (await step2.count()) > 0);
if ((await step2.count()) > 0) {
  await step2.fill("トルエン");
  check("②に入力した値が反映される（非退行）", (await step2.inputValue()) === "トルエン");
}

// 3) 作業内容（TextareaWithVoice）
const workContent = page.getByLabel("作業内容（任意）— より精度の高い保護具推奨のために入力");
check("作業内容のlabelでtextareaが取得できる", (await workContent.count()) > 0);

const h1s = await page.locator("h1").count();
check("h1は1個のみ（多重h1なし）", h1s === 1, `h1 count=${h1s}`);

await ctx.close();
await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
