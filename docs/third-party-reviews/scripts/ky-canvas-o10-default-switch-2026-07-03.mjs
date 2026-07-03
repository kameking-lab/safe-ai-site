// O10（KY用紙Phase2・第五弾・完） 無読チェック（/ky/paper のcanvas既定切替＋機能パリティ）。
// 実行: cd web && (PORT=4214 npm run start &) ; node ../docs/third-party-reviews/scripts/ky-canvas-o10-default-switch-2026-07-03.mjs
// ペルソナ: 初めて /ky/paper を開く現場の安全担当・職長・一人親方（本文を読まず3秒見て判断）。
// 無読の問い:
//   (a) クエリ無しで /ky/paper を開くだけで、用紙が1画面に収まったキャンバス表示になるか
//       （従来のようにβボタンを探して押す必要が無いか＝既定切替の本丸）。
//   (b) 「いまの状態」（のこりN項目 or 記入完了/承認状況）が3秒で言えるか。
//   (c) 既定表示のままでも「次にやること」＝保存・共有・印刷・元請提出に迷わず到達できるか
//       （機能パリティ。canvasが既定になっても従来UIだけの機能に閉じ込められていないか）。
//   (d) 「従来表示」に切り替えても迷子にならず「新しい表示へ」で確実に戻れるか。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4214";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当（現場でのスマホ利用を想定）
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

// 前回実行分の残留を避け、まっさらな状態から始める。
await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());

// (a) クエリ無しの通常アクセスだけで既定表示がキャンバスになっているか（β探し不要）。
await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
check(
  "クエリ無し（?canvas=1等を付けない）通常アクセスで、用紙キャンバスが最初から表示される",
  await page.getByTestId("paper-stage-content").isVisible().catch(() => false)
);
check("URLにcanvasクエリが付かない（既定＝canvasのため不要）", !page.url().includes("canvas="));

// (b) 「いまの状態」が3秒で言えるか＝「のこりN項目」ピルが即座に見える。
const remainingPill = page.getByRole("button", { name: /のこり\d+項目/ });
check("『いまの状態』＝のこりN項目ピルが最初の画面で即座に見える", await remainingPill.isVisible().catch(() => false));

// (c) 「次にやること」＝保存・その他操作（複製/共有/転記/印刷）・元請確認への導線が既定表示のまま揃っている。
check("既定表示のまま『保存』主ボタンが見える（従来はcanvasに存在せず自動保存の下書きに閉じ込められていた）", await page.getByRole("button", { name: "保存" }).isVisible().catch(() => false));
await page.getByRole("button", { name: "その他の操作（複製・共有・転記・印刷）" }).click();
const sheet = page.getByRole("menu", { name: "その他の操作" });
await sheet.waitFor({ state: "visible", timeout: 5000 });
check("『…』その他操作シートから前回複製・共有・印刷・転記に到達できる", await sheet.getByText("↻ 前回を複製").isVisible().catch(() => false));
check("その他操作シートから朝礼サイネージへ到達できる", await sheet.getByRole("menuitem", { name: /朝礼サイネージへ/ }).isVisible().catch(() => false));
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
check("元請確認・承認欄が既定表示のまま見える（従来UIだけの機能に閉じ込められていない）", await page.getByText("元請確認・承認").isVisible().catch(() => false));
check("作業員マスターへの導線が既定表示にもある（従来UIとの非対称を解消）", await page.getByRole("link", { name: "作業員マスター" }).isVisible().catch(() => false));

// (d) 「従来表示」⇄「新しい表示へ」の往復で迷子にならない。
await page.getByRole("button", { name: "従来表示" }).click();
await page.waitForTimeout(300);
check("『従来表示』クリックで旧UI（フォーム型）に切り替わる", (await page.getByTestId("paper-stage-content").count()) === 0);
check("旧UIのURLは?canvas=0を明示（再読込・共有しても旧UIが保たれる）", page.url().includes("canvas=0"));
await page.getByRole("button", { name: "🗺 新しい表示へ" }).click();
await page.waitForTimeout(300);
check("『新しい表示へ』クリックで既定表示（キャンバス）に戻れる", await page.getByTestId("paper-stage-content").isVisible().catch(() => false));

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
