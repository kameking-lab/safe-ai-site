// S1（打合せ用紙 直接操作UI・第二弾）無読チェック（/safety-diary?canvas=1 の用紙キャンバスβ）。
// 実行: cd web && (PORT=4213 npm run start &) ; node ../docs/third-party-reviews/scripts/meeting-canvas-phase2-tomorrow-events-2026-07-03.mjs
// 無読の問い: ヘッダー7欄の記入順の続きとして、明日のイベント5欄（安全大会/検査/パトロール/明日の安全目標/その他）＋
//   統括安全責任者コメントをcanvas上でタップ編集でき、用紙（＝印刷と同一WYSIWYG）にすぐ反映されるか。
//   記入順チェーンが作成担当者→安全大会→…→その他→（第五弾で挿入された既定1行の搬入出＝物→時刻→場所）
//   →統括安全責任者コメント→（第六弾で挿入された点検項目1カテゴリ目）まで一筆書きで辿れるか。
//   印刷経路（editing無し）は不変か。
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

// 直近の下書きを消してまっさらな状態から始める（前回実行分の残留を避ける）。
await page.goto(`${BASE}/safety-diary`, { waitUntil: "networkidle" });
await page.evaluate(() => window.localStorage.clear());

// キャンバス表示へ切替。
await page.goto(`${BASE}/safety-diary?canvas=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
check("キャンバス表示に直接遷移できる", await page.getByRole("button", { name: "従来表示" }).isVisible().catch(() => false));

// (1) 「安全大会」セルをタップ→エディタが開く→textarea入力→用紙に反映。
const safetyMeetingCell = page.getByRole("button", { name: "安全大会を入力" });
check("『安全大会』セルがタップ標的として見える", await safetyMeetingCell.isVisible().catch(() => false));
await safetyMeetingCell.click();
const sheet = page.getByTestId("meeting-field-editor-sheet");
check("タップでエディタシートが開く", await sheet.isVisible().catch(() => false));
check("テキストエリア（複数行入力）が表示される", (await sheet.locator("textarea").count()) > 0);
await sheet.locator("textarea").first().fill("全社安全大会 9:00〜");
await page.waitForTimeout(150);
check(
  "入力内容が用紙（印刷と同一WYSIWYG）にすぐ反映される",
  await page.getByText("全社安全大会 9:00〜").first().isVisible().catch(() => false)
);

// (2) 「次の欄へ」で検査→パトロール→明日の安全目標→その他→統括安全責任者コメントと辿れる（一筆書き）。
const steps = [
  { label: "検査", value: "足場検査 13:00" },
  { label: "パトロール", value: "全体パトロール 15:00" },
  { label: "明日の安全目標", value: "高所作業の墜落防止を徹底する" },
  { label: "その他", value: "新規入場者2名予定" },
];
for (const s of steps) {
  await sheet.getByRole("button", { name: /次の欄へ/ }).click();
  await page.waitForTimeout(150);
  check(`『次の欄へ』で${s.label}のエディタに進む`, await sheet.getByText(s.label).first().isVisible().catch(() => false));
  await sheet.locator("textarea").first().fill(s.value);
}
// その他(free)の次は第五弾で挿入された既定1行の搬入出（物→時刻→場所）を経由してから最終欄へ辿る。
for (const label of ["搬入出（物）", "時刻", "場所"]) {
  await sheet.getByRole("button", { name: /次の欄へ/ }).click();
  await page.waitForTimeout(150);
  check(`『次の欄へ』で搬入出の${label}欄を経由する（S1第五弾で挿入された記入順）`, await sheet.getByText(label, { exact: true }).first().isVisible().catch(() => false));
}
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check("さらに『次の欄へ』で統括安全責任者コメントのエディタに進む（記入順の最終欄）", await sheet.getByText("統括安全責任者コメント").first().isVisible().catch(() => false));
await sheet.locator("textarea").first().fill("高所作業は特に注意すること。");
// S1第六弾: 点検項目8カテゴリが記入順チェーンに追加されたため、統括安全責任者コメントは
// もう最終欄ではなく次は点検項目1カテゴリ目（一般事項）に進む（真の最終欄検証は phase6 スクリプトで担保）。
await sheet.getByRole("button", { name: /次の欄へ/ }).click();
await page.waitForTimeout(150);
check(
  "統括安全責任者コメントの次は点検項目1カテゴリ目（S1第六弾で追加された記入順）に進む",
  await sheet.getByText("点検（一般事項）", { exact: true }).first().isVisible().catch(() => false)
);
await sheet.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(200);

check("検査が用紙に反映", await page.getByText("足場検査 13:00").first().isVisible().catch(() => false));
check("パトロールが用紙に反映", await page.getByText("全体パトロール 15:00").first().isVisible().catch(() => false));
check("明日の安全目標が用紙に反映", await page.getByText("高所作業の墜落防止を徹底する").first().isVisible().catch(() => false));
check("その他が用紙に反映", await page.getByText("新規入場者2名予定").first().isVisible().catch(() => false));
check("統括安全責任者コメントが用紙に反映", await page.getByText("高所作業は特に注意すること。").first().isVisible().catch(() => false));

// (3) 印刷経路（editing無し）は不変＝画面キャンバスと同じ入力内容が印刷用にも反映。
const printSheet = page.locator(".print\\:block");
const printText = await printSheet.innerText().catch(() => "");
check(
  "印刷シート（非表示・print専用）にも同じ入力内容が反映（WYSIWYG）",
  printText.includes("全社安全大会 9:00〜") && printText.includes("高所作業は特に注意すること。")
);

// (4) クラシック表示にも同じ内容が反映（同一record共有。入力欄の値なのでinnerTextではなくvalueで検証）。
await page.getByRole("button", { name: "従来表示" }).click();
await page.waitForTimeout(300);
const classicSafetyMeetingValue = await page.getByLabel("安全大会").inputValue().catch(() => "");
check("クラシック表示にも安全大会の入力内容が反映（同一record共有）", classicSafetyMeetingValue === "全社安全大会 9:00〜");

console.log(`\n${pass}/${total} PASS`);
await browser.close();
process.exit(pass === total ? 0 : 1);
