import { expect, test } from "@playwright/test";

test("保護具カテゴリから実商品パネルを開き、取得不能を明示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/goods-products?category=head-protection", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "not_configured", items: [], checkedAt: null }) });
  });
  await page.goto("/goods");
  await page.getByRole("button", { name: "保護帽", exact: true }).click();
  await expect(page.getByRole("heading", { name: "保護帽の実商品写真と高評価候補" })).toBeVisible();
  await expect(page.getByText(/実商品写真・購入者評価は現在表示できません/u)).toBeVisible();
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
  await page.getByRole("button", { name: "保護帽", exact: true }).click();
  const products = page.getByRole("list", { name: "実商品写真を左右にスライド" });
  await expect(products.getByRole("img", { name: /作業用ヘルメット 型番Aの商品写真/u })).toHaveAttribute("src", /thumbnail\.image\.rakuten\.co\.jp/u);
  await expect(products.getByText("★4.6")).toBeVisible();
  await expect(products.getByRole("link", { name: /写真と仕様を販売店で確認/u })).toHaveAttribute("href", "https://item.rakuten.co.jp/shop/helmet-1/");
});


test("15カテゴリを一覧し、選択・戻る・再読込で現在位置を保つ", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/goods-products?*", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "not_configured", items: [], checkedAt: null }) });
  });
  await page.goto("/goods");
  const directory = page.getByRole("list", { name: "安全用品カテゴリの画像一覧" });
  await expect(directory.getByRole("button")).toHaveCount(15);
  expect(await directory.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const helmet = page.getByRole("button", { name: "保護帽", exact: true });
  await helmet.click();
  await expect(page).toHaveURL(/category=head-protection/u);
  await expect(directory).toBeHidden();
  await page.goBack();
  await expect(directory).toBeVisible();
  await expect(helmet).toBeFocused();
  await helmet.click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "保護帽の実商品写真と高評価候補" })).toBeVisible();
  await page.getByRole("button", { name: "用品一覧に戻る" }).click();
  await expect(directory).toBeVisible();
  await expect(helmet).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("直接開いたカテゴリからも一覧へ戻れる", async ({ page }) => {
  await page.route("**/api/goods-products?*", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "not_configured", items: [], checkedAt: null }) });
  });
  await page.goto("/goods?category=head-protection");
  await page.getByRole("button", { name: "用品一覧に戻る" }).click();
  await expect(page).toHaveURL(/\/goods$/u);
  await expect(page.getByRole("button", { name: "保護帽", exact: true })).toBeFocused();
});

test("商品パネルは左右ボタンと矢印キーで送れる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/goods-products?*", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({
      status: "ready", checkedAt: "2026-09-24T00:00:00.000Z",
      items: Array.from({ length: 6 }, (_, index) => ({
        id: `fixture:${index}`, name: `テスト用商品 ${index + 1}`,
        imageUrl: "/safety-images/library/previews/helmet-required.webp",
        rating: 4.6, reviewCount: 30 + index,
        affiliateUrl: `https://item.rakuten.co.jp/fixture/${index}/`,
      })),
    }) });
  });
  await page.goto("/goods?category=head-protection");
  const products = page.getByRole("list", { name: "実商品写真を左右にスライド" });
  const previous = page.getByRole("button", { name: "前の商品を見る" });
  await expect(previous).toBeDisabled();
  await page.getByRole("button", { name: "次の商品を見る" }).click();
  await expect.poll(() => products.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
  await expect(previous).toBeEnabled();
  await products.focus();
  await products.press("ArrowLeft");
  await expect.poll(() => products.evaluate((element) => element.scrollLeft)).toBe(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
