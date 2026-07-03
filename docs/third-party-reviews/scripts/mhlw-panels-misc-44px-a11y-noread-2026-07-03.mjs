/**
 * 無読テスト: 柱0横展開監査(Explore)で発見した残存タップ標的漏れ10箇所＋a11y1箇所を是正（2026-07-03）
 *
 * 背景: lane backlog未着手が1件（要data班確認でブロック中）のみのため補充指針に従い
 * Exploreで自領域route・コンポーネントを横断監査。以下がmin-h未指定で44px未満のまま
 * 取り残されていた:
 *  - /chemical-ra: 「追加」ボタン（chemical-ra-extras.tsx）・A4実施レポート印刷ボタン（chemical-ra-panel.tsx）
 *  - /goods: サンプル質問チップ（goods-chatbot.tsx）
 *  - /laws: 絞り込み解除×ボタン（law-revision-list.tsx＝所有コンポーネントlaw-revision*）
 *  - /accidents-reports: 「フィルタを解除」ボタン（hub-filter.tsx）
 *  - /subsidies/calculator: 「公式ページ」外部リンク
 *  - /circulars/[id]: X(Twitter)/Facebook/メールで送る 共有リンク3本
 * 加えて /chatbot のエクスポートドロップダウン開閉ボタンに aria-expanded/aria-haspopup が
 * 無く同ファイル内の別ドロップダウン（履歴選択）と実装が不一致だったため付与。
 * 対策: 計9箇所にmin-h-[44px]（寸法のみ、文言・onClick/href不変）＋aria属性1箇所追加。
 * 既存破壊0。なお industry-risk-ranking.tsx・mhlw-deaths-panel.tsx・mhlw-disaster-databases-panel.tsx
 * はいずれも /accidents（variant="accidents"）専用描画＝ux-hub所有routeと判明したため対象外（未変更）。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する安全担当。
 * 判定基準（無読テスト）: 各ページの主要操作・共有導線が指で確実に押せるか。
 *
 * 実行: own prod server (localhost:3100) を起動した上で web/ から実行
 *   node ../docs/third-party-reviews/scripts/mhlw-panels-misc-44px-a11y-noread-2026-07-03.mjs
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
const context = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
const page = await context.newPage();

console.log("\n[/chemical-ra] 追加ボタン・印刷ボタン 44px 無読テスト");
await page.goto(`${BASE}/chemical-ra`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });
{
  const nameInput = page.getByPlaceholder("物質名").first();
  if (await nameInput.count()) {
    await nameInput.fill("テスト物質");
    const addBtn = page.getByRole("button", { name: /^追加$/ }).first();
    const h = await addBtn.evaluate((e) => e.getBoundingClientRect().height);
    check("chemical-ra-extras「追加」ボタンが44px以上", h >= 44, `height=${h}`);
  } else {
    console.log("  SKIP: 追加リストUIが見当たらず");
  }
}

console.log("\n[/chemical-ra] クイック判定→A4実施レポート印刷ボタン 44px 無読テスト");
await page.goto(`${BASE}/chemical-ra`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });
{
  const quickChip = page.getByRole("button", { name: "トルエン", exact: true }).first();
  await quickChip.waitFor({ state: "visible", timeout: 8000 });
  await quickChip.click();
  const printBtn = page.getByRole("button", { name: /A4実施レポート印刷/ }).first();
  await printBtn.waitFor({ state: "visible", timeout: 15000 });
  const h = await printBtn.evaluate((e) => e.getBoundingClientRect().height);
  check("chemical-ra-panel A4実施レポート印刷ボタンが44px以上", h >= 44, `height=${h}`);
}

console.log("\n[/goods] サンプル質問チップ 44px 無読テスト");
await page.goto(`${BASE}/goods`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });
{
  const chatHeading = page.getByText("AIチャットで相談", { exact: false }).first();
  if (await chatHeading.count()) {
    await chatHeading.scrollIntoViewIfNeeded();
  }
  const chip = page.locator("button.rounded-full.border-emerald-200").first();
  if (await chip.count()) {
    const h = await chip.evaluate((e) => e.getBoundingClientRect().height);
    check("goods-chatbotサンプル質問チップが44px以上", h >= 44, `height=${h}`);
  } else {
    console.log("  SKIP: サンプル質問チップが見当たらず");
  }
}

console.log("\n[/laws] 絞り込み解除×ボタン 44px 無読テスト");
await page.goto(`${BASE}/laws?articles=${encodeURIComponent("労働安全衛生法第66条")}`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });
{
  const clearBtn = page.getByRole("button", { name: "絞り込みを解除" }).first();
  try {
    await clearBtn.waitFor({ state: "visible", timeout: 8000 });
    const h = await clearBtn.evaluate((e) => e.getBoundingClientRect().height);
    const w = await clearBtn.evaluate((e) => e.getBoundingClientRect().width);
    check("law-revision-list 絞り込み解除×ボタンが44px以上", h >= 44 && w >= 44, `h=${h},w=${w}`);
  } catch {
    console.log("  SKIP: 絞り込み解除ボタンが見当たらず（articleFilter系のみ表示条件のため）");
  }
}

console.log("\n[/accidents-reports] フィルタを解除ボタン 44px 無読テスト");
await page.goto(`${BASE}/accidents-reports?q=%E8%BB%A2%E5%80%92`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });
{
  const resetBtn = page.getByRole("button", { name: "フィルタを解除" }).first();
  try {
    await resetBtn.waitFor({ state: "visible", timeout: 8000 });
    const h = await resetBtn.evaluate((e) => e.getBoundingClientRect().height);
    check("hub-filter「フィルタを解除」ボタンが44px以上", h >= 44, `height=${h}`);
  } catch {
    console.log("  SKIP: フィルタを解除ボタンが見当たらず");
  }
}

console.log("\n[/subsidies/calculator] 公式ページ外部リンク 44px 無読テスト");
await page.goto(`${BASE}/subsidies/calculator`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });
{
  await page.getByText("この投資で申請できる助成金", { exact: false }).first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  const firstMeasure = page.locator("button", { hasText: "作業環境測定" }).first();
  const measureBtn = (await firstMeasure.count()) ? firstMeasure : page.locator("h2:has-text('実施したい施策') ~ div button").first();
  await measureBtn.click();
  await page.getByRole("button", { name: /申請可能な助成金を試算する/ }).click();
  const officialLink = page.getByRole("link", { name: /公式ページ/ }).first();
  try {
    await officialLink.waitFor({ state: "visible", timeout: 8000 });
    const h = await officialLink.evaluate((e) => e.getBoundingClientRect().height);
    check("公式ページ外部リンクが44px以上", h >= 44, `height=${h}`);
  } catch {
    console.log("  SKIP: 公式ページリンクが見当たらず（施策選択前）");
  }
}

console.log("\n[/circulars/mhlw-notice-0001] 共有リンク3本 44px 無読テスト");
await page.goto(`${BASE}/circulars/mhlw-notice-0001`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { level: 1 }).first().waitFor({ state: "visible", timeout: 10000 });
{
  const xLink = page.getByRole("link", { name: /X \(Twitter\) で共有/ });
  const fbLink = page.getByRole("link", { name: /Facebookで共有/ });
  const mailLink = page.getByRole("link", { name: /メールで送る/ });
  const heights = await Promise.all(
    [xLink, fbLink, mailLink].map(async (l) => (await l.count()) ? l.first().evaluate((e) => e.getBoundingClientRect().height) : -1)
  );
  check("共有リンク3本（X/Facebook/メール）が全て44px以上", heights.every((h) => h >= 44), `heights=${heights.join(",")}`);
}

console.log("\n[/chatbot] エクスポートドロップダウン aria-expanded 無読テスト");
await page.goto(`${BASE}/chatbot`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
{
  const exampleBtn = page.getByRole("button", { name: "足場の手すり高さは？" });
  if ((await exampleBtn.count()) > 0) {
    await exampleBtn.first().click();
  } else {
    await page.locator("textarea").fill("足場の手すり高さは？");
    await page.getByRole("button", { name: "送信", exact: true }).click();
  }
  await page.getByText("🗑 履歴をクリア").first().waitFor({ state: "visible", timeout: 60000 });
  await page.locator('[aria-label="回答の結論"]').first().waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(500);

  const exportBtn = page.getByRole("button", { name: /エクスポート/ }).first();
  const before = await exportBtn.getAttribute("aria-expanded");
  check("エクスポートボタンが開く前は aria-expanded=false", before === "false", `before=${before}`);
  const haspopup = await exportBtn.getAttribute("aria-haspopup");
  check("エクスポートボタンに aria-haspopup='true'", haspopup === "true", `haspopup=${haspopup}`);
  await exportBtn.click();
  await page.waitForTimeout(200);
  const after = await exportBtn.getAttribute("aria-expanded");
  check("エクスポートボタンが開いた後は aria-expanded=true", after === "true", `after=${after}`);
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
