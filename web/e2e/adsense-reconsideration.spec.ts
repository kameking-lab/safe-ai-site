import { expect, test } from "@playwright/test";

// この限定検証はローカルサーバーだけを使い、広告・計測等の外部通信を送らない。
test.beforeEach(async ({ context }) => {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      await route.continue();
    } else {
      await route.abort("blockedbyclient");
    }
  });
});

test("@smoke 法令AIは低い画面でも入力欄を使える", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/chatbot");
  await expect(page.getByText("作業の言葉から、関連する条文と確認条件を探せます。", { exact: true })).toBeVisible();
  const input = page.locator("[data-chatbot-composer] textarea");
  await input.scrollIntoViewIfNeeded();
  await input.fill("足場の手すりは？");
  await expect(input).toHaveValue("足場の手すりは？");
  const contained = await input.evaluate((element) => {
    const frame = element.closest("[data-chatbot-client]")!.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return rect.height >= 32 && rect.top >= frame.top - 1 && rect.bottom <= frame.bottom + 1;
  });
  expect(contained).toBe(true);
});

test("@smoke 評価ページは生成回答の機械チェックを現在の方式として示す", async ({ page }) => {
  await page.goto("/about/chatbot-eval");
  await expect(page.getByText(/現在の提供方式：/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "生成回答の自作機械チェック（限定セット）" })).toBeVisible();
});

for (const width of [375, 1280]) {
  test(`@smoke 化学DBは未収録詳細へ誘導せず掲載情報を残す（${width}px）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    for (const cas of ["141-90-2", "28553-12-0", "13598-36-2"]) {
      await page.goto(`/chemical-database?q=${cas}`);
      await expect(page.getByRole("searchbox", { name: "物質名・CAS番号で検索" })).toHaveValue(cas);
      const result = width < 768
        ? page.locator(`[data-chemical-mobile-card][data-cas="${cas}"]`)
        : page.getByRole("row", { name: new RegExp(cas) });
      await expect(result).toBeVisible();
      await expect(result.getByText(/詳細未収録/)).toBeVisible();
      await expect(page.locator(`a[href="/chemical-database/${cas}"]`)).toHaveCount(0);
      await expect(page.getByRole("link", { name: "厚労省の対象物質一覧" })).toBeVisible();
    }
  });
}
