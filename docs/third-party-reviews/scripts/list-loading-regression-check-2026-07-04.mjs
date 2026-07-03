// 一時検証用（regression sanity check、networkidle待ちがこの環境で不安定なため
// waitForSelector主体に書き換えた最小版）。/ky/list・/safety-diary/list の
// 既存3状態(空/1件/検索0件)が確認中ステートの追加後も壊れていないかを確認。
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

async function open(path, seed) {
  const page = await ctx.newPage();
  if (seed) {
    await page.addInitScript((s) => {
      for (const [k, v] of Object.entries(s)) window.localStorage.setItem(k, v);
    }, seed);
  }
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  const status = page.locator('section[aria-label^="いまの状態"]').first();
  await status.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(300);
  return page;
}

const card = (page) => page.locator('section[aria-label^="いまの状態"]').first();
async function cardText(page) {
  return (await card(page).innerText().catch(() => "")).replace(/\n/g, " ");
}

// /ky/list 空
{
  const page = await open("/ky/list", { "safe-ai:ky-record-list:v1": "[]" });
  const t = await cardText(page);
  check("/ky/list 空: 『保存KYなし』（確認中で止まっていない）", /保存KYなし/.test(t), t.trim());
  await page.close();
}

// /safety-diary/list 空
{
  const page = await open("/safety-diary/list", { "safe-ai:meeting-list:v1": "[]" });
  const t = await cardText(page);
  check("/safety-diary/list 空: 『打合せ書なし』（確認中で止まっていない）", /打合せ書なし/.test(t), t.trim());
  await page.close();
}

// /safety-diary/list 1件
{
  const summary = [
    { id: "m-1", savedAt: "2026-07-02T08:00:00.000Z", workDate: "2026-07-02", siteName: "○○ビル新築", author: "山田", contractorCount: 3 },
  ];
  const page = await open("/safety-diary/list", { "safe-ai:meeting-list:v1": JSON.stringify(summary) });
  const t = await cardText(page);
  check("/safety-diary/list 1件: 『保存打合せ書』", /保存打合せ書/.test(t), t.trim());
  await page.close();
}

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
