// 柱0磨き 巡回発見＝site-records 保存済み一覧の行内操作ボタン（開く/削除/トグル等）が
// 下部操作バー(PR #725)の44px化から取り残されていた分の是正・無読チェック。
// 実行: cd web && npm run build && PORT=3100 npm run start
//   BASE_URL=http://localhost:3100 node ../docs/third-party-reviews/scripts/site-records-list-row-buttons-44px-2026-07-03.mjs
//
// ペルソナ: 保存済みの記録を後から見返す・削除する職長・安全担当。
// 対象:
//   committee/incident-report/induction/inspection/patrol/procedure/qualifications
//     各保存済み一覧行の「開く」「削除」（＋committeeの「この回をベースに次月を作成」）
//   inspection の「使用可／使用不可」トグル
//   near-miss の「対応中／対策済」「削除」
//   patrol の未是正指摘一覧「記録を開く」
//   qualifications の逆引き名簿「（作業者名）の記録を開く」ボタン
//   records-overview（トップ埋込 DailyActionsPanel）の「残りN件をすべて表示」
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE_URL ?? process.env.BASE ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const checkHeight = async (page, label, detail = "") => {
  const btn = page.getByRole("button", { name: label }).first();
  const box = await btn.boundingBox();
  check(`「${label}」が44px以上${detail}`, !!box && box.height >= 44, `height=${box?.height}`);
};

const seed = async (page, entries) => {
  await page.addInitScript((kvs) => {
    for (const [k, v] of kvs) window.localStorage.setItem(k, v);
  }, entries.map(([k, v]) => [k, JSON.stringify(v)]));
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });

// ── committee ────────────────────────────────────────────────
{
  const page = await ctx.newPage();
  await seed(page, [
    ["safe-ai:committee-list:v1", [{ id: "c-1", date: "2026-06-01", committeeType: "both", place: "会議室", agendaCount: 3, decidedCount: 2, savedAt: "2026-06-01T00:00:00.000Z" }]],
  ]);
  await page.goto(`${BASE}/site-records/committee`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/committee] 保存済み一覧の行内ボタン");
  await checkHeight(page, "この回をベースに次月を作成");
  await checkHeight(page, "開く");
  await checkHeight(page, "削除");
  await page.close();
}

// ── incident-report ──────────────────────────────────────────
{
  const page = await ctx.newPage();
  await seed(page, [
    ["safe-ai:incident-report-list:v1", [{ id: "i-1", createdDate: "2026-06-01", formType: "accident", siteName: "○○現場", victimName: "山田", occurredAt: "2026-06-01 09:00", savedAt: "2026-06-01T00:00:00.000Z" }]],
  ]);
  await page.goto(`${BASE}/site-records/incident-report`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/incident-report] 保存済み一覧の行内ボタン");
  await checkHeight(page, "開く");
  await checkHeight(page, "削除");
  await page.close();
}

// ── induction ────────────────────────────────────────────────
{
  const page = await ctx.newPage();
  await seed(page, [
    ["safe-ai:induction-list:v1", [{ id: "d-1", date: "2026-06-01", siteName: "○○現場", workerName: "山田", company: "亀組", doneCount: 8, total: 8, savedAt: "2026-06-01T00:00:00.000Z" }]],
  ]);
  await page.goto(`${BASE}/site-records/induction`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/induction] 保存済み一覧の行内ボタン");
  await checkHeight(page, "開く");
  await checkHeight(page, "削除");
  await page.close();
}

