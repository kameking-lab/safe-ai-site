/**
 * 無読テスト: トップ home-three-pillars.tsx の44pxタップ標的是正（柱0補充・2026-07-03）
 *
 * ペルソナ: スマホでトップを開き、本文を読まず指でタップだけする初訪の一人親方（390×844）。
 * 背景: 死亡事故パネルの「10年事故DB一覧へ」リンク（パディング無し・mt-1.5 text-[11px]≈21px）と
 *   AlertGenerator「注意喚起文を作成」送信ボタン（py-1 text-[11px]≈21-24px）が44px未満で
 *   親指操作が押し損ねるサイズだった既存欠陥。
 *
 * 検証: 実boundingBoxが両要素とも44px以上あること。
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/top-three-pillars-44px-2026-07-03.mjs
 */
import { chromium } from "@playwright/test";

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

console.log("\n[/] トップ 死亡事故パネルの44pxタップ標的（スマホ390×844）");
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const dbLink = page.getByRole("link", { name: /10年事故DB一覧へ/ });
const dbBox = await dbLink.boundingBox();
check("「10年事故DB一覧へ」リンクが44px以上", !!dbBox && dbBox.height >= 44, `height=${dbBox?.height}`);

const alertButton = page.getByRole("button", { name: /注意喚起文を作成/ }).first();
const btnBox = await alertButton.boundingBox();
check("「注意喚起文を作成」送信ボタンが44px以上", !!btnBox && btnBox.height >= 44, `height=${btnBox?.height}`);

console.log(`\n  無読まとめ: 死亡事故パネルの主要2タップ標的が44px以上に是正`);
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
