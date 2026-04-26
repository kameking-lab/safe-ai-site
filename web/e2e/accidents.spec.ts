import { test, expect } from "@playwright/test";

test.describe("事故データベース", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/accidents");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("タブナビゲーションが存在する", async ({ page }) => {
    await page.goto("/accidents");
    // タブボタンの存在確認
    const tabButtons = page.getByRole("button", { name: /全件検索|死亡災害|業種別ランキング|MHLW|サイト収録事例|詳細事例/ });
    await expect(tabButtons.first()).toBeVisible();
  });

  test("タブ切り替えができる", async ({ page }) => {
    await page.goto("/accidents");
    // 「業種別ランキング」タブをクリック
    const industryTab = page.getByRole("button", { name: "業種別ランキング" });
    await expect(industryTab).toBeVisible();
    await industryTab.click();
    // クリック後もページが正常に表示されていること
    await expect(page.locator("body")).toBeVisible();
  });

  test("サイト収録事例タブが表示される", async ({ page }) => {
    await page.goto("/accidents");
    const listTab = page.getByRole("button", { name: /サイト収録事例/ });
    await expect(listTab).toBeVisible();
    await listTab.click();
    await expect(page.locator("body")).toBeVisible();
  });
});
