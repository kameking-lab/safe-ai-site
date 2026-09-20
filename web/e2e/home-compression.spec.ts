import { expect, test } from "@playwright/test";

test.describe("リニューアルホームの表示予算", () => {
  test("390pxでヒーローと9カードを横溢れなく表示する", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("小さな気づきが、");
    await expect(page.locator('[aria-labelledby="main-services-title"] > div > ul > li')).toHaveCount(9);
    const metrics = await page.evaluate(() => ({
      overflow:
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
        document.documentElement.clientWidth,
      dom: document.querySelectorAll("*").length,
      screens: document.documentElement.scrollHeight / innerHeight,
    }));
    expect(metrics.overflow).toBe(0);
    expect(metrics.dom).toBeLessThanOrEqual(1_250);
    expect(metrics.screens).toBeLessThanOrEqual(16);
  });

  test("320pxでカードの導線を重複させず通常リンクを保つ", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });
    const serviceLinks = page.locator('[aria-labelledby="main-services-title"] > div > ul > li > a');
    await expect(serviceLinks).toHaveCount(9);
    const hrefs = await serviceLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    );
    expect(new Set(hrefs).size).toBe(9);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });

  test("初期HTMLとinline RSCを圧縮予算内に保つ", async ({ request }) => {
    const response = await request.get("/");
    const html = await response.text();
    const rscBytes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
      .filter((match) => match[1]?.includes("self.__next_f.push"))
      .reduce((total, match) => total + Buffer.byteLength(match[1] ?? "", "utf8"), 0);

    expect(Buffer.byteLength(html, "utf8")).toBeLessThanOrEqual(330_000);
    expect(rscBytes).toBeLessThanOrEqual(190_000);
  });
});
