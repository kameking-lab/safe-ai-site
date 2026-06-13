// 柱0仕上げ② 外国人労働者ハブ入口 無読チェック（/foreign-workers）。
// 実行: cd web && npm run build && (PORT=3101 npm run start &) ; node ../docs/third-party-reviews/scripts/foreign-workers-conclusion-noread-2026-06-14.mjs
// 無読の問い: 画面を3秒見て、受入れ担当が「いまの状態＝国籍を問わず法令が適用される」と分かり、
//             次にやること=「教材を作る」を即断でき、件数（資格/教材/言語）が結論カードで一目で読めるか。
// 確認点: (1)結論カード(role=status)が最上部 (2)状態ラベル「国籍問わず法令適用」
//         (3)件数バッジ 在留11資格/教材30本/5言語対応/無料 (4)主操作「教材を作る」が44px・safety-trainingへ
//         (5)2大動線「在留資格ガイド」が残る (6)旧・重複の件数タイル(dt「対応言語」)は撤去済み。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3101";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当（モバイル無読）
  serviceWorkers: "block",
});
const page = await ctx.newPage();

let pass = 0;
let total = 0;
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

await page.goto(`${BASE}/foreign-workers`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

// (1) 結論カード（role=status）が見える。
const card = page.getByRole("status", { name: /いまの状態/ });
const cardVisible = await card.isVisible().catch(() => false);
check("結論カード(role=status)が最上部に見える", cardVisible);

// (2) 状態ラベル「国籍問わず法令適用」が見える。
const cardText = (await card.innerText().catch(() => "")) || "";
check("状態ラベル「国籍問わず法令適用」が見える", /国籍問わず法令適用/.test(cardText), cardText.replace(/\s+/g, " ").slice(0, 60));

// (3) 件数バッジが結論カード内に見える（数値はデータ算出）。
check("「在留11資格」バッジが見える", /在留11資格/.test(cardText));
check("「教材30本」バッジが見える", /教材30本/.test(cardText));
check("「5言語対応」バッジが見える", /5言語対応/.test(cardText));
check("「無料」バッジが見える", /無料/.test(cardText));

// (4) 主操作「教材を作る」が44px以上のタップ標的で、教材ビルダーへ繋がる。
const cta = card.getByRole("link", { name: /教材を作る/ });
const ctaVisible = await cta.isVisible().catch(() => false);
check("結論カードの主操作「教材を作る」が見える", ctaVisible);
const box = await cta.boundingBox().catch(() => null);
check("主操作が44px以上のタップ標的", !!box && box.height >= 44, box ? `${Math.round(box.height)}px` : "no box");
const href = await cta.getAttribute("href").catch(() => "");
check("主操作が /foreign-workers/safety-training へ", href === "/foreign-workers/safety-training", href || "");

// (5) もう一方の動線「在留資格ガイド」が残っている。
const guideVisible = await page.getByRole("link", { name: /在留資格ガイド/ }).isVisible().catch(() => false);
check("2大動線「在留資格ガイド」が残る", guideVisible);

// (6) 旧・重複の件数タイル（定義リストの「対応言語」見出し）は撤去済み＝結論カードへ一本化。
const oldTile = await page.getByText("対応言語", { exact: true }).count();
check("旧・重複の件数タイル(対応言語)は撤去済み", oldTile === 0, `count=${oldTile}`);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
