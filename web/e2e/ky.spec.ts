import { test, expect } from "@playwright/test";

test.describe("KY用紙（Phase 7: /ky → /ky/paper 一本化）", () => {
  test("/ky は /ky/paper にリダイレクトされ表示される @smoke", async ({ page }) => {
    const res = await page.goto("/ky");
    expect(res?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/ky\/paper\/?$/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("HowTo 構造化データが埋め込まれている（SEO）", async ({ page }) => {
    await page.goto("/ky/paper");
    const ldJsonScripts = page.locator('script[type="application/ld+json"]');
    const count = await ldJsonScripts.count();
    expect(count).toBeGreaterThan(0);

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

  test("KY関連機能（作業員マスター/サイネージ）へのリンクがある", async ({ page }) => {
    await page.goto("/ky/paper");
    await page.waitForLoadState("networkidle");
    const linkCount = await page
      .locator('a[href="/ky/workers"], a[href="/ky/morning"]')
      .count();
    expect(linkCount).toBeGreaterThan(0);
  });
});
