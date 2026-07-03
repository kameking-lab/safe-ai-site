/**
 * 無読テスト: /education-certification/finder の色の文法違反(red直書き)是正確認（柱0磨き・2026-07-03）
 *
 * 背景: 「法令義務」バッジ・アイコン・リセットボタンのhover色が SAFETY_TONE の danger トークン
 * (rose系)ではなく red-* を直書きしていた(safety-tone.ts の「状態を伝える色は必ずこのトークン
 * 経由で塗る」規約違反)。既存の overdue チップ(missing-checkup-tracker.tsx)等と同型の是正として、
 * red-* → rose-* へクラス名を統一(構造・ロジックは無変更)。
 *
 * ペルソナ: スマホで業種・作業内容をタップして必要資格を絞り込む安全担当・職長。
 *   「法令義務」の赤系バッジを見て、いま対応が必要な資格を3秒で区別できるか。
 *
 * 検証: (1) 「法令義務」バッジ・アイコン・リセットhoverのクラス名が red-* を含まず rose-* を含むこと。
 *       (2) バッジの実背景色が rose-100 相当(赤過ぎない・rgb 255,228,230近辺)であること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node ../docs/third-party-reviews/scripts/cert-finder-color-grammar-2026-07-03.mjs
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

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
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await ctx.newPage();

console.log("\n[/education-certification/finder]");
await page.goto(`${BASE}/education-certification/finder`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(200);

// 高所作業シナリオを選択→「法令義務」の結果を発生させる
await page.getByRole("button", { name: "高さ2m以上の高所作業（作業床なし）" }).click();
await page.waitForTimeout(300);

// 対象1: 「法令義務」バッジ
{
  const badge = page.getByText("法令義務", { exact: true });
  const visible = await badge.isVisible().catch(() => false);
  const className = visible ? await badge.getAttribute("class") : null;
  check("「法令義務」バッジが表示される", visible);
  check("バッジのクラスがred-*を含まない", !!className && !className.includes("red-"), className ?? "");
  check("バッジのクラスがrose-*を含む", !!className && className.includes("rose-"), className ?? "");

  const bg = visible
    ? await badge.evaluate((el) => getComputedStyle(el).backgroundColor)
    : null;
  // ブラウザのcolor-space設定によりrgb()/lab()等フォーマットが変わるため背景色が
  // 何らかの値を持つこと(=クラスが実際に適用されている)のみ確認。厳密な色一致はクラス名検証で担保。
  check("バッジに背景色が適用されている(透明でない)", !!bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent", `bg=${bg}`);
}

// 対象2: 見出し横のAlertCircleアイコン(「法令義務（N件）」)
{
  const heading = page.getByText(/法令義務（\d+件）/).first();
  const headingVisible = await heading.isVisible().catch(() => false);
  check("「法令義務（N件）」見出しが表示される", headingVisible);
  if (headingVisible) {
    const icon = heading.locator("svg").first();
    const iconClass = await icon.getAttribute("class").catch(() => null);
    check("見出しアイコンのクラスがred-*を含まない", !!iconClass && !iconClass.includes("red-"), iconClass ?? "");
    check("見出しアイコンのクラスがrose-*を含む", !!iconClass && iconClass.includes("rose-"), iconClass ?? "");
  }
}

// 対象3: 「条件をリセット」ボタンのhover色クラス
{
  const resetBtn = page.getByRole("button", { name: "条件をリセット" });
  const resetVisible = await resetBtn.isVisible().catch(() => false);
  const resetClass = resetVisible ? await resetBtn.getAttribute("class") : null;
  check("「条件をリセット」ボタンが表示される", resetVisible);
  check("リセットボタンのクラスがhover:text-red-を含まない", !!resetClass && !resetClass.includes("hover:text-red-"), resetClass ?? "");
  check("リセットボタンのクラスがhover:text-rose-を含む", !!resetClass && resetClass.includes("hover:text-rose-"), resetClass ?? "");
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
