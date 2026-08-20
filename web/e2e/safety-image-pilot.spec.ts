import { expect, test } from "@playwright/test";

const path = "/materials/safety-images/pilot/helmet-required";

test.describe("safety image pilot comparison", () => {
  test("works at 320, 390, 768 and 1440 pixels without asset or console failures", async ({ page }) => {
    const consoleErrors: string[] = [];
    const assetFailures: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (
        (response.url().includes("/safety-images/") ||
          response.url().includes("/api/safety-images/")) &&
        response.status() >= 400
      ) {
        assetFailures.push(`${response.status()} ${response.url()}`);
      }
    });

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1, name: "文字の作り方を比較" })).toBeVisible();
      await expect(page.getByRole("img", { name: /後付け表示/ })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      if (width < 1024) {
        await page.getByRole("tab", { name: "B 画像内文字" }).click();
        await expect(page.getByRole("img", { name: /画像生成時に直接/ })).toBeVisible();
        await page.getByRole("tab", { name: "A 後付け文字" }).click();
      } else {
        await expect(page.getByRole("img", { name: /画像生成時に直接/ })).toBeVisible();
      }
    }

    expect(consoleErrors).toEqual([]);
    expect(assetFailures).toEqual([]);
  });

  test("switches language, brand and download method with keyboard-accessible controls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "English" }).focus();
    await expect(page.getByRole("button", { name: "English" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("img", { name: /WEAR A SAFETY HELMET/ })).toBeVisible();
    await page.getByRole("button", { name: "なし", exact: true }).click();
    await expect(page.getByLabel("ブランド表示：安全AIポータル")).toHaveCount(0);
    await page.getByRole("tab", { name: "B 画像内文字" }).click();
    await expect(page.getByRole("heading", { name: "方式B・比較用をダウンロード" })).toBeVisible();
    await expect(page.getByRole("link", { name: "A4縦 JPEG" })).toHaveAttribute(
      "href",
      /variant=b.*lang=all.*brand=clean.*paper=A4.*format=jpeg/,
    );
  });

  test("reflows at 400 percent zoom", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(path, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      document.documentElement.style.zoom = "4";
    });
    await expect(page.getByRole("tab", { name: "A 後付け文字" })).toBeVisible();
    await expect(page.getByRole("button", { name: "日本語" })).toBeVisible();
    await expect(page.getByRole("link", { name: "A4縦 JPEG" })).toBeVisible();
  });

  test("keeps the recommended A version and normal download links without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("A 後付け文字版")).toBeVisible();
    await expect(page.getByRole("link", { name: "A4縦 JPEG" })).toHaveAttribute(
      "href",
      /variant=a.*lang=all.*brand=branded/,
    );
    await expect(page.getByText(/JavaScriptなしでは推奨の方式A/)).toBeVisible();
    await context.close();
  });

  test("keeps method B noindex while the approved method A library is indexable", async ({ request, page }) => {
    for (const formalPath of [
      "/materials/safety-images/helmet-required",
      "/materials/safety-images/scaffold-work-illustration",
      "/materials/safety-images/category/safety-signs",
    ]) {
      const response = await request.get(formalPath);
      expect(response.status(), formalPath).toBe(200);
    }

    const sitemap = await request.get("/sitemap.xml");
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain("/materials/safety-images/helmet-required");
    expect(sitemapText).not.toContain("/materials/safety-images/pilot/helmet-required");

    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex,\s*follow/i,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/materials\/safety-images\/pilot\/helmet-required$/,
    );
  });
});
