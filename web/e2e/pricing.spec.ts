import { test, expect } from "@playwright/test";

test.describe("旧料金ページの統合", () => {
  test("旧料金URLは現行の業務自動化サービスへ恒久転送する @smoke", async ({
    request,
  }) => {
    const response = await request.get("/pricing", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/services/automation");
  });

  test("転送後にサービスの主見出しが表示される", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/services\/automation$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /業務自動化・講習を\s*小さな一件から。/,
      }),
    ).toBeVisible();
  });

  test("税込の料金と条件を同じ画面で確認できる", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("#pricing [data-primary-pricing] > article")).toHaveCount(3);
    await expect(page.getByText("33,000〜88,000円").first()).toBeVisible();
    await expect(page.getByText("110,000〜440,000円").first()).toBeVisible();
    await page.locator("#pricing details").first().locator("summary").click();
    await expect(page.getByText(/大幅な仕様変更、現地作業/)).toBeVisible();
    await expect(page.getByText("見積前に費用は発生しません。", { exact: true })).toBeVisible();
  });

  test("受付状態と一致する相談CTAが存在する", async ({ page }) => {
    await page.goto("/pricing");
    const primary = page.locator("[data-primary-action]");
    await expect(primary).toBeVisible();
    await expect(primary).toHaveText(/Webフォームで相談する/);
  });
});
