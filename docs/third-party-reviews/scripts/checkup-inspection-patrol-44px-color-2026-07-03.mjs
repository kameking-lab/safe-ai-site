// 柱0磨き 巡回発見＝Explore再監査で発見した残存44px未満12箇所＋色の文法違反(red直書き→rose統一)2箇所を是正・無読チェック。
// 対象:
//   inspection-client.tsx / patrol-client.tsx の点検結果トグル(良/不良/対象外)
//   committee/patrol/procedure/qualifications の行内ゴミ箱削除ボタン
//   induction-client.tsx「絞り込み解除」
//   health-checkup-scheduler/scheduler-form.tsx 全ボタン(職種/物質/条件トグル・リセット・送信)
//   health-checkup missing-checkup-tracker.tsx「入力した実施日をすべて消去」＋期限超過の色をrose統一
//   account/manage-plan-button.tsx「プラン管理」＋エラー閉じるボタン＋エラー色をrose統一
//   ky/workers-master-client.tsx「＋ 追加」
//   ky-paper-view.tsx「のこりN項目」(旧min-h-[28px])＋通知バー「×」
//   meeting-paper-view.tsx / ky-list-client.tsx 通知バー「×」
// 実行: cd web && npm run build && PORT=3100 npm run start
//   BASE_URL=http://localhost:3100 node ../docs/third-party-reviews/scripts/checkup-inspection-patrol-44px-color-2026-07-03.mjs
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

const checkHeight = async (locator, name) => {
  const box = await locator.boundingBox();
  check(`${name}が44px以上`, !!box && box.height >= 44, `height=${box?.height}`);
};

const seed = async (page, entries) => {
  await page.addInitScript((kvs) => {
    for (const [k, v] of kvs) window.localStorage.setItem(k, v);
  }, entries.map(([k, v]) => [k, JSON.stringify(v)]));
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });

// ── inspection: 点検結果トグル(良/不良/対象外) ─────────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/inspection`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/inspection] 点検結果トグル");
  const row = page.getByText("ブレーキ・クラッチの機能").first();
  await row.waitFor({ state: "visible" });
  const li = page.locator("li", { has: row }).first();
  await checkHeight(li.getByRole("button", { name: "良" }).first(), "「良」トグル");
  await checkHeight(li.getByRole("button", { name: "不良" }).first(), "「不良」トグル");
  await page.close();
}

// ── patrol: 巡視チェックトグル ────────────────────────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/patrol`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records/patrol] 巡視チェックトグル・指摘追加・削除");
  const row = page.getByText("墜落・転落防止", { exact: false }).first();
  await row.waitFor({ state: "visible" });
  const li = page.locator("li", { has: row }).first();
  await checkHeight(li.getByRole("button", { name: "良" }).first(), "「良」トグル");
  await page.getByRole("button", { name: "指摘を追加" }).click();
  await page.waitForTimeout(200);
  await checkHeight(page.getByRole("button", { name: /指摘1を削除/ }), "「指摘を削除」");
  await page.close();
}

// ── committee/procedure/qualifications: 行内削除ボタン ──────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/committee`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.locator("#committee-actions").scrollIntoViewIfNeeded().catch(() => {});
  const addBtn = page.getByRole("button", { name: "議題を追加" });
  if (await addBtn.count()) {
    await addBtn.first().click();
    await page.waitForTimeout(200);
    console.log("\n[/site-records/committee] 議題の削除ボタン");
    await checkHeight(page.getByRole("button", { name: /議題1を削除/ }), "「議題を削除」");
  }
  await page.close();
}
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/procedure`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const addBtn = page.getByRole("button", { name: "手順を追加" });
  if (await addBtn.count()) {
    await addBtn.first().click();
    await page.waitForTimeout(200);
    console.log("\n[/site-records/procedure] 手順の削除ボタン");
    await checkHeight(page.getByRole("button", { name: /手順1を削除/ }), "「手順を削除」");
  }
  await page.close();
}
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records/qualifications`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const addBtn = page.getByRole("button", { name: "＋ 自由入力で追加" });
  if (await addBtn.count()) {
    await addBtn.first().click();
    await page.waitForTimeout(200);
    console.log("\n[/site-records/qualifications] 保有資格の削除ボタン");
    await checkHeight(page.getByRole("button", { name: "削除" }).first(), "「削除」");
  }
  await page.close();
}

