import { expect, test } from "@playwright/test";

const hubPath = "/materials/safety-images";
const detailPath = "/materials/safety-images/helmet-required";

test.describe("formal safety image library", () => {
  test("shows 100 generated themes with search, filters and progressive loading", async ({ page }) => {
    await page.goto(hubPath, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1, name: "安全掲示・イラスト倉庫" })).toBeVisible();
    await expect(page.getByText("安全AIポータル新規制作・公開中100点")).toBeVisible();
    await expect(page.getByText("検索結果 100点")).toBeVisible();
    await expect(page.getByRole("button", { name: /次の20点を表示/ })).toBeVisible();

    const search = page.getByRole("searchbox", { name: "安全画像をキーワード検索" });
    await search.fill("酸欠");
    await expect(page.getByText("検索結果 1点")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "酸欠注意" })).toBeVisible();
    await search.fill("");
    await page.getByRole("button", { name: "施工計画・報告書" }).click();
    await expect(page.getByText("検索結果 20点")).toBeVisible();
    await page.getByRole("button", { name: "すべて" }).click();
    await expect(page.getByText("検索結果 100点")).toBeVisible();
  });

  test("edits text, languages, visual settings, brand and numeric fields", async ({ page }) => {
    await page.goto(detailPath, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1, name: "保護帽を着用" })).toBeVisible();
    await expect(page.getByRole("link", { name: "そのままダウンロード" })).toHaveAttribute("href", /mode=default.*lang=ja.*brand=branded/u);
    const preset = page.getByLabel("言語プリセット");
    await preset.selectOption("en");
    const text = page.getByLabel("表示する文字");
    await expect(text).toHaveValue("Wear a safety helmet");
    await text.fill("CHECK HELMET BEFORE ENTRY");
    await expect(page.locator("div").filter({ hasText: /^CHECK HELMET BEFORE ENTRY$/u }).first()).toBeVisible();
    await page.getByLabel("チワワ・©").uncheck();
    await expect(page.getByAltText("安全AIポータルのチワワ")).toHaveCount(0);
    await page.getByRole("checkbox", { name: "背景帯", exact: true }).uncheck();
    await page.getByRole("button", { name: "元に戻す" }).click();
    await expect(text).toHaveValue("保護帽を着用");
    await expect(page.getByLabel("チワワ・©")).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "背景帯", exact: true })).toBeChecked();
    await expect(page.getByLabel("3. 編集した文字入り")).toBeVisible();
    await expect(page.getByRole("button", { name: "A4縦・推奨" })).toBeVisible();
    await expect(page.getByRole("button", { name: "A3横" })).toBeVisible();
  });

  test("has no horizontal overflow, console error or asset failure at target widths", async ({ page }) => {
    const consoleErrors: string[] = [];
    const assetFailures: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (
        (response.url().includes("/safety-images/") || response.url().includes("/api/safety-images/")) &&
        response.status() >= 400
      ) {
        assetFailures.push(`${response.status()} ${response.url()}`);
      }
    });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      await page.goto(width === 320 || width === 768 ? hubPath : detailPath, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px horizontal overflow`).toBeLessThanOrEqual(1);
    }
    expect(consoleErrors).toEqual([]);
    expect(assetFailures).toEqual([]);
  });

  test("keeps controls keyboard accessible and usable at 400 percent zoom", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(detailPath, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: "文字を編集" }).focus();
    await expect(page.getByRole("link", { name: "文字を編集" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("表示する文字")).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.zoom = "4";
    });
    await expect(page.getByLabel("言語プリセット")).toBeVisible();
    await expect(page.getByRole("heading", { name: "ダウンロード" })).toBeVisible();
  });

  test("provides clean and print links without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(detailPath, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "保護帽を着用" })).toBeVisible();
    await expect(page.getByText("JavaScriptなしで利用する")).toBeVisible();
    await expect(page.getByRole("link", { name: "文字なし画像" })).toHaveAttribute("href", /\/safety-images\/library\/originals\/helmet-required\.png$/u);
    await expect(page.getByRole("link", { name: "A4印刷用PDF" })).toHaveAttribute("href", /format=pdf/u);
    await expect(page.getByRole("link", { name: "印刷用HTML" })).toHaveAttribute("href", /\/print$/u);
    await context.close();
  });

  test("indexes only canonical formal pages and keeps the B comparison noindex", async ({ page, request }) => {
    await page.goto(detailPath);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index,\s*follow/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${detailPath}$`));
    const sitemapText = await (await request.get("/sitemap.xml")).text();
    expect(sitemapText).toContain(detailPath);
    expect(sitemapText).toContain("/materials/safety-images/category/construction-illustrations");
    expect(sitemapText).not.toContain("/materials/safety-images/pilot/helmet-required");
    expect(sitemapText).not.toContain("/print");
  });
});
