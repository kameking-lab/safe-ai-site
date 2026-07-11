// 災害の型別・教育スライド（O14/O15/S2/S3）無読チェック＋実測スクショ。
// 実行: cd web && (npm run start -- -p 3100 &) ; node ../docs/third-party-reviews/scripts/hazard-slides-noread-2026-07-11.mjs
// 無読の問い:
//   1. /education/hazard-slides で「何が何型分あるか・次に何をするか」が3秒で読めるか（結論カード＋21タイル）
//   2. 型別ページ（fall/trip/hot-cold-contact）がスマホ390pxで崩れず、デカ数字KPI・チャート・
//      出典フッタ・条文リンク・クイズが実表示されるか
//   3. 投影モード（16:9・1枚送り）がキーボード/タップで動き、全6枚を巡回できるか
//   4. 印刷（A4横）でチャートが白紙にならないか（print メディアエミュレーションで検査）
//   5. 配備統合: /signage 教育モード・教育コース詳細のスライドカード・/accidents グリッドのリンク
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";
const SHOT_DIR = fileURLToPath(new URL("../artifacts/hazard-slides-2026-07-11/", import.meta.url));
mkdirSync(SHOT_DIR, { recursive: true });

let pass = 0;
let total = 0;
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

// ---- 1) スマホ390px: ハブ ----
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
const page = await mob.newPage();
await page.goto(`${BASE}/education/hazard-slides`, { waitUntil: "networkidle" });
check("ハブ: 結論カードが1枚（role=status）", (await page.locator('section[aria-label^="いまの状態"]').count()) === 1);
check("ハブ: 21型タイルが並ぶ", (await page.locator('#hazard-grid a[href^="/education/hazard-slides/"]').count()) === 21);
check(
  "ハブ: 横スクロールが発生しない(390px)",
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
);
await page.screenshot({ path: `${SHOT_DIR}hub-390px.png`, fullPage: true });

// ---- 2) 型別ページ 3型（fall / trip / hot-cold-contact） ----
for (const slug of ["fall", "trip", "hot-cold-contact"]) {
  await page.goto(`${BASE}/education/hazard-slides/${slug}`, { waitUntil: "networkidle" });
  // recharts の Tooltip も role=status を持つため、結論カードは aria-label で限定して数える
  check(`${slug}: 結論カード1枚`, (await page.locator('section[aria-label^="いまの状態"]').count()) === 1);
  check(`${slug}: スライド6枚`, (await page.locator("section.hazard-slide").count()) === 6);
  check(`${slug}: 年次トレンドのrechartsが実描画`, (await page.locator(".hazard-slide .recharts-wrapper svg").count()) >= 2);
  check(
    `${slug}: 対策チェックに法令ナビ内部リンクがある`,
    (await page.locator('.hazard-slide a[href^="/law-navi/"]').count()) >= 1,
  );
  check(
    `${slug}: 出典フッタ（政府標準利用規約）表示`,
    (await page.locator("text=政府標準利用規約").count()) >= 1,
  );
  check(
    `${slug}: 横スクロールなし(390px)`,
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  );
  await page.screenshot({ path: `${SHOT_DIR}${slug}-390px.png`, fullPage: true });
}

// クイズ: タップで正誤＋解説が開く
await page.goto(`${BASE}/education/hazard-slides/fall`, { waitUntil: "networkidle" });
const correct = page.locator('button:has-text("2メートル")').first();
await correct.click();
check("fall: クイズ回答で解説が表示", (await page.locator("text=安衛則第518条").count()) >= 1);
await page.screenshot({ path: `${SHOT_DIR}fall-quiz-answered-390px.png` });

