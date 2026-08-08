import { expect, test } from "@playwright/test";

test.describe("construction calculator URL privacy", () => {
  test("public calculator links use fixed routes", async ({ page }) => {
    await page.goto("/construction-calc");

    const hrefs = await page
      .locator('main a[href^="/construction-calc/"]')
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).getAttribute("href")),
      );

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).not.toContain("?");
      expect(href).not.toContain("#");
    }
  });

  test("entered dimensions stay out of URLs and explanation requests", async ({
    page,
  }) => {
    const marker = "12.75";
    const requestedUrls: string[] = [];
    page.on("request", (request) => requestedUrls.push(request.url()));
    await page.route("**/api/construction-calc", async (route) => {
      const request = route.request();
      expect(request.method()).toBe("PUT");
      expect(new URL(request.url()).search).toBe("");
      expect(request.postDataJSON()).toMatchObject({
        slug: "concrete-volume",
        values: { lengthDim: 12.75, widthDim: 8.25, heightDim: 0.4 },
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          explanation: "入力された値から定型説明を作成しました。",
        }),
      });
    });

    await page.goto("/construction-calc/concrete-volume");
    await page.locator("#calc-field-lengthDim").fill(marker);
    await page.locator("#calc-field-widthDim").fill("8.25");
    await page.locator("#calc-field-heightDim").fill("0.4");

    expect(new URL(page.url()).search).toBe("");
    await page
      .getByRole("button", { name: "計算結果と式を文章で表示" })
      .click();
    await expect(
      page.getByText("入力された値から定型説明を作成しました。"),
    ).toBeVisible();

    for (const requestedUrl of requestedUrls) {
      expect(new URL(requestedUrl).searchParams.toString()).not.toContain(
        marker,
      );
    }
  });
});
