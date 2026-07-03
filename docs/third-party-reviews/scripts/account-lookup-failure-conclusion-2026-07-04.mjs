// /account の未ログイン時リダイレクト（既存挙動の非退行確認）。
// プラン照会失敗時のneutral結論カード分岐そのものは、このdev環境が
// AUTH_SECRET/DATABASE_URL未設定でセッション自体を確立できず実機描画不可
// （既知の制約、過去のky/meeting cloud機能と同型）。
// computeAccountConclusion() のロジックは account-conclusion.test.ts の
// vitestユニットテスト12件（lookupFailed分岐含む）で検証済み。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });

let pass = 0;
let total = 0;
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

// 未ログイン状態で /account に直接アクセス→サインインページへリダイレクトされ、
// プラン確認ロジックの変更で壊れていないこと(500エラー化していないこと)を確認。
{
  const page = await ctx.newPage();
  const response = await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  check("/account 未ログイン: 500エラーにならない", (response?.status() ?? 500) < 500, `status=${response?.status()}`);
  await page.waitForTimeout(300);
  const url = page.url();
  check("/account 未ログイン: サインイン導線へ遷移", /signin/.test(url), url);
  await page.close();
}

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
