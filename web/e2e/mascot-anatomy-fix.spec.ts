import { expect, test } from "@playwright/test";

const HOME_MASCOT_SELECTOR = 'img[src*="mascot-chat-talk-v4.webp"]:visible';

test.describe("チワワが案内するコンパクトホーム", () => {
  test("320〜1440pxと200%・400%相当幅でチワワと9機能を横にはみ出さず表示する", async ({ page }) => {
    for (const width of [320, 390, 720, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      const mascot = page.locator(HOME_MASCOT_SELECTOR).first();
      await expect(mascot).toBeVisible();
      await expect(mascot).toHaveJSProperty("complete", true);
      expect(await mascot.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      await expect(mascot).not.toHaveAttribute("loading", "lazy");
      const box = await mascot.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      const services = page.getByRole("region", { name: "仕事から選ぶ、9つの主機能" });
      await expect(services.getByRole("listitem")).toHaveCount(9);
      await expect(services.getByRole("img")).toHaveCount(9);
      await expect(page.getByRole("region", { name: "チワワと試す5機能" }).locator("article h2 a")).toHaveCount(5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    }
  });

  test("keyboard、forced colors、reduced motionでも主操作を利用できる", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/");
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);

    const mascotTools = page.getByRole("region", { name: "チワワと試す5機能" });
    const primaryAction = mascotTools.getByRole("link", { name: "安衛法AI", exact: true });
    await expect(primaryAction).toBeVisible();
    await primaryAction.focus();
    await expect(primaryAction).toBeFocused();
    const chemicalAction = mascotTools.getByRole("link", { name: "化学物質RA", exact: true });
    await chemicalAction.focus();
    await expect(chemicalAction).toBeFocused();
    const netisAction = page.getByRole("link", { name: "安全技術を探す" });
    await netisAction.focus();
    await expect(netisAction).toBeFocused();
    await primaryAction.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/chatbot$/);
    await expect(page.getByLabel("質問入力")).toBeVisible();
  });

  test("画像読み込み失敗時も案内文と9機能への通常リンクを残す", async ({ page }) => {
    await page.route("**/*", (route) => route.request().resourceType() === "image" ? route.abort() : route.continue());
    await page.goto("/");

    const mascot = page.locator(HOME_MASCOT_SELECTOR).first();
    await expect(mascot).toHaveJSProperty("complete", true);
    await expect(mascot).toHaveJSProperty("naturalWidth", 0);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /小さな気づきが、\s*大きな事故を防ぐ。/u,
      }),
    ).toBeVisible();
    const services = page.getByRole("region", { name: "仕事から選ぶ、9つの主機能" });
    await expect(services.getByRole("heading", { level: 3 })).toHaveCount(9);
    await expect(services.locator("ul > li > a")).toHaveCount(9);
    const primaryAction = page.getByRole("region", { name: "チワワと試す5機能" }).getByRole("link", { name: "安衛法AI", exact: true });
    await primaryAction.click();
    await expect(page).toHaveURL(/\/chatbot$/);
    await expect(page.getByLabel("質問入力")).toBeVisible();
  });

  test("JavaScript無効でもチワワの説明と主操作を利用できる", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
    try {
      const page = await context.newPage();
      await page.goto("/");
      await expect(page.locator(HOME_MASCOT_SELECTOR).first()).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: /小さな気づきが、\s*大きな事故を防ぐ。/u,
        }),
      ).toBeVisible();
      await expect(page.getByRole("region", { name: "チワワと試す5機能" }).locator("article h2 a")).toHaveCount(5);
      await expect(page.getByRole("region", { name: "仕事から選ぶ、9つの主機能" }).locator("ul > li > a")).toHaveCount(9);
      const fallbackNav = page.getByRole("navigation", { name: "JavaScriptなしで利用できる機能" });
      await expect(fallbackNav.getByRole("link", { name: "安衛法AI", exact: true })).toHaveAttribute("href", "/chatbot");
      await expect(fallbackNav.getByRole("link", { name: "化学物質RA", exact: true })).toHaveAttribute("href", "/chemical-ra");
      await expect(page.locator('[data-home-section="heat"]')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
