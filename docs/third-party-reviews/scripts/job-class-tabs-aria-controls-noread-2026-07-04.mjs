/**
 * 無読テスト: /mental-health-management/interview-guidance 職種別タブの
 * role="tab"/role="tabpanel" ARIA関連付け（aria-controls/id）を確認（2026-07-04）
 *
 * 背景: 自領域Explore調査で発見。JobClassTabs（job-class-tabs.tsx）は同種の
 * タブUIである top-cases-tabs.tsx / StatsDashboardImpl.tsx と異なり、
 * タブボタンにaria-controlsが無く、tabpanelにもidが無いため、スクリーンリーダー
 * 利用者がどのタブがどのパネルに対応するのか読み上げで判別できなかった。
 *
 * 是正: 各タブに共通のaria-controls={panelId}、tabpanelにid={panelId}を付与。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/job-class-tabs-aria-controls-noread-2026-07-04.mjs
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
console.log("\n[/mental-health-management/interview-guidance] 職種別タブ ARIA関連付け");
await page.goto(`${BASE}/mental-health-management/interview-guidance`, {
  waitUntil: "domcontentloaded",
});

const tabs = page.getByRole("tab");
await tabs.first().waitFor({ state: "visible", timeout: 10000 });
const tabCount = await tabs.count();
check("職種タブが複数表示される", tabCount > 1);

const panel = page.getByRole("tabpanel");
await panel.waitFor({ state: "visible", timeout: 5000 });
const panelId = await panel.getAttribute("id");
check("tabpanelにidが付与されている", !!panelId && panelId.length > 0);

for (let i = 0; i < tabCount; i++) {
  const tab = tabs.nth(i);
  const controls = await tab.getAttribute("aria-controls");
  check(`タブ${i + 1}のaria-controlsがtabpanelのidと一致する`, controls === panelId);
}

// 非退行: タブ切替後もパネル本文が更新されること
const firstLabel = await panel.textContent();
await tabs.nth(1).click();
await page.waitForTimeout(200);
const secondLabel = await panel.textContent();
check("タブ切替でパネル本文が更新される（非退行）", firstLabel !== secondLabel);

await ctx.close();
await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
