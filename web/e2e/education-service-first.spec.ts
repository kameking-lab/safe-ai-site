import { expect, test } from "@playwright/test";

const routes = ["/e-learning", "/education", "/education-certification"] as const;
const widths = [320, 390, 768, 1024, 1440] as const;

for (const route of routes) {
  for (const width of widths) {
    test(`${route} ${width}px keeps the task entry visible and warning-free`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(400);

      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const primary = page.locator('[data-primary-action="true"]');
      await expect(primary).toHaveCount(1);
      await expect(primary).toBeVisible();
      await expect(page.locator('main [data-warning-card], main [role="alert"]')).toHaveCount(0);

      const bodyWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(width);
    });
  }
}

test("education pages expose one usage-notes link and a keyboard reachable primary action", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").getByRole("link", { name: "注意事項", exact: true })).toHaveCount(1);
    await page.keyboard.press("Tab");
    const primary = page.locator('[data-primary-action="true"]');
    await primary.focus();
    await expect(primary).toBeFocused();
  }
});
