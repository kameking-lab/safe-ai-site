// S1（打合せ用紙 直接操作UI・第八弾）無読チェック（/safety-diary?canvas=1 の用紙キャンバスβ）。
// 実行: cd web && (PORT=4218 npm run start &) ; node ../docs/third-party-reviews/scripts/meeting-canvas-phase8-history-suggest-2026-07-03.mjs
// 無読の問い: 従来UI（クラシック表示）にのみ存在した履歴サジェスト（datalist、過去の打合せ書からの入力候補）が、
//   キャンバス表示のタップ編集シートでも同じ候補源で機能するか（作業所名/作業所長/主任等/作成担当者・
//   業者名・使用機械・協力会社責任者）。クラシック表示側の既存挙動（同じdatalist）は不変か。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4218";
const BYID_KEY = "safe-ai:meeting-by-id:v1";

// 過去の打合せ書1件を模した生データ（collectMeetingHistory は BYID_KEY の生値をそのまま読むため
// normalizeMeetingRecord を経由しない最小限のフィールドで足りる）。
const HISTORY_RECORD = {
  id: "hist-1",
  siteName: "履歴現場スカイビル",
  author: "履歴作成担当者",
  siteManager: "履歴作業所長",
  supervisor: "履歴主任",
  contractors: [
    { companyName: "履歴建設工業", workContent: "履歴配管工事", responsibleName: "履歴協力会社責任者", machines: "履歴移動式クレーン" },
  ],
};

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

// まっさらな状態にしてから、過去の打合せ書1件を注入（履歴サジェストの候補源）。
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
await page.evaluate(
  ({ key, rec }) => {
    window.localStorage.clear();
    window.localStorage.setItem(key, JSON.stringify({ [rec.id]: rec }));
  },
  { key: BYID_KEY, rec: HISTORY_RECORD }
);

// (0) クラシック表示側の既存挙動は不変＝datalistに履歴候補が入っている。
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const classicSiteOptions = await page.locator("#mtg-sites option").evaluateAll((els) => els.map((el) => el.value));
check("クラシック表示: 作業所名のdatalistに履歴候補が入る（既存挙動は不変）", classicSiteOptions.includes("履歴現場スカイビル"));

// (1) キャンバス表示へ切替。
await page.getByRole("button", { name: /キャンバス.?β/ }).click();
await page.waitForTimeout(400);
check("キャンバス表示に切り替わる", await page.getByRole("button", { name: "従来表示" }).isVisible().catch(() => false));

// キャンバス表示のDOMにも同じ datalist（#mtg-sites 等）が存在する（historyDatalistsを両ブランチで共有）。
const canvasSiteOptions = await page.locator("#mtg-sites option").evaluateAll((els) => els.map((el) => el.value));
check("キャンバス表示にも同じdatalistが存在する（#mtg-sites）", canvasSiteOptions.includes("履歴現場スカイビル"));

const sheet = page.getByTestId("meeting-field-editor-sheet");

// (2) 「作業所名」エディタのinputが list="mtg-sites" を参照している（ブラウザネイティブ候補が効く）。
await page.getByRole("button", { name: "作業所名を入力" }).click();
check("『作業所名』エディタのinputがmtg-sitesを参照", (await sheet.locator("input").first().getAttribute("list")) === "mtg-sites");
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("『作業所長』エディタのinputがmtg-managersを参照", (await sheet.locator("input").first().getAttribute("list")) === "mtg-managers");
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("『主任等』エディタのinputがmtg-supervisorsを参照", (await sheet.locator("input").first().getAttribute("list")) === "mtg-supervisors");
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("『作成担当者』エディタのinputがmtg-authorsを参照", (await sheet.locator("input").first().getAttribute("list")) === "mtg-authors");
await sheet.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(200);

// (3) 各社マトリクス1行目「業者名・階層」エディタのinput（companyName）が list="mtg-companies" を参照。
await page.getByRole("button", { name: "業者名・階層を入力" }).click();
await page.waitForTimeout(150);
check(
  "『業者名・階層』エディタの会社名inputがmtg-companiesを参照",
  (await sheet.getByPlaceholder("業者名").getAttribute("list")) === "mtg-companies"
);

// 作業内容(textarea)を素通りして使用機械へ。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("『作業内容』エディタはtextarea（datalist対象外＝仕様どおり）", (await sheet.locator("textarea").count()) === 1);
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("『使用機械』エディタのinputがmtg-machinesを参照", (await sheet.locator("input").first().getAttribute("list")) === "mtg-machines");

// 必要資格→予定人員→予想災害→リスク→安全衛生指示事項 を素通りして協力会社責任者へ。
for (const label of ["必要資格", "予定人員", "予想災害", "リスク（重大性・可能性）", "安全衛生指示事項"]) {
  await sheet.getByRole("button", { name: /次の欄へ/ }).click();
  await page.waitForTimeout(150);
  check(`『${label}』のエディタを素通り`, await sheet.getByText(label).first().isVisible().catch(() => false));
}
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check(
  "『協力会社責任者』エディタのinputがmtg-responsiblesを参照",
  (await sheet.locator("input").first().getAttribute("list")) === "mtg-responsibles"
);
await sheet.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(200);

// (4) 印刷経路・クラシック表示は無変更（datalistの参照追加のみで入力内容・record構造には無関係）。
const printSheet = page.locator(".print\\:block");
check("印刷シート（非表示・print専用）は存在し崩れない", (await printSheet.count()) === 1);

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
