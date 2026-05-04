import { test, expect } from "@playwright/test";

test.describe("化学物質RA", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/chemical-ra");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Dataset または SoftwareApplication 構造化データが含まれる", async ({ page }) => {
    await page.goto("/chemical-ra");
    const allTexts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const types = allTexts
      .map((t) => {
        try {
          const parsed = JSON.parse(t);
          return Array.isArray(parsed) ? parsed.map((p) => p["@type"]) : [parsed["@type"]];
        } catch {
          return [];
        }
      })
      .flat();
    // Dataset (RA データ) または SoftwareApplication (RA ツール) のいずれか
    const hasRelevant = types.some((t) =>
      ["Dataset", "SoftwareApplication"].includes(t as string),
    );
    expect(hasRelevant).toBe(true);
  });

  test("化学物質DB → リスクアセスメントへの相互導線が機能する", async ({ page }) => {
    await page.goto("/chemical-database");
    await page.waitForLoadState("networkidle");
    // /chemical-ra へのリンクが少なくとも1つ存在する
    const raLink = page.locator('a[href="/chemical-ra"]').first();
    await expect(raLink).toBeVisible({ timeout: 5000 });
  });
});
