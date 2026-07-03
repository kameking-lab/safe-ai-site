/**
 * 無読テスト: /quick 「熱中症WBGT」ショートカットの誤配線是正（柱0補充・2026-07-03）
 *
 * ペルソナ: 朝礼3分で /quick を開き、本文を読まず指でタップだけする現場職長（スマホ390×844）。
 * 背景: 「熱中症WBGT」ショートカットが実際には「フルハーネス」と同じ /education（特別教育の
 *   一般カタログ・WBGT計算機なし）へ誤配線されており、タップしても約束された機能（今日の
 *   WBGT計算・業種別リスク判定）に到達できない既存欠陥（測定可能な行き止まり）だった。
 *
 * 検証:
 *   1) /quick の「熱中症WBGT」ショートカットのhrefが /heat-illness-prevention（実在のWBGT計算機ハブ）
 *   2) 実際にタップして遷移した先が /heat-illness-prevention であること
 *   3) 遷移先ページにWBGT計算機ハブの見出しが実在すること（行き止まりでないことの実地確認）
 * （ショートカット間のhref重複がないことは QuickLauncher.test.tsx のvitestで回帰ガード済み）
 *
 * 実行: cd web && npm run build && PORT=3100 npm run start
 *   BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/quick-wbgt-shortcut-noread-2026-07-03.mjs
 *   （@playwright/test 解決のため web 配下から実行）
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

console.log("\n[/quick] 熱中症WBGTショートカットの誤配線是正（スマホ390×844）");
await page.goto(`${BASE}/quick`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const wbgtLink = page.getByRole("link", { name: /熱中症WBGT/ });
const href = await wbgtLink.getAttribute("href");
check("「熱中症WBGT」ショートカットのhrefが/heat-illness-prevention", href === "/heat-illness-prevention", `href=${href}`);

await wbgtLink.click();
await page.waitForURL(`${BASE}/heat-illness-prevention`, { timeout: 5000 });
check("タップ後の実際の遷移先が/heat-illness-prevention", page.url().endsWith("/heat-illness-prevention"), page.url());

const heading = page.getByRole("heading", { name: /熱中症/ }).first();
check("遷移先にWBGT計算機ハブの見出しが実在（行き止まりでない）", (await heading.count()) >= 1);

console.log(`\n  無読まとめ: 「熱中症WBGT」タップ→実在のWBGT計算機ハブへ到達、行き止まり解消`);
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
