// 柱0補充 /site-records/committee・/site-records/monthly の ConclusionCard action未指定を是正した回帰確認。
// 実行: cd web && npm run build && (PORT=3100 npm run start &) ; node ../docs/third-party-reviews/scripts/committee-monthly-action-links-2026-07-03.mjs
// 無読の問い: 「毎月委員会を回す安全担当」が結論カードを見て「次にやること」へその場でタップして辿り着けるか。
// 確認点:
//  /site-records/committee (1)今月開催済=緑・action不要
//                           (2)今月未開催・前回あり=「前回をベースに新規」action(#committee-actions)→実ボタンが可視化
//                           (3)今月未開催・前回なし=「議事録を作成」action(#committee-actions)
//  /site-records/monthly   (4)使用不可を含む要対応=赤「点検を確認」(/site-records/inspection#saved-inspections)
//                           (5)パトロールのみ要対応=黄「パトロールを確認」(/site-records/patrol#open-findings)
//                           (6)ヒヤリハットのみ要対応=黄「ヒヤリハットを確認」(/site-records/near-miss#nearmiss-list)
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";

const COMMITTEE_LIST_KEY = "safe-ai:committee-list:v1";
const PATROL_LIST_KEY = "safe-ai:patrol-list:v1";
const NEARMISS_LIST_KEY = "safe-ai:nearmiss-list:v1";
const INSPECTION_LIST_KEY = "safe-ai:inspection-list:v1";

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

