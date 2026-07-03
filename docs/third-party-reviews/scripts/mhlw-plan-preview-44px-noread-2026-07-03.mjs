/**
 * 無読テスト: /law-search(MHLW公式PDFモード)の絞り込みチップ/ページネーション・
 * /strategy/plan-generator/preview の再編集リンクの44px化（2026-07-03）
 *
 * 背景: 柱0補充スウィープでの発見（BACKLOG-ux-tools.md 補充の指針）:
 *  - `mhlw-law-articles-panel.tsx` の法令名フィルタチップ（全法令/各法令名）が min-h未指定≒24px
 *  - 同ファイルの前へ/次へページネーションボタンが min-h未指定≒30px
 *  - `strategy/plan-generator/preview/[id]/page.tsx` の「← 事業者名・業種等を再編集」リンクが min-h未指定≒32px
 * 対策: いずれも min-h-[44px] を付与（寸法のみ、文言・機能・onClick/href不変）。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する安全担当。
 * 判定基準（無読テスト）: 絞り込みチップ・ページ送り・計画書再編集リンクが指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/mhlw-plan-preview-44px-noread-2026-07-03.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
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

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await context.newPage();

console.log("\n[/law-search?mode=mhlw] 法令名フィルタチップ・ページネーション 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/law-search?mode=mhlw`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
// クライアントコンポーネントのhydration待ち
await page.getByRole("button", { name: /^全法令/ }).waitFor({ state: "visible", timeout: 10000 });

{
  const chips = page.getByRole("button", { name: /^全法令|（\d/ });
  const count = await chips.count();
  check("法令名フィルタチップが1件以上検出", count > 0, `count=${count}`);
  const heights = await chips.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  check(
    "全法令名フィルタチップが44px以上",
    heights.length > 0 && heights.every((h) => h >= 44),
    `heights=${heights.join(",")}`,
  );
}

{
  const nextBtn = page.getByRole("button", { name: "次へ" });
  const count = await nextBtn.count();
  if (count > 0) {
    const box = await nextBtn.first().boundingBox();
    check("「次へ」ページネーションボタンが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
  } else {
    check("ページネーション（総ページ1件のみ=スキップ）", true, "count=0");
  }
}

console.log("\n[/strategy/plan-generator → preview] 再編集リンク 44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/strategy/plan-generator`, { waitUntil: "domcontentloaded" });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });
await page.getByRole("button", { name: "計画を生成してプレビュー" }).click();
await page.waitForURL(/\/strategy\/plan-generator\/preview\//, { timeout: 15000 });
await page.locator("main").first().waitFor({ state: "visible", timeout: 10000 });

{
  const link = page.getByRole("link", { name: /事業者名・業種等を再編集/ });
  const box = await link.first().boundingBox();
  check("再編集リンクが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
