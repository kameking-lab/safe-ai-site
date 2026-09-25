import { expect, test } from "@playwright/test";

test("保護具カテゴリから実商品パネルを開き、取得不能を明示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/goods-products?category=head-protection&feature=fall", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "not_configured", items: [], checkedAt: null }) });
  });
  await page.goto("/goods");
  await page.getByRole("button", { name: "保護帽", exact: true }).click();
  await expect(page.getByRole("heading", { name: "まず、必要な特徴を選ぶ" })).toBeVisible();
  await page.getByRole("button", { name: /墜落時の頭部保護/u }).click();
  await expect(page.getByRole("heading", { name: "保護帽の商品候補" })).toBeVisible();
  await expect(page.getByText(/商品データの接続準備中です/u)).toBeVisible();
  await expect(page.locator('[aria-label="実商品写真を左右にスライド"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("取得した商品写真・評価を販売ページへ進む前に表示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("https://thumbnail.image.rakuten.co.jp/**", async (route) => {
    await route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/+isAAAAASUVORK5CYII=", "base64") });
  });
  await page.route("**/api/goods-products?category=head-protection&feature=fall", async (route) => {
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
  await page.getByRole("button", { name: /墜落時の頭部保護/u }).click();
  const products = page.getByRole("list", { name: "実商品写真を左右にスライド" });
  await expect(products.getByRole("img", { name: /作業用ヘルメット 型番Aの商品写真/u })).toHaveAttribute("src", /thumbnail\.image\.rakuten\.co\.jp/u);
  await expect.poll(() => products.getByRole("img", { name: /作業用ヘルメット 型番Aの商品写真/u }).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(products.getByText("★4.6")).toBeVisible();
  await expect(products.getByRole("link", { name: /写真と仕様を販売店で確認/u })).toHaveAttribute("href", "https://item.rakuten.co.jp/shop/helmet-1/");
});

test("API画像が読み込めないときは写真を表示済みと見なさない", async ({ page }) => {
  await page.route("https://thumbnail.image.rakuten.co.jp/**", async (route) => route.abort());
  await page.route("**/api/goods-products?*", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "ready", checkedAt: "2026-09-25T00:00:00.000Z", items: [{ id: "shop:helmet-1", name: "保護帽", imageUrl: "https://thumbnail.image.rakuten.co.jp/helmet.jpg", rating: 4.6, reviewCount: 34, affiliateUrl: "https://item.rakuten.co.jp/shop/helmet-1/" }] }) });
  });
  await page.goto("/goods?category=head-protection&feature=fall");
  await expect(page.getByText(/写真を読み込めませんでした/u)).toBeVisible();
  await expect(page.getByRole("link", { name: /写真と仕様を販売店で確認/u })).toHaveAttribute("href", "https://item.rakuten.co.jp/shop/helmet-1/");
});


test("保護具8分類と補助用品8分類を選べ、戻る・再読込で現在位置を保つ", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/goods-products?*", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "not_configured", items: [], checkedAt: null }) });
  });
  await page.goto("/goods");
  const directory = page.getByRole("list", { name: "安全用品カテゴリの画像一覧" });
  await expect(directory.getByRole("button")).toHaveCount(8);
  await page.getByRole("button", { name: "現場の補助用品 8" }).click();
  await expect(directory.getByRole("button")).toHaveCount(8);
  await page.getByRole("button", { name: "すべて 16" }).click();
  await expect(directory.getByRole("button")).toHaveCount(16);
  await page.getByRole("button", { name: "身につける保護具 8" }).click();
  expect(await directory.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const helmet = page.getByRole("button", { name: "保護帽", exact: true });
  await helmet.click();
  await expect(page).toHaveURL(/category=head-protection/u);
  await expect(directory).toBeHidden();
  await page.getByRole("button", { name: /墜落時の頭部保護/u }).click();
  await expect(page).toHaveURL(/feature=fall/u);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "まず、必要な特徴を選ぶ" })).toBeVisible();
  await page.goBack();
  await expect(directory).toBeVisible();
  await expect(helmet).toBeFocused();
  await helmet.click();
  await page.getByRole("button", { name: /墜落時の頭部保護/u }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "保護帽の商品候補" })).toBeVisible();
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
  await page.getByRole("button", { name: /墜落時の頭部保護/u }).click();
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
  await page.goto("/goods?category=head-protection&feature=fall");
  const products = page.getByRole("list", { name: "実商品写真を左右にスライド" });
  const previous = page.getByRole("button", { name: "前の商品を見る" });
  await expect(previous).toBeDisabled();
  await page.getByRole("button", { name: "次の商品を見る" }).click();
  await expect.poll(() => products.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
  await expect(previous).toBeEnabled();
  await products.focus();
  await products.press("ArrowLeft");
  await expect.poll(() => products.evaluate((element) => element.scrollLeft)).toBe(0);
  await products.hover();
  await page.mouse.wheel(240, 0);
  await expect.poll(() => products.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
  await expect.poll(() => products.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
  await page.getByRole("button", { name: "特徴を選び直す" }).click();
  await page.getByRole("button", { name: /墜落時の頭部保護/u }).click();
  await expect.poll(() => products.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
  await expect(page.getByText("6件の候補・2件目から表示")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("呼吸用保護具・フルハーネス・保護眼鏡を特徴から探し、危険不明では候補を隠す", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requested: string[] = [];
  await page.route("**/api/goods-products?*", async (route) => {
    requested.push(route.request().url());
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "no_qualified_items", items: [], checkedAt: "2026-09-25T00:00:00.000Z" }) });
  });
  await page.goto("/goods");
  await page.getByRole("button", { name: "呼吸用保護具", exact: true }).click();
  await page.getByRole("button", { name: /物質・酸素濃度が不明/u }).click();
  await expect(page.getByRole("status").filter({ hasText: /対象の物質や作業条件が分かるまで、商品候補は表示しません/u })).toBeVisible();
  await expect(page.getByRole("list", { name: "実商品写真を左右にスライド" })).toHaveCount(0);
  expect(requested).toHaveLength(0);
  await page.getByRole("button", { name: "特徴を選び直す" }).click();
  await page.getByRole("region", { name: "呼吸用保護具の商品候補" }).getByRole("button", { name: /粉じん/u }).click();
  await expect.poll(() => requested.some((url) => url.includes("category=respiratory&feature=dust"))).toBe(true);
  await page.getByRole("button", { name: "用品一覧に戻る" }).click();
  await page.getByRole("button", { name: "墜落制止用器具", exact: true }).click();
  await page.getByRole("region", { name: "墜落制止用器具の商品候補" }).getByRole("button", { name: /フルハーネス/u }).click();
  await expect.poll(() => requested.some((url) => url.includes("category=fall-protection&feature=harness"))).toBe(true);
  await page.getByRole("button", { name: "用品一覧に戻る" }).click();
  await page.getByRole("button", { name: "目・顔面の保護具", exact: true }).click();
  await page.getByRole("region", { name: "目・顔面の保護具の商品候補" }).getByRole("button", { name: /飛来物・粉じん/u }).click();
  await expect.poll(() => requested.some((url) => url.includes("category=eye-face-protection&feature=impact"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
