// 柱0磨き 巡回発見＝対になる/ky/list等は44px済みなのに/safety-diary/listだけ取り残されていた
// 行内ボタン、/safety-diary・/ky/paper?canvas=0のクラシックUIズームコントロール、
// site-records各画面の「行を追加」系ボタンが44px未満だった分の是正・無読チェック。
// 実行: cd web && npm run build && PORT=3100 npm run start
//   BASE_URL=http://localhost:3100 node ../docs/third-party-reviews/scripts/meeting-site-records-add-buttons-44px-2026-07-03.mjs
//
// ペルソナ: 毎日打合せ書・記録を書く職長／保存済みを見返す安全担当。
// 対象:
//   /safety-diary/list 行内ボタン「開く（再編集）」「翌日用に複製」「削除」
//   /safety-diary クラシックUIのズーム（縮小/等倍/拡大）・印刷プレビュー/印刷 PDF/保存
//   /ky/paper?canvas=0 クラシックUIのズーム（縮小/等倍/拡大）
//   site-records各画面の「行を追加」系ボタン
//     qualifications「候補を追加」「＋ 自由入力で追加」
//     patrol「指摘を追加」
//     procedure「手順を追加」
//     committee「議題を追加」
//     induction「全て実施」「クリア」
// 注: 分散入力バー（協力会社に入力を依頼/取り込む）はこのdev環境がSupabase未設定で
//   isMeetingCloudEnabled()===falseのため実機描画不可（捏造回避のため対象外・コードレビューで44px確認済み）。
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
  check(`「${label instanceof RegExp ? label : label}」が44px以上${detail}`, !!box && box.height >= 44, `height=${box?.height}`);
};

const seed = async (page, entries) => {
  await page.addInitScript((kvs) => {
    for (const [k, v] of kvs) window.localStorage.setItem(k, v);
  }, entries.map(([k, v]) => [k, JSON.stringify(v)]));
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });

// ── /safety-diary/list（保存した打合せ書一覧・行内ボタン）─────────
{
  const page = await ctx.newPage();
  await seed(page, [
    ["safe-ai:meeting-list:v1", [{ id: "m-1", savedAt: "2026-06-01T00:00:00.000Z", workDate: "2026-06-01", siteName: "○○現場", author: "山田", contractorCount: 2 }]],
  ]);
  await page.goto(`${BASE}/safety-diary/list`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/safety-diary/list] 保存済み一覧の行内ボタン");
  await checkHeight(page, "開く（再編集）");
  await checkHeight(page, "翌日用に複製");
  await checkHeight(page, "削除");
  await page.close();
}

// ── /safety-diary（クラシックUI・ズーム＋印刷/保存）──────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/safety-diary`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/safety-diary] クラシックUIのズーム・下部操作バー");
  await checkHeight(page, "縮小");
  await checkHeight(page, "100%");
  await checkHeight(page, "拡大");
  await checkHeight(page, "印刷プレビュー");
  await checkHeight(page, "印刷 / PDF");
  await checkHeight(page, "保存");

  await page.getByRole("button", { name: "印刷プレビュー" }).first().click();
  await page.waitForTimeout(200);
  console.log("[/safety-diary] 印刷プレビューモーダル");
  await checkHeight(page, "閉じる");
  await page.close();
}

// ── /ky/paper?canvas=0（クラシックUI・ズーム）────────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ky/paper?canvas=0`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/ky/paper?canvas=0] クラシックUIのズーム");
  await checkHeight(page, "縮小");
  await checkHeight(page, "100%");
  await checkHeight(page, "拡大");
  await page.close();
}

// ── site-records「行を追加」系ボタン ─────────────────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/qualifications`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/qualifications] 資格追加ボタン");
  await checkHeight(page, "候補を追加");
  await checkHeight(page, "＋ 自由入力で追加");
  await page.close();
}
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/patrol`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/patrol] 指摘追加ボタン");
  await checkHeight(page, "指摘を追加");
  await page.close();
}
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/procedure`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/procedure] 手順追加ボタン");
  await checkHeight(page, "手順を追加");
  await page.close();
}
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/committee`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/committee] 議題追加ボタン");
  await checkHeight(page, "議題を追加");
  await page.close();
}
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/induction`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/induction] 全て実施・クリアボタン");
  await checkHeight(page, "全て実施");
  await checkHeight(page, "クリア");
  await page.close();
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
