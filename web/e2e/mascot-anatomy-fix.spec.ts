import { expect, test } from "@playwright/test";

const REMOVED_HOME_MASCOT =
  '[data-home-section="heat"] img[alt="麦わら帽子をかぶった安全AIポータルのチワワ"]';

test.describe("圧縮後の熱中症案内", () => {
  test("320〜1440pxと200%・400%相当幅で装飾画像を再追加せず、実情報を優先する", async ({
    page,
  }) => {
    for (const width of [320, 390, 720, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      await expect(page.locator(REMOVED_HOME_MASCOT)).toHaveCount(0);
      await expect(page.locator("[data-heat-status]")).toBeVisible();
      await expect(page.getByText("WBGT / 暑さ指数", { exact: true })).toBeVisible();
      await expect(page.locator("[data-home-heat-slide-deck]")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ),
      ).toBe(false);
    }
  });

  test("keyboard、forced colors、reduced motionでも主操作を利用できる", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.setExtraHTTPHeaders({
      "x-vercel-ip-country": "JP",
      "x-vercel-ip-country-region": "13",
    });
    await page.goto("/");

    const primaryAction = page.locator(
      '[data-home-section="heat"] details[data-home-area-picker] > summary',
    );
    await expect(primaryAction).toBeVisible();
    await expect(primaryAction).toHaveText("地域・観測情報");
    await primaryAction.focus();
    await expect(primaryAction).toBeFocused();
  });

  test("画像読み込み失敗時も現在値と次の操作を残す", async ({ page }) => {
    await page.route(/\.(?:avif|gif|jpe?g|png|webp)(?:\?.*)?$/i, (route) =>
      route.abort(),
    );
    await page.setExtraHTTPHeaders({
      "x-vercel-ip-country": "JP",
      "x-vercel-ip-country-region": "13",
    });
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "今日の熱中症リスク",
      }),
    ).toBeVisible();
    await expect(page.locator('[data-home-section="heat"] [data-heat-status]')).toBeVisible();
    await expect(
      page.locator(
        '[data-home-section="heat"] details[data-home-area-picker] > summary',
      ),
    ).toBeVisible();
  });

  test("JavaScript無効でも現在値と主操作を利用できる", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: { width: 390, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.locator(REMOVED_HOME_MASCOT)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 1, name: "今日の熱中症リスク" }),
    ).toBeVisible();
    await expect(page.locator('[data-home-section="heat"] [data-heat-status]')).toBeVisible();
    await expect(page.getByText("WBGT / 暑さ指数", { exact: true })).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "JavaScriptなしで利用できる機能" })
        .getByRole("link", { name: "熱中症スライド" }),
    ).toHaveAttribute("href", "/heat-illness-prevention/slides");
    await expect(page.getByText("地域未特定のため数値を推測しません")).toHaveCount(0);
    await context.close();
  });
});
