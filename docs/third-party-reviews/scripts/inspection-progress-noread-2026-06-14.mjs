// 柱3レビュー 作業開始前点検 書きかけ進捗の無読チェック（/site-records/inspection）。
// ペルソナ: 毎朝この画面を回す職長。本文を読まず画面を3秒見て、
//   「いまの状態（未点検／途中／全良／不良あり）」と「次にやること」を言えるか。
// 実行: cd web && npm run build && (PORT=3101 npm run start &) ; node ../docs/third-party-reviews/scripts/inspection-progress-noread-2026-06-14.mjs
// 確認点: (1)進捗バー(role=status)が点検項目の直上に見える (2)初期状態=未点検（黄・next=良／不良で判定）
//         (3)良/不良/対象外の内訳が読める (4)印刷帳票には載らない(print:hidden=正式書式不変)
//         (5)1項目を「良」にすると状態が途中(progress)へ遷移 (6)「不良」にすると状態が赤(ng)・是正を促す。
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

await page.goto(`${BASE}/site-records/inspection`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

const progress = page.locator("[data-inspection-progress]");

// (1) 進捗バー（role=status）が見える。
const visible = await progress.isVisible().catch(() => false);
check("進捗バー([data-inspection-progress])が見える", visible);
const role = await progress.getAttribute("role").catch(() => "");
check("role=status（支援技術にも状態通知）", role === "status", role || "");

// (2) 初期状態＝未点検（黄）。次にやること「各項目を 良／不良 で判定」が読める。
const initState = await progress.getAttribute("data-inspection-progress").catch(() => "");
check("初期状態が未点検(none)", initState === "none", initState || "");
const initText = (await progress.innerText().catch(() => "")) || "";
check("ラベル「未点検」が見える", /未点検/.test(initText));
check("次アクション「良／不良 で判定」が読める", /良／不良 で判定/.test(initText), initText.replace(/\s+/g, " ").slice(0, 50));

// (3) 良/不良/対象外の内訳が一目で読める。
check("内訳（良・不良・対象外）が読める", /良 \d+・不良 \d+・対象外 \d+/.test(initText));

// (4) 印刷帳票には載らない（A4正式書式は不変）。
const cls = (await progress.getAttribute("class").catch(() => "")) || "";
check("印刷では非表示(print:hidden)＝正式書式不変", /print:hidden/.test(cls));

// (5) 1項目を「良」にすると状態が途中(progress)へ遷移する。
await page.getByRole("button", { name: "良", exact: true }).first().click();
await page.waitForTimeout(200);
const afterOk = await progress.getAttribute("data-inspection-progress").catch(() => "");
check("「良」を1件付けると途中(progress)へ遷移", afterOk === "progress", afterOk || "");
const okText = (await progress.innerText().catch(() => "")) || "";
check("途中ラベル「判定済み n／N項目」が読める", /判定済み \d+／\d+項目/.test(okText), okText.replace(/\s+/g, " ").slice(0, 50));

// (6) 「不良」を付けると状態が赤(ng)になり、是正・使用可否の確認を促す。
await page.getByRole("button", { name: "不良", exact: true }).first().click();
await page.waitForTimeout(200);
const afterNg = await progress.getAttribute("data-inspection-progress").catch(() => "");
check("「不良」を付けると赤(ng)へ遷移", afterNg === "ng", afterNg || "");
const ngText = (await progress.innerText().catch(() => "")) || "";
check("赤ラベルが是正・使用可否の確認を促す", /不良 \d+件 — 是正と使用可否を確認/.test(ngText), ngText.replace(/\s+/g, " ").slice(0, 50));

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