// ── induction: 絞り込み解除 ────────────────────────────────────────
{
  const page = await ctx.newPage();
  await seed(page, [
    ["safe-ai:induction-list:v1", [{ id: "d-1", date: "2026-06-01", siteName: "○○現場", workerName: "山田", company: "亀組", doneCount: 8, total: 8, savedAt: "2026-06-01T00:00:00.000Z" }]],
  ]);
  await page.goto(`${BASE}/site-records/induction`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const siteSelect = page.locator("select").first();
  if (await siteSelect.count()) {
    await siteSelect.selectOption({ index: 1 }).catch(() => {});
    await page.waitForTimeout(200);
    const clearBtn = page.getByRole("button", { name: "絞り込み解除" });
    if (await clearBtn.count()) {
      console.log("\n[/site-records/induction] 絞り込み解除ボタン");
      await checkHeight(clearBtn, "「絞り込み解除」");
    }
  }
  await page.close();
}

// ── health-checkup-scheduler: 判定フォーム全ボタン ──────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/health-checkup-scheduler`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/health-checkup-scheduler] 判定フォームのボタン群");
  const jobBtn = page.locator("form button[type=button]").first();
  await jobBtn.waitFor({ state: "visible" });
  await checkHeight(jobBtn, "職種トグル(1件目)");
  await checkHeight(page.getByRole("button", { name: "選択をリセット" }), "「選択をリセット」");
  await checkHeight(page.getByRole("button", { name: "必要な健診を判定する" }), "「必要な健診を判定する」");
  await page.close();
}

// ── health-checkup-scheduler/result: 前回実施日トラッカー ───────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/health-checkup-scheduler/result?industry=construction&hire=2020-01-01`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const clearBtn = page.getByRole("button", { name: "入力した実施日をすべて消去" });
  if (await clearBtn.count()) {
    console.log("\n[/health-checkup-scheduler/result] 実施日クリアボタン＋色文法");
    await checkHeight(clearBtn, "「入力した実施日をすべて消去」");
  }
  const overdueChip = page.getByText(/期限超過 \d+ 件/).first();
  if (await overdueChip.count()) {
    const cls = await overdueChip.getAttribute("class");
    check("期限超過チップがrose系(red直書きでない)", !!cls && cls.includes("rose") && !cls.includes("red-"), cls ?? "");
  }
  await page.close();
}

// ── account: プラン管理ボタン ────────────────────────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const btn = page.getByRole("button", { name: /プラン管理|Stripeへ移動中/ });
  if (await btn.count()) {
    console.log("\n[/account] プラン管理ボタン");
    await checkHeight(btn.first(), "「プラン管理」");
  } else {
    console.log("\n[/account] 未ログインのためプラン管理ボタン非表示(想定内・スキップ)");
  }
  await page.close();
}

// ── ky/workers: ＋追加ボタン ─────────────────────────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ky/workers`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/ky/workers] ＋追加ボタン");
  await checkHeight(page.getByRole("button", { name: "＋ 追加" }), "「＋ 追加」");
  await page.close();
}

// ── ky/paper(canvas既定): のこりN項目ボタン ─────────────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ky/paper`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const remainBtn = page.getByRole("button", { name: /のこり\d+項目/ });
  if (await remainBtn.count()) {
    console.log("\n[/ky/paper] のこりN項目ボタン(旧min-h-[28px])");
    await checkHeight(remainBtn.first(), "「のこりN項目 →」");
  }
  await page.close();
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
