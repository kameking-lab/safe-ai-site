/**
 * 無読テスト: /chatbot 常時表示クイック質問チップの44px化（柱C-6 / 柱0・2026-06-14）
 *
 * ペルソナ: 「段落を読まず、指でタップしか操作しない」現場の職長（スマホ390×844）。
 * 背景: 入力欄直下の「クイック質問例」チップは、会話開始後（履歴あり）に空状態の
 *   大きな質問例ボタンが消えると、"打たずにタップで追質問する" 唯一の動線になる。
 *   従来この行は py-1 / 11px ≒ 高さ約24px で 44px 未満＝指で誤爆しやすかった。
 *   本PRで空状態の質問例ボタンと同じ 44px 基準に統一し、可視ラベル「質問例：」を付与。
 *
 * 検証:
 *   1) 入力欄直下の role=group[クイック質問例] が常時（空状態でも）見える
 *   2) その中のチップが3個＝EXAMPLE_QUESTIONS.slice(0,3)
 *   3) 各チップの実測高さが 44px 以上（指タップ標的）
 *   4) 可視ラベル「質問例：」が付く（無読でも"押せる質問"だと分かる）
 *   5) チップをタップすると送信され、ユーザー発話としてその文言が履歴に出る
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node (webから) このスクリプト
 *   （@playwright/test 解決のため web 配下にコピーして実行）
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

console.log("\n[/chatbot] 常時表示クイック質問チップ 44px（スマホ390×844）");
await page.goto(`${BASE}/chatbot`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);

const group = page.getByRole("group", { name: "クイック質問例" });
check("入力欄直下のクイック質問チップ群が常時見える", (await group.count()) === 1);

// 可視ラベル
check("可視ラベル「質問例：」が付く", (await group.getByText("質問例：").count()) === 1);

const chips = group.locator("button");
const n = await chips.count();
check("チップは3個（EXAMPLE_QUESTIONS.slice(0,3)）", n === 3, `count=${n}`);

let allTall = n > 0;
const heights = [];
for (let i = 0; i < n; i++) {
  const box = await chips.nth(i).boundingBox();
  heights.push(box ? Math.round(box.height) : null);
  if (!box || box.height < 44) allTall = false;
}
check("各チップが44px以上のタップ標的", allTall, `h=${heights.join("/")}`);

// タップ→送信され、ユーザー発話に文言が出る
const firstLabel = (await chips.first().innerText()).trim();
await chips.first().click();
const userTurn = page.getByText(firstLabel, { exact: false });
await userTurn.first().waitFor({ state: "visible", timeout: 60000 });
check("チップをタップすると送信され履歴に文言が出る", (await userTurn.count()) >= 1, firstLabel);

console.log(`\n  無読まとめ: 「質問例：」＋44pxチップが入力欄直下に常時 → 打たずに指タップで追質問できる`);
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
