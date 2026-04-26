import { test, expect } from "@playwright/test";

test.describe("チャットボット", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/chatbot");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("テキスト入力エリアが存在する", async ({ page }) => {
    await page.goto("/chatbot");
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
  });

  test("入力エリアにプレースホルダーが表示される", async ({ page }) => {
    await page.goto("/chatbot");
    const textarea = page.locator("textarea");
    await expect(textarea).toHaveAttribute("placeholder", /安衛法/);
  });

  test("送信ボタンが存在する", async ({ page }) => {
    await page.goto("/chatbot");
    // 送信ボタン（disabled状態でも存在すること）
    const submitButton = page.locator("button[type='submit'], button:has(svg)").last();
    await expect(submitButton).toBeAttached();
  });
});
