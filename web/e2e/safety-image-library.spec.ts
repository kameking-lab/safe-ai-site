import { expect, test } from "@playwright/test";

const hubPath = "/materials/safety-images";

test.describe("safety sign library quarantine", () => {
  test("shows only the preparation notice and terms link", async ({ page }) => {
    const response = await page.goto(hubPath);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "安全看板を準備中" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "利用条件" })).toHaveAttribute(
      "href",
      "/materials/safety-images/terms",
    );
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByText(/100点/u)).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex,\s*follow/iu,
    );
  });

  test("removes old detail, category, pilot, download and sitemap URLs", async ({
    request,
  }) => {
    test.setTimeout(90_000);
    for (const route of [
      "/materials/safety-images/helmet-required",
      "/materials/safety-images/helmet-required/print",
      "/materials/safety-images/category/safety-signs",
      "/materials/safety-images/pilot/helmet-required",
    ]) {
      expect((await request.get(route)).status(), route).toBe(404);
    }
    expect(
      (
        await request.get("/api/safety-images/helmet-required/download")
      ).status(),
    ).toBe(410);
    expect(
      (
        await request.get("/api/safety-images/pilot/helmet-required/download")
      ).status(),
    ).toBe(410);
    const sitemapText = await (await request.get("/sitemap.xml")).text();
    expect(sitemapText).not.toContain(
      "/materials/safety-images/helmet-required",
    );
    expect(sitemapText).not.toContain("/materials/safety-images/category/");
    expect(sitemapText).not.toContain(
      "<loc>https://www.anzen-ai-portal.jp/materials/safety-images</loc>",
    );
    expect(sitemapText).not.toContain("/materials/safety-images/terms");
  });
});
