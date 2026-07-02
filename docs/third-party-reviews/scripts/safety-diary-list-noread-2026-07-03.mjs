// 柱0補充 /safety-diary/list（保存した打合せ書一覧）無読チェック。/ky/list との対称化。
// 実行: cd web && (PORT=3100 npm run start &) ; node ../docs/third-party-reviews/scripts/safety-diary-list-noread-2026-07-03.mjs
// 無読の問い: 「毎日書く職長」が画面を3秒見て、保存件数（いまの状態）と次にやることを言えるか。
// 確認点:
//  (1)空: 結論カード「保存した打合せ書なし」＋次アクション「新規作成」(44px,/safety-diary)
//  (2)1件: 結論カード「1件 保存した打合せ書」＋次アクション「新規作成」
//  (3)検索で0件: 結論カード「該当なし」
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";
const LIST_KEY = "safe-ai:meeting-list:v1";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当（モバイルで読めるか）
  serviceWorkers: "block",
});

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
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return page;
}

const card = (page) => page.locator('section[aria-label^="いまの状態"]').first();
async function cardText(page) {
  return (await card(page).innerText().catch(() => "")).replace(/\n/g, " ");
}

// ── 空 ────────────────────────────────────────────────────
{
  const page = await open("/safety-diary/list", { [LIST_KEY]: "[]" });
  const t = await cardText(page);
  check("空: 結論カードに『保存した打合せ書なし』", /保存した打合せ書なし/.test(t), t.trim());
  const cta = card(page).getByRole("link", { name: /新規作成/ });
  check("空: 次アクション『新規作成』が見える", await cta.isVisible().catch(() => false));
  const box = await cta.boundingBox();
  check("空: 次アクションは44px以上", !!box && box.height >= 44, box ? `${Math.round(box.height)}px` : "なし");
  check("空: 次アクションは /safety-diary へ", (await cta.getAttribute("href")) === "/safety-diary");
  await page.close();
}

// ── 1件 ───────────────────────────────────────────────────
{
  const summary = [
    {
      id: "m-1",
      savedAt: "2026-07-02T08:00:00.000Z",
      workDate: "2026-07-02",
      siteName: "○○ビル新築",
      author: "山田",
      contractorCount: 3,
    },
  ];
  const page = await open("/safety-diary/list", { [LIST_KEY]: JSON.stringify(summary) });
  const t = await cardText(page);
  check("1件: 結論カードに『1』『保存した打合せ書』", /\b1\b/.test(t) && /保存した打合せ書/.test(t), t.trim());
  check(
    "1件: 次アクション『新規作成』が見える",
    await card(page).getByRole("link", { name: /新規作成/ }).isVisible().catch(() => false)
  );
  await page.close();
}

// ── 検索で0件 ──────────────────────────────────────────────
{
  const summary = [
    {
      id: "m-2",
      savedAt: "2026-07-02T08:00:00.000Z",
      workDate: "2026-07-02",
      siteName: "○○ビル新築",
      author: "山田",
      contractorCount: 3,
    },
  ];
  const page = await open("/safety-diary/list", { [LIST_KEY]: JSON.stringify(summary) });
  await page.getByPlaceholder("現場名・作成者で検索").fill("該当しないキーワード");
  await page.waitForTimeout(200);
  const t = await cardText(page);
  check("検索0件: 結論カードに『該当なし』", /該当なし/.test(t), t.trim());
  await page.close();
}

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
