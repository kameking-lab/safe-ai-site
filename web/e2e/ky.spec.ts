import { test, expect } from "@playwright/test";

test.describe("KY用紙", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/ky");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("HowTo 構造化データが埋め込まれている（SEO）", async ({ page }) => {
    await page.goto("/ky");
    const ldJsonScripts = page.locator('script[type="application/ld+json"]');
    const count = await ldJsonScripts.count();
    expect(count).toBeGreaterThan(0);

    // いずれかの script が HowTo であること
    const allTexts = await ldJsonScripts.allTextContents();
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
    expect(types).toContain("HowTo");
  });

  test("関連機能リンクが少なくとも1つ表示される", async ({ page }) => {
    await page.goto("/ky");
    await page.waitForLoadState("networkidle");
    // 少なくとも accidents/risk-prediction/safety-diary のいずれかへのリンクがある
    const linkCount = await page
      .locator('a[href="/accidents"], a[href="/risk-prediction"], a[href="/safety-diary"]')
      .count();
    expect(linkCount).toBeGreaterThan(0);
  });
});
