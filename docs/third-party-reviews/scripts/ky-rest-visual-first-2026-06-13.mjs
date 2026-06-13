// 柱0バッチ3/9 KY残り画面(/ky→paper・/ky/list・/ky-examples・/ky/workers)ビジュアルファースト 無読チェック。
// 実行: cd web && (PORT=3100 npm run start &) ; node ../docs/third-party-reviews/scripts/ky-rest-visual-first-2026-06-13.mjs
// 確認点: (1)/ky/paper の画面h1が1個か(印刷シートのh1=2を是正) (2)各画面に結論カード(件数デカ数字)が出るか
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当
  serviceWorkers: "block", // PWAのSWがfetchを握るのを防ぐ(memory: dev-server-hang-prod-fallback)
});
const page = await ctx.newPage();

let pass = 0;
let total = 0;
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

// (1) /ky → /ky/paper（恒久リダイレクト）。画面h1=1（印刷シートのh1をpへ降格済）。
await page.goto(`${BASE}/ky`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const paperUrl = page.url();
const paperH1Dom = await page.locator("h1").count();
const paperH1Visible = await page.getByRole("heading", { level: 1 }).count();
check("/ky→/ky/paper にリダイレクト", /\/ky\/paper/.test(paperUrl), paperUrl);
check("/ky/paper の h1 が DOM全体で 1個（印刷シートh1是正）", paperH1Dom === 1, `dom=${paperH1Dom} visible=${paperH1Visible}`);

// (2) /ky/list 結論カード（保存件数 or 保存なし）。
await page.goto(`${BASE}/ky/list`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const listConc = await page.getByRole("status", { name: /いまの状態/ }).first().innerText().catch(() => "(なし)");
const listH1 = await page.locator("h1").count();
check("/ky/list 結論カードあり", listConc !== "(なし)", listConc.replace(/\n/g, " / "));
check("/ky/list h1=1", listH1 === 1, `h1=${listH1}`);

// (3) /ky-examples 結論カード（該当事例N件）。
await page.goto(`${BASE}/ky-examples`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const exConc = await page.getByRole("status", { name: /いまの状態/ }).first().innerText().catch(() => "(なし)");
const exH1 = await page.locator("h1").count();
check("/ky-examples 結論カードあり（該当事例N件）", exConc !== "(なし)", exConc.replace(/\n/g, " / "));
check("/ky-examples h1=1", exH1 === 1, `h1=${exH1}`);

// (4) /ky/workers 結論カード（登録N名 or 登録なし）。
await page.goto(`${BASE}/ky/workers`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const wkConc = await page.getByRole("status", { name: /いまの状態/ }).first().innerText().catch(() => "(なし)");
const wkH1 = await page.locator("h1").count();
check("/ky/workers 結論カードあり", wkConc !== "(なし)", wkConc.replace(/\n/g, " / "));
check("/ky/workers h1=1", wkH1 === 1, `h1=${wkH1}`);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
