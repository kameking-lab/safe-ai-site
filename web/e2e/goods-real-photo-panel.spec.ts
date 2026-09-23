import { expect, test } from "@playwright/test";

test("保護具カテゴリから実商品パネルを開き、取得不能を明示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/goods-products?category=head-protection", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "not_configured", items: [], checkedAt: null }) });
  });
  await page.goto("/goods");
  await page.getByRole("button", { name: /保護帽のカテゴリイラスト.*実物を見る/u }).click();
  await expect(page.getByRole("heading", { name: "保護帽の実商品写真と高評価候補" })).toBeVisible();
  await expect(page.getByText(/商品データの接続が未設定/u)).toBeVisible();
  await expect(page.locator('[aria-label="実商品写真を左右にスライド"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("取得した商品写真・評価を販売ページへ進む前に表示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/goods-products?category=head-protection", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({
      status: "ready",
      checkedAt: "2026-09-23T00:00:00.000Z",
      items: [{
        id: "shop:helmet-1",
        name: "作業用ヘルメット 型番A",
        imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/shop/cabinet/helmet.jpg",
        rating: 4.6,
        reviewCount: 34,
        affiliateUrl: "https://item.rakuten.co.jp/shop/helmet-1/",
      }],
    }) });
  });
  await page.goto("/goods");
  await page.getByRole("button", { name: /保護帽のカテゴリイラスト.*実物を見る/u }).click();
  const products = page.getByRole("list", { name: "実商品写真を左右にスライド" });
  await expect(products.getByRole("img", { name: /作業用ヘルメット 型番Aの商品写真/u })).toHaveAttribute("src", /thumbnail\.image\.rakuten\.co\.jp/u);
  await expect(products.getByText("★4.6")).toBeVisible();
  await expect(products.getByRole("link", { name: /写真と仕様を販売店で確認/u })).toHaveAttribute("href", "https://item.rakuten.co.jp/shop/helmet-1/");
});
