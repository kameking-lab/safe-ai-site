// 柱0仕上げ 健診スケジューラ入口 無読チェック（/health-checkup-scheduler）。
// 実行: cd web && npm run build && (PORT=3100 npm run start &) ; node ../docs/third-party-reviews/scripts/checkup-scheduler-conclusion-noread-2026-06-14.mjs
// 無読の問い: 画面を3秒見て、健診担当が「この場で法定健診を自動判定できる」と分かり、
//             次にやること=「入力をはじめる」を即断でき、長い法令説明で散らかっていないか。
// 確認点: (1)結論カード(role=status)が最上部に見える (2)デカ数字「30種 健診を自動判定」
//         (3)区分/職種/無料のバッジが見える (4)主操作「入力をはじめる」が44px以上で見える
//         (5)初期表示で長い法令説明は折りたたまれて散らかっていない (6)詳細を開くと法令説明が残っている。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";

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

await page.goto(`${BASE}/health-checkup-scheduler`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

// (1) 結論カード（role=status）が見える。
const card = page.getByRole("status", { name: /いまの状態/ });
const cardVisible = await card.isVisible().catch(() => false);
check("結論カード(role=status)が最上部に見える", cardVisible);

// (2) デカ数字「30」+「種」+「健診を自動判定」が見える。
const cardText = (await card.innerText().catch(() => "")) || "";
check("デカ数字「30」が見える", /30/.test(cardText), cardText.replace(/\s+/g, " ").slice(0, 60));
check("単位「種」が見える", /種/.test(cardText));
check("状態ラベル「健診を自動判定」が見える", /健診を自動判定/.test(cardText));

// (3) 区分/職種/無料のバッジが見える。
check("「8区分」バッジが見える", /8区分/.test(cardText));
check("「106職種対応」バッジが見える", /106職種対応/.test(cardText));
check("「無料・登録不要」バッジが見える", /無料・登録不要/.test(cardText));

// (4) 主操作「入力をはじめる」が見え、44px以上のタップ標的。
const cta = page.getByRole("link", { name: /入力をはじめる/ });
const ctaVisible = await cta.isVisible().catch(() => false);
check("主操作「入力をはじめる」が見える", ctaVisible);
const box = await cta.boundingBox().catch(() => null);
check("主操作が44px以上のタップ標的", !!box && box.height >= 44, box ? `${Math.round(box.height)}px` : "no box");

// (5) 初期表示では長い法令説明（特化則 個別物質14種…）が折りたたまれて散らかっていない。
const lawLine = page.getByText(/特化則（個別物質14種/);
const lawVisibleBefore = await lawLine.isVisible().catch(() => false);
check("初期表示で長い法令説明は散らかっていない", !lawVisibleBefore);

// (6) 詳細サマリーを開くと法令説明が残っている（正確性は不可侵＝隠すのは可・消すのは不可）。
const summary = page.getByText(/この判定でカバーする範囲/);
await summary.click();
await page.waitForTimeout(300);
const lawVisibleAfter = await lawLine.isVisible().catch(() => false);
check("詳細を開くと法令説明が残っている", lawVisibleAfter);

// (7) CTA が入力フォームへ繋がっている（アンカー先 #scheduler-form が存在）。
const formAnchor = await page.locator("#scheduler-form").count();
check("入力フォーム(#scheduler-form)が存在する", formAnchor > 0);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
