import { test, expect } from "@playwright/test";

test.describe("料金プラン", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/pricing");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("プラン一覧が表示される", async ({ page }) => {
    await page.goto("/pricing");
    // 5つのプラン（無料・スタンダード・プロ・ビジネス・受託）が存在する
    await expect(page.getByText("無料")).toBeVisible();
    await expect(page.getByText(/スタンダード/)).toBeVisible();
    await expect(page.getByText(/プロ/)).toBeVisible();
  });

  test("料金が表示される", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("¥0")).toBeVisible();
    await expect(page.getByText(/¥980/)).toBeVisible();
  });

  test("CTAボタンが存在する", async ({ page }) => {
    await page.goto("/pricing");
    // プランのCTAボタンが複数あること
    const ctaButtons = page.getByRole("link", { name: /無料|申し込む|お問い合わせ|始める/ });
    await expect(ctaButtons.first()).toBeVisible();
  });
});
