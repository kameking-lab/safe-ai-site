// 柱0補充・次点 /ky-examples（KY事例データベース）結論カード action未指定＋主CTA44px未満の是正。
// 実行: cd web && (PORT=3100 npm run start &) ; node ../docs/third-party-reviews/scripts/ky-examples-conclusion-cta-44px-2026-07-03.mjs
// 無読の問い: 「初めて開く職長/安全担当」が画面を3秒見て、該当件数（いまの状態）と次にやること（KY用紙を作る）を言えるか。
// 確認点:
//  (1)通常表示: 結論カードに件数＋『該当事例』
//  (2)結論カード内に次アクション『KY用紙を作る』(44px以上,/ky/paper)が見える
//  (3)ヘッダー内の旧CTA（重複・44px未満）が撤去されている
// 注: 0件（該当なし）状態は5業種×10作業種別の全組合せにデータが存在するため
// 現行データではUI操作から到達不能（捏造回避のため実データで到達できる状態のみ検証、
// 0件分岐のaction付与はコードレビューで確認）。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";

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

async function open(path) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return page;
}

const card = (page) => page.locator('section[aria-label^="いまの状態"]').first();
async function cardText(page) {
  return (await card(page).innerText().catch(() => "")).replace(/\n/g, " ");
}

// ── /ky-examples 通常表示 ───────────────────────────────────
{
  const page = await open("/ky-examples");
  const t = await cardText(page);
  check("通常表示: 結論カードに『該当事例』", /該当事例/.test(t), t.trim());
  const cta = card(page).getByRole("link", { name: /KY用紙を作る/ });
  check("通常表示: 結論カード内に次アクション『KY用紙を作る』が見える", await cta.isVisible().catch(() => false));
  const box = await cta.boundingBox();
  check("通常表示: 次アクションは44px以上", !!box && box.height >= 44, box ? `${Math.round(box.height)}px` : "なし");
  check("通常表示: 次アクションは /ky/paper へ", (await cta.getAttribute("href")) === "/ky/paper");
  const oldCta = page.getByRole("link", { name: /KY用紙の作成へ進む/ });
  check("通常表示: ヘッダー内の旧重複CTAは撤去済み", (await oldCta.count()) === 0);
  await page.close();
}

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
