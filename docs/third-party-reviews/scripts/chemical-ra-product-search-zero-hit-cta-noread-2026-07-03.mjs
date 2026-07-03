/**
 * 無読テスト（柱0・機能UX班-B・2026-07-03）
 *
 * 対象: /chemical-ra/product-search（SDS製品検索）のゼロヒット時。
 * 是正前は実エラーと同一の汎用赤バナーで「見つかりませんでした」とだけ表示し、
 * 次の一手（他ページへの導線）が無かった（柱0違反）。
 * 是正後、ゼロヒット専用の空状態UIに、化学物質RA（手入力）・化学物質検索DBへの
 * 具体的CTAリンクが隣接表示されることを実機(prod 3100)で固定する。
 *
 * 判定:
 *   1) 存在しない製品名で検索するとゼロヒット専用メッセージが表示される
 *   2) 「化学物質RA（手入力）」CTAリンクが /chemical-ra を指す
 *   3) 「化学物質検索DB」CTAリンクが /chemical-database を指す
 *   4) 実在製品名（主要10製品の1つ）で検索するとヒットし、CTAは出ない
 *   5) h1=1（多重h1なし）
 *
 * 実行: BASE_URL=http://localhost:3100 node <このファイル>
 *   （@playwright/test 解決のため web/ ディレクトリから実行すること）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3100";

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();
  let pass = 0;
  let fail = 0;
  const check = (cond, msg) => {
    if (cond) {
      pass += 1;
      console.log(`PASS ${msg}`);
    } else {
      fail += 1;
      console.log(`FAIL ${msg}`);
    }
  };

  await page.goto(`${BASE}/chemical-ra/product-search`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(1000);

  const h1Count = await page.locator("h1").count();
  check(h1Count === 1, `h1=1（実測${h1Count}）`);

  // ゼロヒット: 存在しない製品名
  await page.getByPlaceholder("例: KURE 5-56、ラッカーシンナー").fill("該当しない架空製品XYZ999");
  await page.getByRole("button", { name: "SDS DB を検索" }).click();
  await page.waitForTimeout(1500);

  const zeroHitMsg = await page
    .getByText("該当する製品が見つかりませんでした（主要10製品収録）。次のいずれかをお試しください。")
    .count();
  check(zeroHitMsg > 0, "ゼロヒット専用メッセージが表示される");

  const raLink = page.getByRole("link", { name: "化学物質RA（手入力）で成分名から評価する" });
  const dbLink = page.getByRole("link", { name: "化学物質検索DBで物質名を調べる" });
  check((await raLink.count()) > 0, "「化学物質RA（手入力）」CTAリンクが存在");
  check((await raLink.getAttribute("href")) === "/chemical-ra", "CTAリンクが /chemical-ra を指す");
  check((await dbLink.count()) > 0, "「化学物質検索DB」CTAリンクが存在");
  check(
    (await dbLink.getAttribute("href")) === "/chemical-database",
    "CTAリンクが /chemical-database を指す"
  );

  // ヒットあり: 実在製品名（内蔵DB既知の主要製品）
  await page.getByPlaceholder("例: KURE 5-56、ラッカーシンナー").fill("");
  await page.getByPlaceholder("例: KURE 5-56、ラッカーシンナー").fill("5-56");
  await page.getByRole("button", { name: "SDS DB を検索" }).click();
  await page.waitForTimeout(1500);

  const hitCountText = await page.getByText(/件ヒット/).count();
  check(hitCountText > 0, "実在製品名でヒットが表示される");
  const ctaAfterHit = await page
    .getByText("次のいずれかをお試しください")
    .count();
  check(ctaAfterHit === 0, "ヒットありのときは空状態CTAが出ない");

  await browser.close();
  console.log(`\nDone: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
