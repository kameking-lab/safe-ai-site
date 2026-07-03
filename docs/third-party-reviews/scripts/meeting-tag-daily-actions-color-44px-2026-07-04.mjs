// 柱0磨き 巡回発見（2026-07-04・自班Explore巡回）。過去巡回(#792/#799)は下部操作バー・行内リスト
// ボタン・トグル・通知バー閉じるボタン中心だったが、「タグチップ内の削除×」「今月の予定チップ」
// 「注意/警告色の場当たり流用」の3系統は対象外のまま残っていた。是正4件を検証:
//  (1) meeting-tag-field.tsx: 各社マトリクスの必要資格/予想災害タグの削除×ボタンが44px未満だった
//      (min-h-[44px] min-w-[44px]を追加。field-editor-sheetの閉じるボタンと同じ確立済みの型)。
//  (2) daily-actions-panel.tsx: 「今月の予定」チップ・「カレンダーで全予定→」リンクが44px未満だった。
//  (3) scheduler-form.tsx: 必須マーカー「*」が safety-tone のdangerトークンを経由せず`text-red-600`
//      直書きだった（SAFETY_TONE.danger.textへ是正）。
//  (4) health-checkup-scheduler/page.tsx: 状態を持たない「関連ツール」案内が warning色(amber)を
//      場当たり流用していた（他ページと同型のslate中立色へ是正）。
// 実行: cd web && npm run build && PORT=4230 npm run start &
//   BASE=http://localhost:4230 node ../docs/third-party-reviews/scripts/meeting-tag-daily-actions-color-44px-2026-07-04.mjs
//
// 注: distributed-input-bar.tsx（分散入力バーの初見ガイド閉じる×・「分散入力の使い方」トグル）も
// 同時に44px是正したが、isMeetingCloudEnabled()===false（このdev環境はSupabase未設定）のため
// 実機描画不可＝過去の同型タスク(#799続き⑤・contribute/account柱0補充)と同じ既知の制約で
// Playwright対象外・コードレビューで44pxクラス付与を確認済み。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || process.env.BASE_URL || "http://localhost:4230";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
const page = await ctx.newPage();

let pass = 0;
let total = 0;
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

// (1) meeting-tag-field.tsx: タグ削除×ボタンの44px化
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());
await page.goto(`${BASE}/safety-diary?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);

const sheet = page.getByTestId("meeting-field-editor-sheet");
const qualCell = page.getByRole("button", { name: "必要資格を入力" });
await qualCell.click();
await page.waitForTimeout(150);
const qualInput = sheet.getByLabel("追加");
await qualInput.fill("玉掛け技能講習");
await qualInput.press("Enter");
await page.waitForTimeout(150);
const delBtn = sheet.getByRole("button", { name: "削除" }).first();
check("必要資格タグの削除×ボタンが可視", await delBtn.isVisible().catch(() => false));
const delBox = await delBtn.boundingBox();
check("タグ削除×ボタンが44px以上(高さ)", !!delBox && delBox.height >= 44, `height=${delBox?.height}`);
check("タグ削除×ボタンが44px以上(幅)", !!delBox && delBox.width >= 44, `width=${delBox?.width}`);
await sheet.getByRole("button", { name: "閉じる" }).click();

// (2) daily-actions-panel.tsx: 今月の予定チップ・全予定リンクの44px化
// RecordsOverviewは記録が1件も無い初見時はFirstVisitGuideに切替りDailyActionsPanelが出ないため、
// パトロール記録を1件だけ最小seedしてhasAny=trueにする（表示ロジックの実際の分岐に合わせた準備）。
await page.goto(`${BASE}/site-records`, { waitUntil: "networkidle" });
await page.evaluate(() => {
  window.localStorage.setItem("safe-ai:patrol-list:v1", JSON.stringify([
    { id: "seed1", date: "2026-01-01", inspector: "テスト", area: "A棟", ngCount: 0, findingCount: 0, openCount: 0, savedAt: "2026-01-01T00:00:00.000Z" },
  ]));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(300);
const monthChip = page.getByText("全国安全週間", { exact: false }).first();
check("『今月の予定』チップ（全国安全週間）が可視", await monthChip.isVisible().catch(() => false));
const chipLink = page.locator("a", { hasText: "全国安全週間" }).first();
const chipBox = await chipLink.boundingBox();
check("『今月の予定』チップが44px以上", !!chipBox && chipBox.height >= 44, `height=${chipBox?.height}`);
const calLink = page.getByRole("link", { name: /カレンダーで全予定/ });
const calBox = await calLink.boundingBox();
check("『カレンダーで全予定→』リンクが44px以上", !!calBox && calBox.height >= 44, `height=${calBox?.height}`);

// (3) scheduler-form.tsx: 必須マーカーの色文法(rose系)
await page.goto(`${BASE}/health-checkup-scheduler`, { waitUntil: "networkidle" });
const asteriskClass = await page
  .locator("label", { hasText: "業種" })
  .locator("span")
  .filter({ hasText: /^\*$/ })
  .first()
  .getAttribute("class");
check("業種欄の必須マーカーがsafety-toneのdanger(rose系)経由", !!asteriskClass && asteriskClass.includes("rose") && !asteriskClass.includes("red-"), `class=${asteriskClass}`);

// (4) health-checkup-scheduler/page.tsx: 「関連ツール」案内の中立色(slate)化
const toolsSection = page.locator("section", { hasText: "関連ツール" }).first();
const sectionClass = await toolsSection.getAttribute("class");
check("『関連ツール』案内がwarning色(amber)を場当たり流用していない", !!sectionClass && !sectionClass.includes("amber"), `class=${sectionClass}`);
check("『関連ツール』案内が中立色(slate)に統一", !!sectionClass && sectionClass.includes("slate"), `class=${sectionClass}`);

console.log(`\n${pass}/${total} passed`);
await browser.close();
process.exit(pass === total ? 0 : 1);
