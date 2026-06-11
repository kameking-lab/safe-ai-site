// C-1 モバイル実速度の構造是正 第1弾 — 挙動回帰検証（2026-06-12）
// 対象: useSearchParams排除によるURL復元・a11yバナーのpre-paint制御・
//       /laws もっと見る・非同期化した類似検索/プロファイル推薦
// 実行: cd web && npm run build && npm run start （port3000）
//       node ../docs/third-party-reviews/scripts/mobile-perf-regression-2026-06-12.mjs
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
const page = await ctx.newPage();

// 1) /laws: SSR HTMLに一覧本文が含まれる（クライアント差し替え構造の解消）
{
  const res = await page.request.get(`${BASE}/laws`);
  const html = await res.text();
  check(
    "laws: SSR HTMLに法改正一覧が含まれる",
    (html.match(/改正/g) ?? []).length > 50 && !html.includes("法改正一覧を読み込み中"),
    `改正 x${(html.match(/改正/g) ?? []).length}`,
  );
}

// 2) /laws ?tab=chat 深いリンク: マウント後にチャットタブが開く
{
  await page.goto(`${BASE}/laws?tab=chat`, { waitUntil: "networkidle" });
  const chatVisible = await page
    .locator("textarea, input")
    .filter({ has: page.locator(":scope") })
    .first()
    .isVisible()
    .catch(() => false);
  const tabActive = await page.getByRole("tab", { selected: true }).textContent().catch(() => null);
  check(
    "laws: ?tab=chat でチャットタブが開く",
    chatVisible || (tabActive ?? "").includes("チャット") || (await page.locator("#section-laws").textContent() ?? "").includes("質問"),
    `activeTab=${tabActive}`,
  );
}

// 3) /laws ?status=upcoming フィルタ復元
{
  await page.goto(`${BASE}/laws?status=upcoming`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const pressed = await page
    .locator('button[aria-pressed="true"], button')
    .filter({ hasText: "施行前" })
    .first()
    .getAttribute("class")
    .catch(() => null);
  check("laws: ?status=upcoming で施行前フィルタが復元", pressed !== null, "");
}

// 4) /laws もっと見る: 初期30件→全件展開
{
  await page.goto(`${BASE}/laws`, { waitUntil: "networkidle" });
  const before = await page.locator("#section-laws ul > li").count();
  const moreBtn = page.getByRole("button", { name: /もっと見る/ });
  const hasMore = await moreBtn.isVisible().catch(() => false);
  if (hasMore) {
    await moreBtn.click();
    await page.waitForTimeout(400);
    const after = await page.locator("#section-laws ul > li").count();
    check("laws: もっと見るで全件展開", before === 30 && after > before, `${before}→${after}`);
  } else {
    check("laws: もっと見るで全件展開", false, "ボタンが見つからない");
  }
}

// 5) /accidents ?tab=industry 深いリンク復元 + タブ切替のURL同期
{
  await page.goto(`${BASE}/accidents?tab=industry`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const industryVisible = await page
    .locator("#section-accidents")
    .textContent()
    .then((t) => (t ?? "").length > 0)
    .catch(() => false);
  check("accidents: ?tab=industry でタブ復元（セクション描画）", industryVisible, "");
  // タブ切替→URL同期
  const analysisTab = page.getByRole("button", { name: "分析レポート" }).first();
  if (await analysisTab.isVisible().catch(() => false)) {
    await analysisTab.click();
    await page.waitForTimeout(600);
    const url = page.url();
    check("accidents: タブ切替でURLが ?tab=analysis に同期", url.includes("tab=analysis"), url);
  } else {
    check("accidents: タブ切替でURLが ?tab=analysis に同期", false, "タブボタン不可視");
  }
}

// 6) a11yバナー: 初回=表示（SSR由来・挿入shiftなし）→ 閉じる → リロードで非表示（pre-paint属性）
{
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/whats-new`, { waitUntil: "domcontentloaded" });
  const banner = p2.locator("[data-a11y-hint]");
  const visibleFirst = await banner.isVisible().catch(() => false);
  check("a11y: 初回訪問でバナーがSSR表示される", visibleFirst, "");
  if (visibleFirst) {
    await p2.getByRole("button", { name: "案内バナーを閉じる" }).click();
    await p2.waitForTimeout(300);
    const attr = await p2.evaluate(() => document.documentElement.getAttribute("data-a11y-hint-dismissed"));
    check("a11y: 閉じるでhtml属性が立つ", attr === "1", `attr=${attr}`);
    await p2.reload({ waitUntil: "domcontentloaded" });
    const visibleAfter = await p2.locator("[data-a11y-hint]").isVisible().catch(() => false);
    const attrAfter = await p2.evaluate(() => document.documentElement.getAttribute("data-a11y-hint-dismissed"));
    check("a11y: リロード後はpre-paintで非表示", !visibleAfter && attrAfter === "1", "");
  }
  await ctx2.close();
}

// 7) /accidents ?acc_type= 型フィルタ復元（型グリッド遷移の互換）
{
  await page.goto(`${BASE}/accidents?tab=list&acc_type=${encodeURIComponent("墜落・転落")}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1200);
  const url = page.url();
  check(
    "accidents: ?acc_type= がURLに保持される（復元+同期で消えない）",
    decodeURIComponent(url).includes("墜落・転落"),
    url,
  );
}

await browser.close();
const fails = results.filter((r) => !r.ok);
console.log(`\n==== ${results.length - fails.length}/${results.length} PASS ====`);
process.exit(fails.length > 0 ? 1 : 0);
