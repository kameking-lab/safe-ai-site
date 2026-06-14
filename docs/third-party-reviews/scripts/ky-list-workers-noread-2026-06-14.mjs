// 柱0補充 KY周辺ユーティリティ 無読チェック（/ky/list 保存済みKY一覧・/ky/workers 作業員マスター）。
// 実行: cd web && (PORT=3100 npm run start &) ; node ../docs/third-party-reviews/scripts/ky-list-workers-noread-2026-06-14.mjs
// 無読の問い: 「初めて開く職長」が画面を3秒見て、空状態・件数（いまの状態）と次にやることを言えるか。
// 確認点:
//  /ky/list   (1)空: 結論カード「保存KYなし」＋次アクション「新規KY作成」(44px,/ky/paper)
//             (2)1件: 結論カード「1件 保存KY」＋次アクション「新規KY作成」
//  /ky/workers(3)空: 結論カード「登録なし」＋次アクション「作業員を追加」(44px,#add-worker)
//             (4)#add-worker フォームが実在しタップで飛べる
//             (5)1名: 結論カード「1名 登録済み」＋次アクション「KY用紙で使う」(/ky/paper)
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";

const WORKERS_KEY = "safe-ai:ky-workers:v1";
const KY_LIST_KEY = "safe-ai:ky-record-list:v1";

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

// ── /ky/list 空 ───────────────────────────────────────────
{
  const page = await open("/ky/list", { [KY_LIST_KEY]: "[]" });
  const t = await cardText(page);
  check("/ky/list 空: 結論カードに『保存KYなし』", /保存KYなし/.test(t), t.trim());
  const cta = card(page).getByRole("link", { name: /新規KY作成/ });
  check("/ky/list 空: 次アクション『新規KY作成』が見える", await cta.isVisible().catch(() => false));
  const box = await cta.boundingBox();
  check("/ky/list 空: 次アクションは44px以上", !!box && box.height >= 44, box ? `${Math.round(box.height)}px` : "なし");
  check("/ky/list 空: 次アクションは /ky/paper へ", (await cta.getAttribute("href")) === "/ky/paper");
  await page.close();
}

// ── /ky/list 1件 ──────────────────────────────────────────
{
  const summary = [
    {
      id: "k-1",
      workDate: "2026-06-13",
      companyName: "亀組",
      siteName: "○○ビル新築",
      projectName: "A工区",
      foremanName: "山田",
      workDetail: "鉄骨建方",
      weather: "晴",
      savedAt: "2026-06-13T08:00:00.000Z",
    },
  ];
  const page = await open("/ky/list", { [KY_LIST_KEY]: JSON.stringify(summary) });
  const t = await cardText(page);
  check("/ky/list 1件: 結論カードに『1』『保存KY』", /\b1\b/.test(t) && /保存KY/.test(t), t.trim());
  check(
    "/ky/list 1件: 次アクション『新規KY作成』が見える",
    await card(page).getByRole("link", { name: /新規KY作成/ }).isVisible().catch(() => false)
  );
  await page.close();
}

// ── /ky/workers 空 ────────────────────────────────────────
{
  const page = await open("/ky/workers", { [WORKERS_KEY]: "[]" });
  const t = await cardText(page);
  check("/ky/workers 空: 結論カードに『登録なし』", /登録なし/.test(t), t.trim());
  const cta = card(page).getByRole("link", { name: /作業員を追加/ });
  check("/ky/workers 空: 次アクション『作業員を追加』が見える", await cta.isVisible().catch(() => false));
  const box = await cta.boundingBox();
  check("/ky/workers 空: 次アクションは44px以上", !!box && box.height >= 44, box ? `${Math.round(box.height)}px` : "なし");
  check("/ky/workers 空: 次アクションは #add-worker へ", (await cta.getAttribute("href")) === "#add-worker");
  const form = page.locator("#add-worker");
  check("/ky/workers 空: #add-worker フォームが実在", await form.count() > 0);
  await cta.click();
  await page.waitForTimeout(200);
  check("/ky/workers 空: 次アクションのタップで #add-worker へ", page.url().endsWith("#add-worker"), page.url().split("/").pop());
  await page.close();
}

// ── /ky/workers 1名 ───────────────────────────────────────
{
  const workers = [
    {
      id: "w-1",
      name: "山田 太郎",
      affiliation: "self",
      company: "",
      qualNo: "1",
      isRegular: true,
      hidden: false,
      createdAt: 1700000000000,
    },
  ];
  const page = await open("/ky/workers", { [WORKERS_KEY]: JSON.stringify(workers) });
  const t = await cardText(page);
  check("/ky/workers 1名: 結論カードに『1』『登録済み』", /\b1\b/.test(t) && /登録済み/.test(t), t.trim());
  const cta = card(page).getByRole("link", { name: /KY用紙で使う/ });
  check("/ky/workers 1名: 次アクション『KY用紙で使う』が見える", await cta.isVisible().catch(() => false));
  check("/ky/workers 1名: 次アクションは /ky/paper へ", (await cta.getAttribute("href")) === "/ky/paper");
  await page.close();
}

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
