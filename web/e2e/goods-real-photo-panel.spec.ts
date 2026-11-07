import { expect, test, type Page } from "@playwright/test";


async function openDirectory(page: Page) {
  const summary = page.getByText("用品名が分かるときは、カテゴリから探す", { exact: true });
  if (!(await summary.locator("..").evaluate((element) => element.hasAttribute("open")))) await summary.click();
  await expect(page.getByRole("list", { name: "安全用品カテゴリの画像一覧" })).toBeVisible();
}

async function confirmQuestion(page: Page) {
  await page.getByRole("button", { name: /^(記録・資料で確認した|通常作業・救助用途ではない|担当者と照合・ろ過式を検討可能)/u }).click();
}

test("保護具カテゴリから実商品パネルを開き、取得不能を明示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/goods-products?category=head-protection&feature=fall", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "not_configured", items: [], checkedAt: null }) });
  });
  await page.goto("/goods");
  await openDirectory(page);
  await page.getByRole("button", { name: "保護帽", exact: true }).click();
  await expect(page.getByRole("heading", { name: "まず、必要な特徴を選ぶ" })).toBeVisible();
  await page.getByRole("button", { name: /墜落時の頭部保護/u }).click();
  await expect(page.getByRole("heading", { name: "保護帽の商品データ" })).toBeVisible();
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
  await openDirectory(page);
  await page.getByRole("button", { name: "保護帽", exact: true }).click();
  await page.getByRole("button", { name: /墜落時の頭部保護/u }).click();
  const products = page.getByRole("list", { name: "実商品写真を左右にスライド" });
  await expect(products.getByRole("img", { name: /作業用ヘルメット 型番Aの商品写真/u })).toHaveAttribute("src", /thumbnail\.image\.rakuten\.co\.jp/u);
  await expect.poll(() => products.getByRole("img", { name: /作業用ヘルメット 型番Aの商品写真/u }).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(products.getByText("★4.6")).toBeVisible();
  await expect(products.getByRole("link", { name: /販売店で写真・仕様を確認/u })).toHaveAttribute("href", "https://item.rakuten.co.jp/shop/helmet-1/");
});

test("API画像が読み込めないときは写真を表示済みと見なさない", async ({ page }) => {
  await page.route("https://thumbnail.image.rakuten.co.jp/**", async (route) => route.abort());
  await page.route("**/api/goods-products?*", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "ready", checkedAt: "2026-09-25T00:00:00.000Z", items: [{ id: "shop:helmet-1", name: "保護帽", imageUrl: "https://thumbnail.image.rakuten.co.jp/helmet.jpg", rating: 4.6, reviewCount: 34, affiliateUrl: "https://item.rakuten.co.jp/shop/helmet-1/" }] }) });
  });
  await page.goto("/goods?category=head-protection&feature=fall");
  await expect(page.getByText(/写真を読み込めませんでした/u)).toBeVisible();
  await expect(page.getByRole("link", { name: /販売店で写真・仕様を確認/u })).toHaveAttribute("href", "https://item.rakuten.co.jp/shop/helmet-1/");
});


