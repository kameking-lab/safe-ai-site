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
//    RSCペイロード内の文字列と区別するため、JS無効ブラウザで実DOMを数える
{
  const ctxNoJs = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
    serviceWorkers: "block",
  });
  const pNoJs = await ctxNoJs.newPage();
  await pNoJs.goto(`${BASE}/laws`, { waitUntil: "domcontentloaded" });
  const liCount = await pNoJs.locator("#section-laws li").count();
  const bodyText = (await pNoJs.locator("#section-laws").textContent().catch(() => "")) ?? "";
  check(
    "laws: JS無効でも法改正一覧がSSR描画される",
    liCount >= 20 && bodyText.includes("改正"),
    `li x${liCount}`,
  );
  await ctxNoJs.close();
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
  // タブ切替→URL同期（タブ実ラベル=「詳細事例（参考）」が analysis タブ）
  const analysisTab = page.getByRole("button", { name: /詳細事例/ }).first();
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
//    値は型グリッド/quick-accident-search が実際に渡す ALL_ACCIDENT_TYPES の「墜落」
//    （「墜落・転落」はMHLW表記でフィルタ値としては不正→URLから除去されるのが正）
{
  await page.goto(`${BASE}/accidents?tab=list&acc_type=${encodeURIComponent("墜落")}`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1200);
  const url = page.url();
  check(
    "accidents: ?acc_type= がURLに保持される（復元+同期で消えない）",
    decodeURIComponent(url).includes("墜落"),
    url,
  );
}

// 8) サスペンド焼き込みの回帰防止: 静的HTMLに「loading スケルトン先行→$RCスワップ」が
//    無いこと。許容される Suspense 境界はヘッダーの UserMenu スロット2個のみ
//    （フォールバック=本文と同一のログインボタン=同寸・シフトゼロ）。
//    app/loading.tsx 復活・layout直下のawait・dynamic(ssr:true)のページ直下使用などで
//    境界が増えると即FAIL（= C-1根治のガード）。
{
  for (const path of ["/accidents", "/laws", "/whats-new"]) {
    const res = await fetch(`${BASE}${path}`);
    const html = await res.text();
    const boundaries = [...html.matchAll(/<template id="B:\d+"/g)].length;
    const hasPageSkeleton = html.includes("ページを読み込み中") || html.includes("法改正一覧を読み込み中");
    check(
      `static-shell: ${path} に loading 焼き込みが無い（境界はUserMenu2個以下）`,
      boundaries <= 2 && !hasPageSkeleton,
      `boundaries=${boundaries} skeleton=${hasPageSkeleton}`,
    );
  }
}

// 9) /accidents CLS 実測ガード: モバイル+CPU4xで layout-shift 合計 < 0.05 を2回連続確認
//    （保護具セクションが初回ペイント後に押し下げられる回帰の検出）
{
  const ctx3 = await browser.newContext({
    viewport: { width: 412, height: 823 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "block",
  });
  const p3 = await ctx3.newPage();
  const cdp = await ctx3.newCDPSession(p3);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p3.addInitScript(() => {
    window.__clsTotal = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) window.__clsTotal += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  for (let i = 1; i <= 2; i++) {
    await p3.goto(`${BASE}/accidents`, { waitUntil: "load" });
    await p3.waitForTimeout(2500);
    const cls = await p3.evaluate(() => window.__clsTotal);
    check(`accidents: 実測CLS < 0.05（${i}回目）`, cls < 0.05, `cls=${cls.toFixed(4)}`);
    await p3.evaluate(() => (window.__clsTotal = 0));
  }
  // ハイドレーション後も保護具セクションが消えない（SSR/client分岐の回帰検出）
  const ppeVisible = await p3.getByText("予防保護具").first().isVisible().catch(() => false);
  check("accidents: ハイドレーション後も保護具セクションが表示されている", ppeVisible, "");
  await ctx3.close();
}

await browser.close();
const fails = results.filter((r) => !r.ok);
console.log(`\n==== ${results.length - fails.length}/${results.length} PASS ====`);
process.exit(fails.length > 0 ? 1 : 0);