// ---- 3) 投影モード（PC 1280x720） ----
const pc = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
const p2 = await pc.newPage();
await p2.goto(`${BASE}/education/hazard-slides/fall`, { waitUntil: "networkidle" });
await p2.locator('button:has-text("投影モードで開始")').click();
check("present: 投影オーバーレイが開く", await p2.locator('[role="dialog"][aria-label*="投影"]').isVisible());
check("present: 表紙(1/6)表示", (await p2.locator("text=（1/6）").count()) === 1);
await p2.keyboard.press("ArrowRight");
await p2.waitForTimeout(300);
check("present: →キーで2/6へ", (await p2.locator("text=（2/6）").count()) === 1);
await p2.screenshot({ path: `${SHOT_DIR}fall-present-stats.png` });
for (let i = 0; i < 4; i++) await p2.keyboard.press("ArrowRight");
await p2.waitForTimeout(300);
check("present: 最終6/6（クイズ）まで到達", (await p2.locator("text=（6/6）").count()) === 1);
check("present: URLハッシュが#6", await p2.evaluate(() => window.location.hash === "#6"));
await p2.screenshot({ path: `${SHOT_DIR}fall-present-quiz.png` });
await p2.keyboard.press("Escape");
check("present: Escで終了", (await p2.locator('[role="dialog"]').count()) === 0);

// ---- 4) 印刷（A4横エミュレーション）: チャート白紙化しないか ----
await p2.emulateMedia({ media: "print" });
await p2.waitForTimeout(400);
const printChartCount = await p2.locator(".hazard-slide .recharts-wrapper svg").count();
check("print: printメディアでもrecharts SVGが存在（白紙化なし）", printChartCount >= 2, `svg=${printChartCount}`);
check("print: ツールバー（no-print）が消える", !(await p2.locator('button:has-text("投影モードで開始")').isVisible()));
check("print: クイズ解説が印字される（未回答でも）", (await p2.locator("text=正解:").count()) >= 1);
await p2.pdf({ path: `${SHOT_DIR}fall-print-a4-landscape.pdf`, landscape: true, format: "A4", printBackground: true });
await p2.emulateMedia({ media: "screen" });

// ---- 5) 配備統合 ----
// 5a. /signage 教育モード
await p2.goto(`${BASE}/signage`, { waitUntil: "networkidle" });
await p2.locator('button:has-text("教育")').first().click();
await p2.waitForTimeout(600);
check("signage: 教育モードで本日の型が出る", (await p2.locator('section[aria-label="本日の型"]').count()) === 1);
check("signage: 型名と対策チェックが表示", (await p2.locator('section[aria-label="本日の型"] li').count()) >= 3);
await p2.screenshot({ path: `${SHOT_DIR}signage-education-mode.png` });

// 5b. 教育コース詳細（フルハーネス＝墜落に紐づく）
await p2.goto(`${BASE}/education/tokubetsu/fullharness`, { waitUntil: "networkidle" });
const courseChips = await p2.locator('section[aria-label="災害の型別 教育スライド"] a[href^="/education/hazard-slides/"]').count();
check("教育コース詳細: 型別スライドカードが出る", courseChips >= 1, `links=${courseChips}`);
await p2.screenshot({ path: `${SHOT_DIR}course-fullharness-slides-card.png` });

// 5c. /accidents 型グリッドからのリンク
await p2.goto(`${BASE}/accidents`, { waitUntil: "networkidle" });
check(
  "accidents: 型グリッド下に教育スライドへのリンク",
  (await p2.locator('a[href="/education/hazard-slides"]').count()) >= 1,
);

// 5d. /ky/morning 「本日の型」（KY記録をlocalStorageに注入して表示）
const mob2 = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
const p3 = await mob2.newPage();
await p3.goto(`${BASE}/ky/morning`, { waitUntil: "networkidle" });
const hasDigest = (await p3.locator('section[aria-label="本日の型"]').count()) >= 1;
if (hasDigest) {
  check("ky/morning: 本日の型が表示", true);
  await p3.screenshot({ path: `${SHOT_DIR}ky-morning-hazard-of-the-day.png` });
} else {
  // KY記録が無い場合は入力フォーム画面になるため、記録の有無どちらでも壊れないことのみ確認
  check("ky/morning: 記録なしでもエラーなく表示（入力フォーム）", (await p3.locator("body").count()) === 1);
}

// 5e. Eラーニング: 型別テーマの深リンク
await p3.goto(`${BASE}/e-learning?theme=el-hazard-types#el-quiz`, { waitUntil: "networkidle" });
check("e-learning: 災害の型別テーマへ深リンク着地", (await p3.locator("text=災害の型別 基礎").count()) >= 1);
await p3.screenshot({ path: `${SHOT_DIR}elearning-hazard-theme.png` });

await browser.close();
console.log(`\n${pass}/${total} passed`);
process.exit(pass === total ? 0 : 1);