const now = new Date();
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 10);
const prevMonthDate = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}-10`;
const thisMonthDate = `${thisMonth}-05`;

// ── /site-records/committee (1) 今月開催済 ───────────────────────────
{
  const seed = {
    [COMMITTEE_LIST_KEY]: JSON.stringify([
      { id: "c1", date: thisMonthDate, committeeType: "both", place: "本社", agendaCount: 8, decidedCount: 2, savedAt: thisMonthDate },
    ]),
  };
  const page = await open("/site-records/committee", seed);
  const t = await cardText(page);
  check("committee 今月開催済: 結論カードに『今月開催済』", /今月開催済/.test(t), t.trim());
  await page.close();
}

// ── /site-records/committee (2) 今月未開催・前回あり ─────────────────
{
  const seed = {
    [COMMITTEE_LIST_KEY]: JSON.stringify([
      { id: "c0", date: prevMonthDate, committeeType: "both", place: "本社", agendaCount: 8, decidedCount: 3, savedAt: prevMonthDate },
    ]),
  };
  const page = await open("/site-records/committee", seed);
  const t = await cardText(page);
  check("committee 前回あり: 結論カードに『今月未開催』", /今月未開催/.test(t), t.trim());
  const cta = card(page).getByRole("link", { name: /前回をベースに新規/ });
  check("committee 前回あり: 次アクション『前回をベースに新規』が見える", await cta.isVisible().catch(() => false));
  const box = await cta.boundingBox();
  check("committee 前回あり: 次アクションは44px以上", !!box && box.height >= 44, box ? `${Math.round(box.height)}px` : "なし");
  check("committee 前回あり: 次アクションは #committee-actions へ", (await cta.getAttribute("href")) === "#committee-actions");
  await cta.click();
  await page.waitForTimeout(400);
  const realButton = page.getByRole("button", { name: /前回をベースに新規（委員・場所を引き継ぎ）/ });
  check("committee 前回あり: タップ先に実ボタン『前回をベースに新規（委員・場所を引き継ぎ）』が可視化", await realButton.isVisible().catch(() => false));
  await page.close();
}

// ── /site-records/committee (3) 今月未開催・前回なし ─────────────────
{
  const seed = { [COMMITTEE_LIST_KEY]: "[]" };
  const page = await open("/site-records/committee", seed);
  const t = await cardText(page);
  check("committee 前回なし: 結論カードに『今月未開催』", /今月未開催/.test(t), t.trim());
  const cta = card(page).getByRole("link", { name: /議事録を作成/ });
  check("committee 前回なし: 次アクション『議事録を作成』が見える", await cta.isVisible().catch(() => false));
  check("committee 前回なし: 次アクションは #committee-actions へ", (await cta.getAttribute("href")) === "#committee-actions");
  await page.close();
}

// ── /site-records/monthly (4) 使用不可を含む要対応 ───────────────────
{
  const seed = {
    [PATROL_LIST_KEY]: JSON.stringify([
      { id: "p1", date: thisMonthDate, inspector: "佐藤", area: "1F", ngCount: 1, findingCount: 1, openCount: 1, savedAt: thisMonthDate },
    ]),
    [NEARMISS_LIST_KEY]: "[]",
    [INSPECTION_LIST_KEY]: JSON.stringify([
      { id: "i1", date: thisMonthDate, site: "現場A", equipKind: "mobile-crane", equipName: "クレーン1号", ngCount: 1, usable: false, savedAt: thisMonthDate },
    ]),
  };
  const page = await open("/site-records/monthly", seed);
  await page.waitForTimeout(400);
  const t = await cardText(page);
  check("monthly 使用不可あり: 結論カードに『要対応』", /要対応/.test(t), t.trim());
  const cta = card(page).getByRole("link", { name: /点検を確認/ });
  check("monthly 使用不可あり: 次アクション『点検を確認』が見える", await cta.isVisible().catch(() => false));
  check(
    "monthly 使用不可あり: 次アクションは /site-records/inspection#saved-inspections へ",
    (await cta.getAttribute("href")) === "/site-records/inspection#saved-inspections",
  );
  await page.close();
}

// ── /site-records/monthly (5) パトロールのみ要対応 ───────────────────
{
  const seed = {
    [PATROL_LIST_KEY]: JSON.stringify([
      { id: "p1", date: thisMonthDate, inspector: "佐藤", area: "1F", ngCount: 2, findingCount: 2, openCount: 2, savedAt: thisMonthDate },
    ]),
    [NEARMISS_LIST_KEY]: "[]",
    [INSPECTION_LIST_KEY]: JSON.stringify([
      { id: "i1", date: thisMonthDate, site: "現場A", equipKind: "mobile-crane", equipName: "クレーン1号", ngCount: 0, usable: true, savedAt: thisMonthDate },
    ]),
  };
  const page = await open("/site-records/monthly", seed);
  await page.waitForTimeout(400);
  const t = await cardText(page);
  check("monthly パトロールのみ: 結論カードに『要対応』", /要対応/.test(t), t.trim());
  const cta = card(page).getByRole("link", { name: /パトロールを確認/ });
  check("monthly パトロールのみ: 次アクション『パトロールを確認』が見える", await cta.isVisible().catch(() => false));
  check(
    "monthly パトロールのみ: 次アクションは /site-records/patrol#open-findings へ",
    (await cta.getAttribute("href")) === "/site-records/patrol#open-findings",
  );
  await page.close();
}

// ── /site-records/monthly (6) ヒヤリハットのみ要対応 ─────────────────
{
  const seed = {
    [PATROL_LIST_KEY]: "[]",
    [NEARMISS_LIST_KEY]: JSON.stringify([
      {
        id: "n1",
        date: thisMonthDate,
        site: "現場A",
        reporter: "鈴木",
        type: "転倒",
        location: "1F通路",
        situation: "床が濡れていた",
        cause: "清掃後の乾燥不足",
        countermeasure: "注意喚起の掲示",
        potential: "low",
        resolved: false,
        savedAt: thisMonthDate,
      },
    ]),
    [INSPECTION_LIST_KEY]: "[]",
  };
  const page = await open("/site-records/monthly", seed);
  await page.waitForTimeout(400);
  const t = await cardText(page);
  check("monthly ヒヤリハットのみ: 結論カードに『要対応』", /要対応/.test(t), t.trim());
  const cta = card(page).getByRole("link", { name: /ヒヤリハットを確認/ });
  check("monthly ヒヤリハットのみ: 次アクション『ヒヤリハットを確認』が見える", await cta.isVisible().catch(() => false));
  check(
    "monthly ヒヤリハットのみ: 次アクションは /site-records/near-miss#nearmiss-list へ",
    (await cta.getAttribute("href")) === "/site-records/near-miss#nearmiss-list",
  );
  await page.close();
}

console.log(`\n結果: ${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
