// S1（打合せ用紙 直接操作UI・第九弾）無読チェック＝キャンバス既定化（β外し）＋機能パリティ。
// 実行: cd web && (npm run start -- -p 3100 &) ; node ../docs/third-party-reviews/scripts/meeting-canvas-phase9-default-parity-2026-07-11.mjs
// 無読の問い:
//   1. /safety-diary を開くと（パラメータ無しで）用紙キャンバスが既定表示になるか。スマホ390pxで全貌が1画面に収まるか
//   2. 既定表示から 保存（主ボタン）・「…」その他操作（前回複製/保存一覧/点検AI/印刷プレビュー/印刷）に到達できるか
//   3. 会社名エディタから行操作（＋下位の会社を追加・この行を削除・KYを作成）ができるか
//   4. ?canvas=0 で従来表示（フォールバック）へ・「🗺 新しい表示へ」で復帰できるか
//   5. 全貌→ズーム→タップ入力→保存→印刷プレビュー の一連が390pxで通るか（A4正式書式は不変）
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";
const SHOT_DIR = fileURLToPath(new URL("../artifacts/meeting-canvas-phase9-2026-07-11/", import.meta.url));
mkdirSync(SHOT_DIR, { recursive: true });

let pass = 0;
let total = 0;
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem("anzen-onboarding-v1-seen", "1");
  localStorage.removeItem("meeting-record");
  localStorage.removeItem("meeting-list");
});

// (1) 既定＝キャンバス・全貌1画面
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
const stage = page.getByTestId("paper-stage-content");
check("パラメータ無しでキャンバスが既定表示", await stage.isVisible().catch(() => false));
const box = await stage.boundingBox();
const vp = page.viewportSize();
check(
  "390pxで用紙全貌が1画面に収まる",
  !!box && box.x >= -1 && box.y >= -1 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1,
  box ? `bbox=${Math.round(box.width)}x${Math.round(box.height)}` : "no box",
);
await page.screenshot({ path: `${SHOT_DIR}default-canvas-390px.png` });

// (2) タップ入力（作業所名）→用紙反映
await page.getByRole("button", { name: "作業所名を入力" }).click();
const sheet = page.getByTestId("meeting-field-editor-sheet");
check("セルタップでエディタが開く", await sheet.isVisible().catch(() => false));
await sheet.locator("input").first().fill("第九弾テスト現場");
await sheet.getByRole("button", { name: "閉じる" }).first().click();
await page.waitForTimeout(300);
check("入力が用紙に反映", (await stage.textContent())?.includes("第九弾テスト現場") ?? false);

// (3) 会社名エディタの行操作
await page.getByRole("button", { name: /業者名.*を入力|会社名を入力|業者を入力/ }).first().click().catch(() => {});
let companySheetVisible = await sheet.isVisible().catch(() => false);
if (!companySheetVisible) {
  // 行が無い場合は行追加ホットスポットから（そのまま会社名エディタが開く）
  await page.getByRole("button", { name: /＋元請/ }).first().click();
  companySheetVisible = await sheet.isVisible().catch(() => false);
}
check("会社名エディタが開く", companySheetVisible);
check("エディタに『＋下位の会社を追加』", await sheet.getByRole("button", { name: "＋下位の会社を追加" }).isVisible().catch(() => false));
check("エディタに『KYを作成』", await sheet.getByRole("link", { name: "KYを作成" }).isVisible().catch(() => false));
check("エディタに『この行を削除』", await sheet.getByRole("button", { name: "この行を削除" }).isVisible().catch(() => false));
await sheet.locator("input").first().fill("○○建設");
await sheet.getByRole("button", { name: "＋下位の会社を追加" }).click();
await page.waitForTimeout(300);
check("＋下位で新しい行の会社名エディタがそのまま開く", await sheet.isVisible().catch(() => false));
await sheet.getByRole("button", { name: "この行を削除" }).click();
await page.waitForTimeout(300);
check("『この行を削除』でエディタが閉じる", !(await sheet.isVisible().catch(() => false)));

// (4) 保存（主ボタン）→保存済み表示
await page.getByRole("button", { name: "保存", exact: true }).click();
await page.waitForTimeout(500);
check("保存で『保存一覧に保存済み』表示", (await page.textContent("body"))?.includes("保存一覧に保存済み") ?? false);

// (5) 「…」その他操作シート
await page.getByRole("button", { name: "その他の操作（複製・印刷・点検項目AI）" }).click();
check("シートに『前回を複製』", await page.getByRole("menuitem", { name: /前回を複製/ }).isVisible().catch(() => false));
check("シートに『保存一覧を開く』", await page.getByRole("menuitem", { name: /保存一覧を開く/ }).isVisible().catch(() => false));
check("シートに『AIで該当項目を推論』", await page.getByRole("menuitem", { name: /AIで該当項目を推論/ }).isVisible().catch(() => false));
check("シートに『公式版の点検項目に戻す』", await page.getByRole("menuitem", { name: /公式版の点検項目に戻す/ }).isVisible().catch(() => false));
check("シートに『印刷 / PDF』", await page.getByRole("menuitem", { name: /印刷 \/ PDF/ }).isVisible().catch(() => false));
await page.screenshot({ path: `${SHOT_DIR}actions-sheet-390px.png` });

// (6) 印刷プレビュー（A4横の正式書式が出る）
await page.getByRole("menuitem", { name: /印刷プレビュー/ }).click();
await page.waitForTimeout(400);
check("印刷プレビューが開く", (await page.getByText("印刷プレビュー（A4横・打合せ書）").isVisible().catch(() => false)));
check("プレビュー内に保存した現場名（正式書式に反映）", (await page.textContent("body"))?.includes("第九弾テスト現場") ?? false);
await page.screenshot({ path: `${SHOT_DIR}print-preview-390px.png` });
await page.getByRole("button", { name: "閉じる" }).last().click();

// (7) ?canvas=0 従来表示フォールバック＋復帰
await page.getByRole("button", { name: "従来表示" }).click();
await page.waitForTimeout(400);
check("従来表示へ切替（URLに canvas=0）", page.url().includes("canvas=0"));
check("従来表示に同じ入力内容（record共有）", (await page.locator('input[list="mtg-sites"]').inputValue().catch(() => "")) === "第九弾テスト現場");
check("従来表示に『🗺 新しい表示へ』入口", await page.getByRole("button", { name: /新しい表示へ/ }).isVisible().catch(() => false));
await page.getByRole("button", { name: /新しい表示へ/ }).click();
await page.waitForTimeout(400);
check("復帰でキャンバス表示（URLから canvas=0 が消える）", !page.url().includes("canvas=0"));

// (8) KY用紙（参考回帰）: 既定キャンバス＋保存主ボタン（O10第五弾の維持確認）
await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
check("KY用紙も既定キャンバス（paper-stage）", await page.getByTestId("paper-stage-content").isVisible().catch(() => false));
check("KY用紙に保存主ボタン", await page.getByRole("button", { name: "保存", exact: true }).isVisible().catch(() => false));
await page.screenshot({ path: `${SHOT_DIR}ky-paper-default-390px.png` });

await browser.close();
console.log(`\n${pass}/${total} passed`);
process.exit(pass === total ? 0 : 1);
