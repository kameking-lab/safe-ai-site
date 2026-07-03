// 柱0磨き 巡回発見(Explore再監査)で見つかった残存44px未満の主要ボタン8箇所の是正・無読チェック。
// PR #744（承認バー/印刷プレビュー/転記CSV等の先行7箇所）とは非重複の別発見分。
// 実行: cd web && npm run build && PORT=3100 npm run start
//   BASE_URL=http://localhost:3100 node ../docs/third-party-reviews/scripts/remaining-primary-buttons-44px-round2-2026-07-03.mjs
//
// ペルソナ: スマホでKY用紙を書く職長、作業員マスターを整理する事務、教育教材を探す安全担当。
// 対象:
//   /ky/paper?canvas=0（クラシックUI）の「自動取得」（天気）・「🤖 AIに危険箇所を提案させる」
//   /ky/paper?canvas=0 の転記支援シート「危険と対策の表をコピー（Excel貼り付け用）」
//   /ky/list の「開く（再編集）」「今日用に複製」「削除」（保存済みKY1件をlocalStorageで再現）
//   /ky/workers の「退職（非表示）」「削除」（作業員1名をlocalStorageで再現）
//   /education の「PPTXサンプル」ダウンロードリンク（先頭カード）
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE_URL ?? process.env.BASE ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };

const WORKERS_KEY = "safe-ai:ky-workers:v1";
const KY_LIST_KEY = "safe-ai:ky-record-list:v1";

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

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });

// ── /ky/paper?canvas=0 クラシックUI ─────────────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ky/paper?canvas=0`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/ky/paper?canvas=0] クラシックUI 主要ボタン");
  await checkHeight(page, "自動取得");
  await checkHeight(page, "🤖 AIに危険箇所を提案させる");

  await page.getByRole("button", { name: "その他の操作（複製・共有・転記・印刷）" }).click();
  await page.waitForTimeout(200);
  await page.getByRole("menuitem", { name: /転記/ }).click();
  await page.waitForTimeout(300);
  await checkHeight(page, "危険と対策の表をコピー（Excel貼り付け用）");
  await page.close();
}

// ── /ky/list 1件（保存済みKY） ───────────────────────────────
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
  const page = await ctx.newPage();
  await page.addInitScript((s) => window.localStorage.setItem(s.key, s.val), { key: KY_LIST_KEY, val: JSON.stringify(summary) });
  await page.goto(`${BASE}/ky/list`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/ky/list] 1件行の操作ボタン");
  await checkHeight(page, "開く（再編集）");
  await checkHeight(page, "今日用に複製");
  await checkHeight(page, "削除");
  await page.close();
}

// ── /ky/workers 1名（作業員マスター） ─────────────────────────
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
  const page = await ctx.newPage();
  await page.addInitScript((s) => window.localStorage.setItem(s.key, s.val), { key: WORKERS_KEY, val: JSON.stringify(workers) });
  await page.goto(`${BASE}/ky/workers`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/ky/workers] 1名行の操作ボタン");
  await checkHeight(page, "退職（非表示）");
  await checkHeight(page, "削除");
  await page.close();
}

// ── /education PPTXサンプル（先頭カード） ─────────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/education`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/education] PPTXサンプルダウンロードリンク");
  const link = page.getByRole("link", { name: /PPTXサンプル/ }).first();
  const box = await link.boundingBox();
  check("先頭カードの「PPTXサンプル」が44px以上", !!box && box.height >= 44, `height=${box?.height}`);
  await page.close();
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
