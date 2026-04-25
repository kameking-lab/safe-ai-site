import { test, expect } from "@playwright/test";

// TODO: タスク6（資格試験クイズ機能）完了後に test.skip を外すこと
test.describe("資格試験クイズ @smoke", () => {
  test.skip(true, "タスク6完了後に有効化: /certification-quiz ページ実装待ち");

  test("/certification-quiz が表示される", async ({ page }) => {
    const res = await page.goto("/certification-quiz");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("クイズ問題が表示される", async ({ page }) => {
    await page.goto("/certification-quiz");
    await expect(page.locator("body")).toBeVisible();
  });
});

// 現行の /exam-quiz ページは動作確認済み
test("/exam-quiz ページが表示される", async ({ page }) => {
  const res = await page.goto("/exam-quiz");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator("body")).toBeVisible();
});