// ── inspection（トグル＋一覧）＋records-overview（残りを表示） ──
{
  const inspections = Array.from({ length: 7 }, (_, i) => ({
    id: `n-${i + 1}`,
    date: "2026-06-01",
    site: "○○現場",
    equipKind: "crane",
    equipName: `重機${i + 1}号`,
    ngCount: 1,
    usable: false,
    savedAt: "2026-06-01T00:00:00.000Z",
  }));
  const page = await ctx.newPage();
  await seed(page, [["safe-ai:inspection-list:v1", inspections]]);
  await page.goto(`${BASE}/site-records/inspection`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/inspection] 使用可否トグル＋保存済み一覧の行内ボタン");
  await checkHeight(page, "使用可");
  await checkHeight(page, "使用不可");
  await checkHeight(page, "開く");
  await checkHeight(page, "削除");
  await page.close();

  const page2 = await ctx.newPage();
  await seed(page2, [["safe-ai:inspection-list:v1", inspections]]);
  await page2.goto(`${BASE}/site-records`, { waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(400);
  console.log("\n[/site-records] 今日やることパネルの「残りを表示」");
  await checkHeight(page2, /残り \d+ 件をすべて表示/);
  await page2.close();
}

// ── near-miss ────────────────────────────────────────────────
{
  const page = await ctx.newPage();
  await seed(page, [
    ["safe-ai:nearmiss-list:v1", [{ id: "m-1", date: "2026-06-01", site: "○○現場", reporter: "山田", type: "fall", location: "3階開口部", situation: "脚立がぐらついた", cause: "設置面不安定", countermeasure: "点検徹底", potential: "high", resolved: false, savedAt: "2026-06-01T00:00:00.000Z" }]],
  ]);
  await page.goto(`${BASE}/site-records/near-miss`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/near-miss] 一覧行の対応トグル・削除");
  await checkHeight(page, "対応中");
  await checkHeight(page, "削除");
  await page.close();
}

// ── patrol（保存済み一覧＋未是正指摘「記録を開く」）─────────────
{
  const record = {
    id: "p-1",
    date: "2026-06-01",
    time: "09:00",
    inspector: "山田",
    role: "職長",
    area: "3階作業区画",
    checks: [],
    findings: [{ id: "f-1", location: "3階開口部", content: "手すり未設置", severity: "high", owner: "山田", due: "2026-06-30", resolved: false }],
    summary: "",
    savedAt: "2026-06-01T00:00:00.000Z",
  };
  const summary = { id: "p-1", date: "2026-06-01", inspector: "山田", area: "3階作業区画", ngCount: 1, findingCount: 1, openCount: 1, savedAt: "2026-06-01T00:00:00.000Z" };
  const page = await ctx.newPage();
  await seed(page, [
    ["safe-ai:patrol-list:v1", [summary]],
    ["safe-ai:patrol-by-id:v1", { "p-1": record }],
  ]);
  await page.goto(`${BASE}/site-records/patrol`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/patrol] 保存済み一覧・未是正指摘の行内ボタン");
  await checkHeight(page, "開く");
  await checkHeight(page, "削除");
  await checkHeight(page, "記録を開く");
  await page.close();
}

// ── procedure ────────────────────────────────────────────────
{
  const page = await ctx.newPage();
  await seed(page, [
    ["safe-ai:procedure-list:v1", [{ id: "s-1", title: "鉄骨建方", site: "○○現場", date: "2026-06-01", stepCount: 5, savedAt: "2026-06-01T00:00:00.000Z" }]],
  ]);
  await page.goto(`${BASE}/site-records/procedure`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/procedure] 保存済み一覧の行内ボタン");
  await checkHeight(page, "開く");
  await checkHeight(page, "削除");
  await page.close();
}

// ── qualifications（保存済み一覧＋逆引き名簿）───────────────────
{
  const worker = {
    id: "w-1",
    workerName: "山田 太郎",
    company: "亀組",
    trade: "とび工",
    quals: [{ id: "q-1", name: "フルハーネス型墜落制止用器具 特別教育", date: "2026-01-01" }],
    note: "",
    savedAt: "2026-06-01T00:00:00.000Z",
  };
  const summary = { id: "w-1", workerName: "山田 太郎", company: "亀組", qualCount: 1, savedAt: "2026-06-01T00:00:00.000Z" };
  const page = await ctx.newPage();
  await seed(page, [
    ["safe-ai:qual-list:v1", [summary]],
    ["safe-ai:qual-by-id:v1", { "w-1": worker }],
  ]);
  await page.goto(`${BASE}/site-records/qualifications`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/qualifications] 保存済み一覧・逆引き名簿の行内ボタン");
  await checkHeight(page, "開く");
  await checkHeight(page, "削除");
  await checkHeight(page, "山田 太郎", "（逆引き名簿）");
  await page.close();
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
