// 無読テスト: 柱0バッチ7/9 統計・速報系ビジュアルファースト
// 対象: /accidents-reports ・ /accident-news ・ /accidents-analytics ・ /stats
// 「段落を読まず色とデカい要素しか見ない現場の人」ペルソナで、3秒で「いまの状態」が分かるか機械検証。
// 実行: prod server(npm run build && npm run start)→ node docs/third-party-reviews/scripts/stats-news-visual-first-2026-06-13.mjs
// 既知事象(memory): devサーバーはハングするのでprod serverで実行。PWAのSWがroute握るためserviceWorkers:"block"。
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12相当
  serviceWorkers: "block",
});
const page = await context.newPage();

async function h1Count(p) {
  return p.locator("h1").count();
}
async function firstStatusCard(p) {
  // ConclusionCard は role=status / aria-label="いまの状態: ..."
  const card = p.locator('section[role="status"][aria-label^="いまの状態"]').first();
  if ((await card.count()) === 0) return null;
  const box = await card.boundingBox();
  const text = (await card.innerText()).replace(/\s+/g, " ").trim();
  return { box, text };
}

// ---- 1) /accidents-reports ----
await page.goto(`${BASE}/accidents-reports`, { waitUntil: "networkidle" });
check("reports: h1 が1個", (await h1Count(page)) === 1, `h1=${await h1Count(page)}`);
{
  const card = await firstStatusCard(page);
  check("reports: 結論カードが存在", !!card, card ? card.text.slice(0, 40) : "なし");
  check("reports: 結論カードがファーストビュー内(y<700)", card && card.box && card.box.y < 700, card?.box ? `y=${Math.round(card.box.y)}` : "—");
  // 収録件数のデカ数字(text-5xl)が見える
  const bigNum = page.locator('section[role="status"] .text-5xl').first();
  check("reports: デカ数字(件数)が表示", (await bigNum.count()) > 0 && /[0-9,]/.test(await bigNum.innerText()), (await bigNum.count()) ? await bigNum.innerText() : "なし");
  // 長文説明が折りたたみ(details, 初期閉)
  const det = page.locator("details", { hasText: "このレポートについて" }).first();
  check("reports: 説明が折りたたみに格納", (await det.count()) > 0);
  check("reports: 折りたたみは初期閉", (await det.count()) > 0 && !(await det.evaluate((el) => el.open)));
}

// ---- 2) /accident-news (絞り込みなし) ----
await page.goto(`${BASE}/accident-news`, { waitUntil: "networkidle" });
check("news: h1 が1個", (await h1Count(page)) === 1, `h1=${await h1Count(page)}`);
{
  const card = await firstStatusCard(page);
  check("news: 結論カード(収録総数)が存在", !!card && /収録/.test(card.text), card ? card.text.slice(0, 40) : "なし");
  check("news: 結論カードがファーストビュー内(y<700)", card && card.box && card.box.y < 700, card?.box ? `y=${Math.round(card.box.y)}` : "—");
  const det = page.locator("details", { hasText: "このブラウザについて" }).first();
  check("news: 説明が折りたたみ・初期閉", (await det.count()) > 0 && !(await det.evaluate((el) => el.open)));
  // 偽の緑なし: 該当件数の小ラベルが emerald でない
  const greenCount = await page.locator("span.text-emerald-700", { hasText: /^[0-9,]+$/ }).count();
  check("news: 死亡事例件数に偽の緑を使っていない", greenCount === 0, `emerald件数=${greenCount}`);
}

// ---- 2b) /accident-news (絞り込みヒット0) ----
await page.goto(`${BASE}/accident-news?q=__zzz_no_such_case__`, { waitUntil: "networkidle" });
{
  const card = await firstStatusCard(page);
  check("news(0件): 黄『該当なし』結論カード", !!card && /該当なし/.test(card.text), card ? card.text.slice(0, 30) : "なし");
}

// ---- 3) /accidents-analytics ----
await page.goto(`${BASE}/accidents-analytics`, { waitUntil: "networkidle" });
check("analytics: h1 が1個", (await h1Count(page)) === 1, `h1=${await h1Count(page)}`);
{
  const det = page.locator("details", { hasText: "このダッシュボードのデータ源について" }).first();
  check("analytics: 説明が折りたたみ・初期閉", (await det.count()) > 0 && !(await det.evaluate((el) => el.open)));
  // 軸G(まず業種の要点) or KPIデカ数字がファーストビュー近くにある
  const axisG = page.locator("text=まず、あなたの業種の要点を見る").first();
  check("analytics: 『3秒で分かる』軸Gが存在", (await axisG.count()) > 0);
  const axisBox = (await axisG.count()) > 0 ? await axisG.boundingBox() : null;
  check("analytics: 軸Gが説明折りたたみ化で上方へ(y<600)", axisBox && axisBox.y < 600, axisBox ? `y=${Math.round(axisBox.y)}` : "—");
}

// ---- 4) /stats ----
await page.goto(`${BASE}/stats`, { waitUntil: "networkidle" });
check("stats: h1 が1個", (await h1Count(page)) === 1, `h1=${await h1Count(page)}`);
{
  const det = page.locator("details", { hasText: "このダッシュボードについて" }).first();
  check("stats: 補足説明が折りたたみ・初期閉", (await det.count()) > 0 && !(await det.evaluate((el) => el.open)));
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\n==== 無読テスト ${passed}/${results.length} PASS ====`);
process.exit(passed === results.length ? 0 : 1);
