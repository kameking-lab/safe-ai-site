import { test, expect } from "@playwright/test";

test.describe("料金プラン", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/pricing");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("プラン一覧が表示される", async ({ page }) => {
    await page.goto("/pricing");
    // PAID_MODE=false の場合、準備中ページが表示される
    await expect(page.getByRole("heading", { name: /料金プランは現在準備中/ })).toBeVisible();
  });

  test("料金が表示される", async ({ page }) => {
    await page.goto("/pricing");
    // PAID_MODE=false の場合、全機能無料の説明が表示される
    await expect(page.getByText(/研究・実証プロジェクト/).first()).toBeVisible();
  });

  test("CTAボタンが存在する", async ({ page }) => {
    await page.goto("/pricing");
    // 準備中UIのナビゲーションリンクが存在する
    const ctaButtons = page.getByRole("link", { name: /機能を試す|ご意見/ });
    await expect(ctaButtons.first()).toBeVisible();
  });
});