test("保護具9入口と補助用品8分類を選べ、戻る・再読込で現在位置を保つ", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/goods-products?*", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "not_configured", items: [], checkedAt: null }) });
  });
  await page.goto("/goods");
  await openDirectory(page);
  const directory = page.getByRole("list", { name: "安全用品カテゴリの画像一覧" });
  await expect(directory.getByRole("button")).toHaveCount(9);
  await page.screenshot({ path: testInfo.outputPath("ppe-categories-390.png"), fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: testInfo.outputPath("ppe-categories-1440.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "現場の補助用品 8" }).click();
  await expect(directory.getByRole("button")).toHaveCount(8);
  await page.getByRole("button", { name: "すべて 17" }).click();
  await expect(directory.getByRole("button")).toHaveCount(17);
  await page.getByRole("button", { name: "身につける保護具 9" }).click();
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
  await expect(page.getByRole("heading", { name: "保護帽の商品データ" })).toBeVisible();
  await page.getByRole("button", { name: "用品一覧に戻る" }).click();
  await expect(directory).toBeVisible();
  await expect(helmet).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("NETISの給気式直リンクでは商品・通販を表示しない", async ({ page }) => {
  await page.goto("/goods?category=respiratory&intent=supplied&feature=supplied");
  await expect(page.getByRole("heading", { name: "どんな作業ですか？" })).toBeVisible();
  await page.getByRole("button", { name: /^マンホール・槽・ピット/u }).click();
  await page.getByRole("button", { name: "未確認のまま確認事項を見る", exact: true }).click();
  await expect(page.getByText(/槽・ピット等では酸欠・有害ガスのおそれ/u)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /不足条件が確認できるまで、商品候補は表示しません/u })).toBeVisible();
  await expect(page.getByRole("link", { name: /Amazonで一般検索|楽天で一般検索/u })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "実商品写真を左右にスライド" })).toHaveCount(0);
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

test("呼吸・墜落は必要条件を順に確認し、危険不明では検索・商品を隠す", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requested: string[] = [];
  await page.route("**/api/goods-products?*", async (route) => {
    requested.push(route.request().url());
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "no_qualified_items", items: [], checkedAt: "2026-09-25T00:00:00.000Z" }) });
  });
  await page.goto("/goods");
  await openDirectory(page);
  await page.getByRole("button", { name: /防じんマスク/u }).click();
  await page.getByRole("button", { name: /^粉じん・研削・清掃/u }).click();
  await page.getByRole("button", { name: /^換気が効いている/u }).click();
  await confirmQuestion(page);
  await confirmQuestion(page);
  await expect(page.getByRole("heading", { name: "濃度と必要な防護性能を確認しましたか？" })).toBeVisible();
  await page.getByRole("button", { name: /^分からない・未確認/u }).click();
  await page.getByRole("button", { name: "未確認のまま確認事項を見る", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /不足条件が確認できるまで/u })).toBeVisible();
  await expect(page.getByRole("list", { name: "実商品写真を左右にスライド" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Amazonで一般検索|楽天で一般検索/u })).toHaveCount(0);
  expect(requested).toHaveLength(0);
  await page.getByText("回答を確認する・変更する", { exact: true }).click();
  await page.getByRole("button", { name: /^濃度と必要な防護性能を確認しましたか？/u }).click();
  for (let i = 0; i < 5; i++) await confirmQuestion(page);
  await expect(page.getByRole("heading", { name: "防じんマスクの種類を検討" })).toBeVisible();
  await expect(page.getByText("条件の整理が完了・適合の確認は別途必要", { exact: true })).toBeVisible();
  await expect(page.getByText(/国家検定合格標章とメーカー指定組合せ。/u)).toBeVisible();
  await page.getByText("種類に近い商品を一般検索する", { exact: true }).click();
  await expect(page.getByRole("link", { name: /Amazonで一般検索/u })).toHaveAttribute("href", /amazon\.co\.jp/u);
  expect(requested).toHaveLength(0);
  await page.getByRole("button", { name: "用品一覧に戻る", exact: true }).click();
  await expect(page.getByRole("list", { name: "安全用品カテゴリの画像一覧" })).toBeVisible();
  await page.getByRole("button", { name: "墜落制止用器具", exact: true }).click();
  await page.getByRole("button", { name: /^足場・屋根・高所/u }).click();
  await page.getByRole("button", { name: /^取付設備がある/u }).click();
  for (const name of ["身長・体格に合うサイズですか？", "体重＋装備の質量を照合しましたか？", "落下しても下の床・障害物に届きませんか？", "取付点と器具の組合せを照合しましたか？", "始業前点検と救助方法を決めましたか？"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await confirmQuestion(page);
  }
  await expect(page.getByText(/体重＋装備が使用可能質量以内/u)).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "始業前点検と救助方法を決めましたか？" })).toBeVisible();
  await page.getByRole("button", { name: /^分からない・未確認/u }).click();
  await expect(page.getByText("選定を保留・確認が必要", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Amazonで一般検索|楽天で一般検索/u })).toHaveCount(0);
  expect(requested).toHaveLength(0);
  await page.getByRole("button", { name: "用品一覧に戻る", exact: true }).click();
  await page.getByRole("button", { name: "目・顔面の保護具", exact: true }).click();
  await page.getByRole("region", { name: "目・顔面の保護具の商品候補" }).getByRole("button", { name: /飛来物・粉じん/u }).click();
  await expect.poll(() => requested.some((url) => url.includes("category=eye-face-protection&feature=impact"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("薬液ゴーグルの直接URLと用品操作は化学条件を迂回できない", async ({ page }) => {
  const requested: string[] = [];
  await page.route("**/api/goods-products?*", async route => { requested.push(route.request().url()); await route.abort(); });
  await page.goto("/goods?category=eye-face-protection&feature=splash");
  await expect(page.getByRole("heading", { name: "どんな作業ですか？" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Amazonで一般検索|楽天で一般検索/u })).toHaveCount(0);
  await page.getByRole("button", { name: "用品一覧に戻る", exact: true }).click();
  await expect(page.getByRole("list", { name: "安全用品カテゴリの画像一覧" })).toBeVisible();
  await page.getByRole("button", { name: "目・顔面の保護具", exact: true }).click();
  await page.getByRole("button", { name: /^薬液の飛散/u }).click();
  await expect(page.getByRole("heading", { name: "どんな作業ですか？" })).toBeVisible();
  await page.getByRole("button", { name: /^薬液の飛散・注入/u }).click();
  await page.getByRole("button", { name: /^SDSが手元にある/u }).click();
  await page.getByRole("button", { name: "未確認のまま確認事項を見る", exact: true }).click();
  await expect(page.getByText("選定を保留・確認が必要", { exact: true })).toBeVisible();
  await expect(page.getByText(/手袋はJIS T 8116の耐透過・耐浸透性を確認/u)).toBeVisible();
  await expect(page.getByRole("link", { name: /Amazonで一般検索|楽天で一般検索/u })).toHaveCount(0);
  expect(requested).toHaveLength(0);
});
