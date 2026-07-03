// O10（KY用紙Phase2・第四弾）無読チェック（/ky/paper?canvas=1 のzoom-to-cell＋AI提案のエディタ統合）。
// 実行: cd web && (PORT=4213 npm run start &) ; node ../docs/third-party-reviews/scripts/ky-canvas-phase2-zoom-ai-2026-07-03.mjs
// 無読の問い:
//   (a) 結論ピル「のこりN項目」をタップすると、最初の未記入セルへズームし、そのままエディタが開くか。
//       記入が進むほど「次の未記入セル」へ正しく追従するか。
//   (b) 危険のポイント欄のエディタ内で「🤖 AIに危険箇所を提案させる」が使え、提案の「反映」でその行に直接入るか
//       （従来UI＝クラシック表示は最初の空き行に入るのに対し、canvasは編集中の行そのものに入る点を検証）。
//   (c) 作業内容が空のままAI提案を押すと、従来UIになかった通知バーがcanvasβでも表示されるか（案内の欠落是正）。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4213";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当
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

// Gemini未設定環境でも決定的に検証できるよう、AI提案APIをモック。
await page.route("**/api/ky/suggest", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      source: "fallback",
      suggestions: [
        {
          hazard: "開口部からの墜落",
          reduction: "開口部を養生し親綱を設置",
          likelihood: 3,
          severity: 3,
          evaluation: 9,
          riskLabel: "高い",
          grounded: true,
        },
      ],
    }),
  });
});

// 直近の下書きを消してまっさらな状態から始める（前回実行分の残留を避ける）。
await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());

await page.goto(`${BASE}/ky/paper?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// (a-1) 未記入状態: 「のこりN項目」ピルが見え、タップで最初の未記入欄（現場名）のエディタが開く。
const remainingPill = page.getByRole("button", { name: /のこり\d+項目/ });
check("『のこりN項目』ピルがタップ標的として見える", await remainingPill.isVisible().catch(() => false));
await remainingPill.click();
const sheet = page.getByTestId("field-editor-sheet");
await sheet.waitFor({ state: "visible", timeout: 5000 });
check("タップで最初の未記入欄（現場名）のエディタがそのまま開く", await sheet.getByText("現場名").first().isVisible().catch(() => false));
await sheet.locator("input").first().fill("○○ビル新築工事");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

// (a-2) 記入が進んでも「のこりN項目」タップは常に次の未記入欄に追従する（工事名・工区が次）。
await remainingPill.click();
await sheet.waitFor({ state: "visible", timeout: 5000 });
check("記入後の再タップは次の未記入欄（工事名・工区）へ追従", await sheet.getByText("工事名・工区").first().isVisible().catch(() => false));
await page.keyboard.press("Escape");
await page.waitForTimeout(150);

// zoom-to-cellでズームインした状態が残るとPlaywrightの座標クリックが届かなくなるため、
// ここからはAI提案の検証に専念するため全体表示へ戻す（zoom-to-cell自体は上のa-1/a-2で検証済み）。
await page.getByRole("button", { name: "全体を表示" }).click();
await page.waitForTimeout(200);

// (b-1) 危険のポイント（1行目）を作業内容未記入のまま開き、AI提案を押すと通知バーで案内される
//       （従来UIでは見えていたが canvasβ では未提供だった通知の是正確認）。
const hazardCell = page.getByRole("button", { name: "危険のポイント（1）を入力" });
await hazardCell.click();
await sheet.waitFor({ state: "visible", timeout: 5000 });
const aiBtn = sheet.getByRole("button", { name: /AIに危険箇所を提案させる/ });
check("危険のポイントのエディタ内にAI提案ボタンがある（従来UIのみだった機能のcanvas統合）", await aiBtn.isVisible().catch(() => false));
await aiBtn.click();
await page.waitForTimeout(200);
check(
  "作業内容が空のままAI提案を押すと通知バーで案内される（canvasβで通知欠落だった穴を是正）",
  await page.getByText("先に「本日の作業内容」を入力してください").isVisible().catch(() => false)
);
await page.keyboard.press("Escape");
await page.waitForTimeout(150);

// (b-2) 作業内容を先に記入してから、危険のポイントのエディタでAI提案→反映→編集中の行に直接入る。
await page.getByRole("button", { name: "本日の作業内容を入力" }).click();
await sheet.waitFor({ state: "visible", timeout: 5000 });
await sheet.locator("textarea").fill("3F鉄骨建方 ボルト本締め");
await page.keyboard.press("Escape");
await page.waitForTimeout(150);

await hazardCell.click();
await sheet.waitFor({ state: "visible", timeout: 5000 });
await aiBtn.click();
await page.waitForTimeout(300);
check("AI提案の候補が表示される", await sheet.getByText("開口部からの墜落").isVisible().catch(() => false));
await sheet.getByRole("button", { name: "反映" }).click();
await page.waitForTimeout(200);
check(
  "『反映』で編集中の危険のポイント欄（textarea）に直接入る",
  (await sheet.locator("textarea").first().inputValue()) === "開口部からの墜落"
);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

check("反映した危険内容が用紙（画面キャンバス）に反映される", await page.getByText("開口部からの墜落").first().isVisible().catch(() => false));

// (c) 印刷経路（editing無し）は不変＝AI提案UIは印刷シートに一切出ない。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シートにAI提案ボタン・候補は出ない（editing無しでは装飾なし）",
  !printText.includes("AIに危険箇所を提案") && printText.includes("開口部からの墜落")
);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
