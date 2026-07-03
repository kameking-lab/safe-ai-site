/**
 * 無読テスト: /signage 作業資料モード サムネイル一覧「個別削除（✕バッジ）」の44px是正（柱0補充・2026-07-04）
 *
 * ペルソナ: 現場で本文を読まず指でタップだけする一人親方・巡回者。
 * 背景: signage-today-documents.tsx のサムネイル右上の個別削除ボタンが h-5 w-5(20x20px)固定で
 *   44px未満だった。同ファイル内の他ボタン(＋資料を追加・一括クリア・カルーセル上の✕削除・
 *   タイトル編集input)は既に44px是正済みだったが、このサムネイル×削除ボタンのみ既存の一括
 *   是正から漏れていた。見た目の小バッジ(20x20px)は維持しつつ、実タップ標的(ボタン自体の
 *   boundingBox)を44x44pxへ拡張(内側にvisualのみ小さいspanを配置)。
 *
 * 検証: 実boundingBoxが44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3122 npm run start
 *   BASE_URL=http://localhost:3122 node docs/third-party-reviews/scripts/signage-today-documents-thumbnail-delete-44px-2026-07-04.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../web/node_modules/playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3122";

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

// 1x1透明PNGのdata URL(テスト用サムネイル種)
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const browser = await chromium.launch();

console.log("\n[/signage 作業資料モード] サムネイル個別削除ボタン(✕バッジ)の44pxタップ標的");
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.addInitScript(
    ({ key, items }) => window.localStorage.setItem(key, JSON.stringify(items)),
    {
      key: "signage-today-documents",
      items: [
        { id: "doc-1", title: "テスト資料1", memo: "", dataUrl: TINY_PNG, type: "image" },
        { id: "doc-2", title: "テスト資料2", memo: "", dataUrl: TINY_PNG, type: "image" },
      ],
    },
  );
  await page.goto(`${BASE}/signage`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const workdocsTab = page.getByRole("button", { name: "作業資料" });
  if (await workdocsTab.count()) {
    await workdocsTab.click();
    await page.waitForTimeout(300);
    const deleteBtn = page.getByRole("button", { name: "資料 1 を削除" });
    if (await deleteBtn.count()) {
      const box = await deleteBtn.boundingBox();
      check("サムネイル1の削除ボタンが44px以上(高さ)", !!box && box.height >= 44, `height=${box?.height}`);
      check("サムネイル1の削除ボタンが44px以上(幅)", !!box && box.width >= 44, `width=${box?.width}`);
    } else {
      check("サムネイル1の削除ボタンが見つかる", false);
    }
  } else {
    check("作業資料タブが見つかる", false);
  }
  await ctx.close();
}

await browser.close();

console.log(`\n合計: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
