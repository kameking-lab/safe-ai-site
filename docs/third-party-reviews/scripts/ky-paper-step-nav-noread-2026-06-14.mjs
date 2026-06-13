// 柱C-9・A2 KY記入の進行ナビ 無読チェック（/ky/paper 基本情報→危険→対策→確認）。
// 実行: cd web && (PORT=3100 npm run start &) ; node ../docs/third-party-reviews/scripts/ky-paper-step-nav-noread-2026-06-14.mjs
// 無読の問い: 画面を3秒見て、職長が「いま記入の何段目か・あと何段か・次にどこを書くか」を言えるか。
// 確認点: (1)用紙の上に進行ナビが見える (2)4段=基本情報/危険/対策/確認 が順に並ぶ
//   (3)初期(空)は 0/4段完了・基本情報が「いまここ」 (4)各段は44px以上のタップ標的でその欄へジャンプ
//   (5)作業内容を書くと基本情報が「記入済み」になり「いまここ」が危険へ進む＝進捗が読める
//   (6)結論カードの「記入のこりN」と各段ののこり合計が一致（整合保証） (7)用紙ファースト不変＝完成用紙が下に見える。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当（モバイルで進行が読めるか）
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

await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

const nav = page.getByRole("navigation", { name: "KY記入の進行" });

// (1) 用紙の上に進行ナビが見えている。
check("進行ナビ（KY記入の進行）が見えている", await nav.isVisible().catch(() => false));

// (2) 4段=基本情報→危険→対策→確認 が順に並ぶ。
const labels = await nav.locator("ol > li a > span:nth-of-type(2)").allInnerTexts().catch(() => []);
check("4段が 基本情報→危険→対策→確認 の順", JSON.stringify(labels) === JSON.stringify(["基本情報", "危険", "対策", "確認"]), labels.join("/"));

// (3) 初期(空)は 0/4段完了・基本情報が「いまここ」(aria-current=step)。
const summary = await nav.getByText(/段 完了/).innerText().catch(() => "");
check("『0/4 段 完了』が読める", /0\s*\/\s*4/.test(summary.replace(/\s+/g, "")), summary.trim());
const currentLabel = await nav.locator('a[aria-current="step"] span:nth-of-type(2)').innerText().catch(() => "");
check("初期の『いまここ』は基本情報", currentLabel.trim() === "基本情報", currentLabel.trim());

// (4) 各段は44px以上のタップ標的（リンク）でその欄へジャンプする。
const firstStep = nav.locator("ol > li a").first();
const box = await firstStep.boundingBox();
check("各段のタップ標的は44px以上", !!box && box.height >= 44, box ? `${Math.round(box.height)}px` : "なし");
await firstStep.click();
await page.waitForTimeout(200);
check("基本情報の段をタップすると #ky-work へ移動", page.url().endsWith("#ky-work"), page.url().split("/").pop());

// (5) 作業内容を書くと基本情報が「記入済み」になり「いまここ」が危険へ進む。
const workArea = page.locator("#ky-work textarea").first();
await workArea.fill("3F鉄骨建方 ボルト本締め");
await workArea.blur();
await page.waitForTimeout(300);
const basicState = await nav.locator("ol > li").first().innerText().catch(() => "");
check("記入後、基本情報段が『記入済み』になる", /記入済み/.test(basicState), basicState.replace(/\n/g, " "));
const currentAfter = await nav.locator('a[aria-current="step"] span:nth-of-type(2)').innerText().catch(() => "");
check("記入後、『いまここ』が危険へ進む", currentAfter.trim() === "危険", currentAfter.trim());

// (6) 結論カードの「記入のこりN」と各段ののこり合計が一致（整合保証）。
const cardText = await page.locator('section[aria-label^="いまの状態"]').first().innerText().catch(() => "");
const cardNum = Number((cardText.match(/(\d+)\s*項目/) || [])[1] ?? NaN);
const remainingTexts = await nav.getByText(/のこり\d+/).allInnerTexts().catch(() => []);
const stepSum = remainingTexts.reduce((n, t) => n + (Number((t.match(/\d+/) || [0])[0]) || 0), 0);
check("結論カードの『記入のこりN』と各段ののこり合計が一致", cardNum === stepSum, `card=${cardNum} steps計=${stepSum}`);

// (7) 用紙ファースト不変＝完成用紙（KY表題）が下にそのまま見える。
const paperVisible = await page.getByRole("heading", { name: /危険予知活動表/ }).isVisible().catch(() => false);
check("用紙ファースト不変＝完成KY用紙が見えている", paperVisible);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
