// O10（KY用紙Phase2・第三弾）無読チェック（/ky/paper?canvas=1 の参加者＝作業員マスターのチップ選択）。
// 実行: cd web && (PORT=4213 npm run start &) ; node ../docs/third-party-reviews/scripts/ky-canvas-phase2-participants-2026-07-03.mjs
// 無読の問い: 用紙キャンバス上で「参加者」欄をタップすると作業員マスターのチップが開き、
//   タップで参加者を選択/解除でき、選んだ結果が用紙（印刷と同一WYSIWYG）にそのまま反映されるか。
//   記入順チェーン（指差呼称の次は参加者）が壊れていないか。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:4213";
const WORKERS_KEY = "safe-ai:ky-workers:v1";

const WORKERS = [
  { id: "w-1", name: "山田 太郎", affiliation: "self", company: "", qualNo: "1", isRegular: true, hidden: false, createdAt: 1700000000000 },
  { id: "w-2", name: "佐藤 次郎", affiliation: "self", company: "", qualNo: "", isRegular: true, hidden: false, createdAt: 1700000001000 },
  { id: "w-3", name: "鈴木 三郎", affiliation: "coop1", company: "○○組", qualNo: "10", isRegular: false, hidden: false, createdAt: 1700000002000 },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12 相当
  serviceWorkers: "block",
});
const page = await ctx.newPage();
await page.addInitScript((workers) => {
  window.localStorage.setItem("safe-ai:ky-workers:v1", JSON.stringify(workers));
}, WORKERS);

let pass = 0;
let total = 0;
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

// 直近の下書きを消してまっさらな状態から始める（前回実行分の残留を避ける）。
await page.goto(`${BASE}/ky/paper`, { waitUntil: "networkidle" });
await page.evaluate((k) => {
  const keep = window.localStorage.getItem(k);
  window.localStorage.clear();
  if (keep) window.localStorage.setItem(k, keep);
}, WORKERS_KEY);

await page.goto(`${BASE}/ky/paper?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// (1) 「参加者」欄がタップ標的として見え、タップでエディタが開く。
const participantsCell = page.getByRole("button", { name: "参加者を入力" });
check("『参加者』欄がタップ標的として見える", await participantsCell.isVisible().catch(() => false));
await participantsCell.click();
const sheet = page.getByTestId("field-editor-sheet");
check("タップでエディタシートが開く", await sheet.isVisible().catch(() => false));
check("エディタに作業員マスターのチップが並ぶ", await sheet.getByRole("button", { name: "山田 太郎" }).isVisible().catch(() => false));

// (2) 個別チップで1名選択→即座に選択中カウントに反映。
await sheet.getByRole("button", { name: "山田 太郎" }).click();
await page.waitForTimeout(150);
check("チップタップで『選択中1名』に更新", await sheet.getByText("選択中 1名").isVisible().catch(() => false));

// (3) 「常用2名をまとめて選ぶ」で一括追加。
const bulkBtn = sheet.getByRole("button", { name: /常用2名をまとめて選ぶ/ });
check("『常用まとめて選ぶ』ホットスポットが見える", await bulkBtn.isVisible().catch(() => false));
await bulkBtn.click();
await page.waitForTimeout(150);
check("一括追加で『選択中2名』に更新（常用=山田+佐藤）", await sheet.getByText("選択中 2名").isVisible().catch(() => false));

// (4) 協力会社チップも個別追加できる。
await sheet.getByRole("button", { name: "鈴木 三郎" }).click();
await page.waitForTimeout(150);
check("協力会社の作業員も個別追加でき『選択中3名』に更新", await sheet.getByText("選択中 3名").isVisible().catch(() => false));

// (5) 記入順チェーンの終端＝参加者の次は無く「完了」ボタンになる。
check("参加者は記入順の最終欄＝『完了』ボタン（『次の欄へ』ではない）", await sheet.getByRole("button", { name: "完了" }).isVisible().catch(() => false));
await sheet.getByRole("button", { name: "完了" }).click();
await page.waitForTimeout(200);
check("『完了』でエディタが閉じる", !(await sheet.isVisible().catch(() => false)));

// (6) 用紙（画面キャンバス）に選択した3名が反映（WYSIWYG）。
const canvasText = await page.locator("main, body").first().innerText().catch(() => "");
check("選んだ参加者3名が用紙に反映", ["山田 太郎", "佐藤 次郎", "鈴木 三郎"].every((n) => canvasText.includes(n)));

// (7) 印刷経路（editing無し）にも同じ参加者が反映され、印刷専用ボタンは出ない（WYSIWYG・不可侵）。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シート（非表示・print専用）にも同じ参加者が反映",
  ["山田 太郎", "佐藤 次郎", "鈴木 三郎"].every((n) => printText.includes(n))
);
check("印刷シートにはチップ選択UIが出ない（editing無しでは装飾なし）", !printText.includes("常用") && !printText.includes("選択中"));

// (8) 1名だけ解除すると用紙からも消える（チップのトグルが双方向に効く）。
await participantsCell.click();
await sheet.getByRole("button", { name: "✓ 山田 太郎" }).click();
await page.waitForTimeout(150);
check("チップ再タップで解除でき『選択中2名』に戻る", await sheet.getByText("選択中 2名").isVisible().catch(() => false));
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
const afterRemove = await page.locator("main, body").first().innerText().catch(() => "");
check("解除した参加者は用紙から消える", !afterRemove.includes("山田 太郎"));
check("解除していない参加者は用紙に残る", afterRemove.includes("佐藤 次郎") && afterRemove.includes("鈴木 三郎"));

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
