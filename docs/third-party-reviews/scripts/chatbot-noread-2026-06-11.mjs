/**
 * 無読テスト: 安衛法AIチャットボット(/chatbot) ビジュアルファースト化（柱0・2026-06-11）
 *
 * ペルソナ: 「段落を絶対に読まず、色とデカい要素しか見ない」現場の職長（スマホ390×844）。
 * 判定基準（社長指示の無読テスト）: 本文を読まずに3秒で
 *   「いまの状態（=回答の結論と根拠の確かさ）」「次にやること」が言えるか。
 *
 * 検証項目:
 *  A) 初期画面: 質問例ボタンが44px・入力欄到達性・免責の二重掲示解消・法令チップ群は詳細層
 *  B) 回答（法令DBヒットあり）: 結論カード（デカ太字・verbatim）＋根拠チップ＋出典チップ、
 *     条文/出典/詳しい説明は初期折りたたみ＝詳細層、開けば全文（正確性不可侵）
 *  C) 色の文法: 法令DB根拠=青カード+緑チップ / 条文特定できず=黄カード（緑をOKの意味で使わない）
 *  D) タップ対象: フォローアップ・活用チップ44px以上
 *  E) リロード後も復元された回答が結論ファーストで表示される
 *
 * 実行（ローカルはGEMINI_API_KEY無し=縮退経路。結論カードの機構はAI経路と同一）:
 *   cd web && npm run build && npm run start  (devサーバーはハング既知事象のためprod server)
 *   cp docs/third-party-reviews/scripts/chatbot-noread-2026-06-11.mjs web/noread-tmp.mjs
 *   cd web && node noread-tmp.mjs && rm noread-tmp.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
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
const page = await browser.newPage({ viewport: MOBILE });

// ---------- A) 初期画面 ----------
console.log("\n[A] /chatbot 初期画面（スマホ390×844）");
await page.goto(`${BASE}/chatbot`, { waitUntil: "networkidle" });

check(
  "免責の二重掲示が解消されている（「⚠ 免責事項：」の上部バナーが無い）",
  (await page.getByText("免責事項：").count()) === 0,
);
check(
  "免責は入力欄直下に常時表示が1本残っている（消していない）",
  (await page.getByText("本回答は法的助言ではありません").count()) === 1,
);

const lawDetail = page.locator("details", { hasText: "対応法令ぜんぶ見る" }).first();
check("専門法令チップ15個は詳細層（折りたたみ）にある", (await lawDetail.count()) === 1);
check(
  "専門法令の折りたたみは初期状態で閉じている",
  (await lawDetail.getAttribute("open")) === null,
);

const exampleBtn = page.getByRole("button", { name: "足場の手すり高さは？" });
check("質問例ボタンが見える", (await exampleBtn.count()) >= 1);
const exBox = await exampleBtn.first().boundingBox();
check("質問例ボタンは44px以上のタップ対象", exBox !== null && exBox.height >= 44, `h=${exBox?.height}`);

await page.screenshot({ path: "noread-chatbot-1-first.png", fullPage: false });

// ---------- B) 回答の結論ファースト（法令DBヒットあり） ----------
console.log("\n[B] 質問→回答の結論カード（法令DBヒット経路）");
await exampleBtn.first().click();
const card = page.locator('[aria-label="回答の結論"]');
await card.first().waitFor({ state: "visible", timeout: 60000 });
// meta反映（チップ描画）まで少し待つ
await page.waitForTimeout(1500);

check("結論カード(role=status)が表示される", (await card.count()) === 1);

const conclusionText = (await card.locator("p").first().innerText()).trim();
check("結論が空でない", conclusionText.length > 0, conclusionText.slice(0, 40));
check(
  "結論は2文以内（デカ表示が間延びしない）",
  (conclusionText.match(/。/g) ?? []).length <= 2,
  `${(conclusionText.match(/。/g) ?? []).length}文`,
);
const fontSize = await card
  .locator("p")
  .first()
  .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
const fontWeight = await card
  .locator("p")
  .first()
  .evaluate((el) => parseInt(getComputedStyle(el).fontWeight, 10));
check("結論はデカ太字（16px以上・bold）", fontSize >= 16 && fontWeight >= 700, `${fontSize}px/${fontWeight}`);

// 根拠チップと色の文法（チップ⇄カードの組合せが矛盾しないこと）
const cardClass = (await card.first().getAttribute("class")) ?? "";
const hasDbBadge = (await card.getByText("法令DB根拠").count()) > 0;
const hasAiBadge =
  (await card.getByText("AI推論・要確認").count()) > 0 ||
  (await card.getByText("条文特定できず").count()) > 0;
check("根拠の確かさチップがカード内にある", hasDbBadge || hasAiBadge);
if (hasDbBadge) {
  check("法令DB根拠 → カードは青（指示・案内）", cardClass.includes("sky"), cardClass);
} else {
  check("AI推論/特定できず → カードは黄（要確認）", cardClass.includes("amber"), cardClass);
}
check("回答カードに緑（=OKの誤読）を使っていない", !cardClass.includes("emerald"), cardClass);

// 出典チップ
const sourceChip = card.getByText(/出典 \d+件/);
const hasSources = (await sourceChip.count()) > 0;
console.log(`  (info) 出典チップ: ${hasSources ? await sourceChip.first().innerText() : "なし(条文ゼロ経路)"}`);

// 詳細層: 参照条文・出典・詳しい説明は初期折りたたみ
const srcDetail = page.locator("details", { hasText: "参照条文" }).first();
if ((await srcDetail.count()) > 0) {
  check("参照条文は初期折りたたみ（詳細層）", (await srcDetail.getAttribute("open")) === null);
}
const citeDetail = page.locator("details", { hasText: "出典（条文番号＋施行日＋発出機関）" }).first();
if ((await citeDetail.count()) > 0) {
  check("構造化出典は初期折りたたみ（詳細層）", (await citeDetail.getAttribute("open")) === null);
}
const restDetail = page.locator("details", { hasText: "詳しい説明（全文" }).first();
check("詳しい説明（全文）の折りたたみがある", (await restDetail.count()) === 1);
check("詳しい説明は初期折りたたみ", (await restDetail.getAttribute("open")) === null);

// 正確性不可侵: 開けば全文が読める（結論+詳しい説明=回答全文）
await restDetail.locator("summary").click();
await page.waitForTimeout(300);
const restText = (await restDetail.innerText()).trim();
check("開くと残り全文が読める（隠すのは可・消すのは不可）", restText.length > 50, `${restText.length}字`);
// 全文字数の表記（「全文 N字」）と実際の合計が桁レベルで一致するか
const labelMatch = restText.match(/全文 (\d+)字/);
if (labelMatch) {
  const declared = parseInt(labelMatch[1], 10);
  const approxTotal = conclusionText.length + restText.length;
  check(
    "結論+詳細の合計が表記全文字数とおおむね一致（情報消失なし）",
    Math.abs(approxTotal - declared) < declared * 0.25,
    `表記${declared} vs 実測${approxTotal}`,
  );
}
await page.screenshot({ path: "noread-chatbot-2-answer.png", fullPage: false });

// ---------- C) 色の文法: 条文特定できず（黄）経路 ----------
console.log("\n[C] 条文ヒットなし質問 → 黄カード");
await page.locator("textarea").fill("ぱぴぷぺぽカーニバルの開催要件は？");
await page.getByRole("button", { name: "送信", exact: true }).click();
await page.waitForTimeout(1000);
const cards = page.locator('[aria-label="回答の結論"]');
await cards.nth(1).waitFor({ state: "visible", timeout: 60000 });
await page.waitForTimeout(1500);
const card2Class = (await cards.nth(1).getAttribute("class")) ?? "";
const card2HasWarn =
  (await cards.nth(1).getByText("条文特定できず").count()) > 0 ||
  (await cards.nth(1).getByText("AI推論・要確認").count()) > 0;
const card2HasDb = (await cards.nth(1).getByText("法令DB根拠").count()) > 0;
if (card2HasDb) {
  // 部分一致で条文が拾えてしまった場合は青で正しい（色文法の一貫性を確認）
  check("（部分ヒット）法令DB根拠 → 青カード", card2Class.includes("sky"), card2Class);
} else {
  check("条文ヒットなし → 黄カード＋要確認チップ", card2HasWarn && card2Class.includes("amber"), card2Class);
}
await page.screenshot({ path: "noread-chatbot-3-nohit.png", fullPage: false });

// ---------- D) タップ対象44px ----------
console.log("\n[D] フォローアップ・活用チップのタップ対象");
const followup = page.locator("button.rounded-full", { hasText: /.+/ }).first();
if ((await page.getByText("続けて質問する：").count()) > 0) {
  const fuBtn = page
    .locator("div", { hasText: "続けて質問する：" })
    .locator("button")
    .last();
  const fuBox = await fuBtn.boundingBox();
  check("フォローアップは44px以上", fuBox !== null && fuBox.height >= 44, `h=${fuBox?.height}`);
} else {
  console.log("  (info) フォローアップ非表示（経路依存）→ スキップ");
}
const useChip = page.getByRole("link", { name: "→ KYで確認" }).last();
if ((await useChip.count()) > 0) {
  await useChip.scrollIntoViewIfNeeded();
  const chipBox = await useChip.boundingBox();
  check("活用チップ（KYで確認）は44px以上", chipBox !== null && chipBox.height >= 44, `h=${chipBox?.height}`);
}
void followup;

// ---------- E) リロード後の復元も結論ファースト ----------
console.log("\n[E] リロード復元");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const restoredCards = await page.locator('[aria-label="回答の結論"]').count();
check("リロード後も全回答が結論カードで表示", restoredCards >= 2, `cards=${restoredCards}`);

// ---------- 無読3秒判定 ----------
console.log("\n[無読3秒判定] 職長ペルソナ:");
console.log(`  いまの状態: 「${conclusionText.slice(0, 60)}」が${hasDbBadge ? "青カード+緑の法令DB根拠チップ" : "黄カード=要確認"}で一番上`);
console.log("  次にやること: 出典チップ→下の折りたたみ／続けて質問／→KYで確認（全て44px）");

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
