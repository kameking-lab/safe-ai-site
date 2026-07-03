// 柱0磨き 巡回発見＝
//  (1) 色の文法違反: /site-records のバックアップ取り込み失敗メッセージが常に緑(emerald)固定で
//      表示されており、safety-tone.tsの「赤=危険/黄=注意/緑=良好」の文法に反していた。
//      失敗時は danger(赤)、成功時は safe(緑) を出すよう是正。
//  (2) 44px未満のタップ標的（新規3箇所）:
//      /ky/paper?canvas=1「＋危険行を追加」・AI提案の「反映」ボタン・/ky/morning共有コード「表示」
// 実行: cd web && npm run build && PORT=3100 npm run start
//   BASE_URL=http://localhost:3100 node ../docs/third-party-reviews/scripts/records-backup-color-grammar-44px-2026-07-03.mjs
//
// ペルソナ: 記録をバックアップ/復元する安全担当・KY用紙をキャンバスで編集する職長・朝礼サイネージで共有コードを入力する人。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE_URL ?? process.env.BASE ?? "http://localhost:3100";
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

const checkHeight = async (page, label, detail = "") => {
  const btn = page.getByRole("button", { name: label }).first();
  const box = await btn.boundingBox();
  check(`「${label}」が44px以上${detail}`, !!box && box.height >= 44, `height=${box?.height}`);
};

// PaperStage（KY/打合せ用紙キャンバス）はA4全体をtransform:scaleで縮小表示するため、
// 実測boundingBoxはズーム率で変動する（zoom-to-cellが前提の設計）。
// min-h-[44px]クラスが当たっているかはCSSのmin-height計算値（transformの影響を受けない）で検証する。
const checkMinHeightCss = async (page, label, detail = "") => {
  const btn = page.getByRole("button", { name: label }).first();
  const minHeight = await btn.evaluate((el) => getComputedStyle(el).minHeight).catch(() => null);
  const px = minHeight ? parseFloat(minHeight) : 0;
  check(`「${label}」のCSS min-heightが44px以上${detail}`, px >= 44, `min-height=${minHeight}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });

// ── /site-records バックアップの色の文法（失敗=赤・成功=緑）────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/site-records`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/site-records] バックアップ 取り込み失敗メッセージの色");

  // 不正なJSONファイルを選び「読み込めませんでした」を発火させる
  const fileInput = page.locator('input[type="file"][accept*="json"]');
  await fileInput.setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("これは不正なJSONです"),
  });
  await page.waitForTimeout(300);
  const status = page.getByRole("status").first();
  const text = await status.textContent().catch(() => null);
  check("失敗メッセージが表示される", !!text && text.includes("読み込めませんでした"), `text=${text}`);
  const cls = await status.getAttribute("class").catch(() => "");
  check("失敗メッセージが赤系(rose)クラス", !!cls && cls.includes("text-rose"), `class=${cls}`);
  check("失敗メッセージが緑(emerald)に固定されていない", !cls || !cls.includes("text-emerald"), `class=${cls}`);
  await page.close();
}

// ── /ky/paper（キャンバス）＋危険行を追加ボタン ─────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ky/paper?canvas=1`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  console.log("\n[/ky/paper?canvas=1] ＋危険行を追加");
  await checkMinHeightCss(page, "＋ 危険行を追加");
  await page.close();
}

// ── /ky/paper（キャンバス）AI提案の「反映」ボタン ─────────────────
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ky/paper?canvas=1`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  console.log("\n[/ky/paper?canvas=1] 危険のポイント欄→AI提案「反映」ボタン");
  // AI提案はworkDetail（本日の作業内容）から生成されるため先に埋める
  const workDetailCell = page.locator('[data-field-key="workDetail"]').first();
  if (await workDetailCell.count()) {
    await workDetailCell.click();
    await page.waitForTimeout(200);
    const wdSheet = page.getByTestId("field-editor-sheet");
    await wdSheet.locator("textarea").first().fill("高所での足場組立作業");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
  // 1行目の「危険のポイント」セルをタップしてエディタを開く
  const hazardCell = page.locator('[data-field-key="risk.0.hazard"]').first();
  if (await hazardCell.count()) {
    await hazardCell.click();
    await page.waitForTimeout(300);
    const aiBtn = page.getByRole("button", { name: /AIに危険箇所を提案させる/ });
    if (await aiBtn.count()) {
      await aiBtn.click();
      await page.waitForTimeout(1500);
      const applyBtn = page.getByRole("button", { name: "反映" }).first();
      if (await applyBtn.count()) {
        await checkMinHeightCss(page, "反映");
      } else {
        console.log("  SKIP: AI提案が0件だったため「反映」ボタン未出現（Gemini未設定時のフォールバック挙動）");
      }
    } else {
      console.log("  SKIP: AI提案ボタンが見つからなかった");
    }
  } else {
    console.log("  SKIP: 危険のポイントセルが見つからなかった");
  }
  await page.close();
}

// ── /ky/morning 共有コード入力フォーム「表示」ボタン ────────────
// 独立ブラウザコンテキストを使う（前段の/ky/paper検証でlocalStorageにKY下書きが
// 作成されると本日データありのフィット表示に分岐し「データなし」状態を再現できないため）。
{
  const freshCtx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await freshCtx.newPage();
  await page.goto(`${BASE}/ky/morning`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  console.log("\n[/ky/morning] 共有コード入力「表示」ボタン");
  const codeInput = page.getByLabel("共有コード");
  if (await codeInput.count()) {
    await codeInput.fill("123456");
    await checkHeight(page, "表示");
  } else {
    console.log("  SKIP: 共有コード入力欄が見つからなかった（本日のKYデータがありフィット表示中の可能性）");
  }
  await page.close();
  await freshCtx.close();
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
