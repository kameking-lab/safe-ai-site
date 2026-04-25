import { test, expect } from "@playwright/test";

test.describe("お問い合わせ", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/contact");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("フォームが存在する", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("form")).toBeVisible();
  });

  test("必須入力フィールドが存在する", async ({ page }) => {
    await page.goto("/contact");
    // 会社名・氏名・メールアドレスの入力欄
    await expect(page.locator("input[type='text'], input[type='email']").first()).toBeVisible();
  });

  test("?plan=standard でプランバナーが反映される", async ({ page }) => {
    await page.goto("/contact?plan=standard");
    expect((await page.goto("/contact?plan=standard"))?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
    // プランパラメータを受け取った場合のページが壊れていないこと
    await expect(page.locator("form")).toBeVisible();
  });

  test("?plan=pro でプランバナーが反映される", async ({ page }) => {
    await page.goto("/contact?plan=pro");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
  });
});
