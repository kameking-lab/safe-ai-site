import { expect, test } from "@playwright/test";

test.describe("リニューアルトップのチワワ", () => {
  test("320〜1440pxでv4ヒーローを表示し横溢れしない", async ({ page }) => {
    for (const width of [320, 390, 720, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "networkidle" });
      const mascot = page.getByAltText(
        "吹き出しと一緒に相談を案内する安全AIポータルのチワワ",
      );
      await expect(mascot).toBeVisible();
      expect(await mascot.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain(
        "mascot-chat-talk-v4.webp",
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    }
  });

  test("forced colorsとreduced motionでも主操作を利用できる", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/");
    const primaryAction = page.getByRole("link", { name: "安衛法AIを開く" });
    await expect(primaryAction).toBeVisible();
    await primaryAction.focus();
    await expect(primaryAction).toBeFocused();
  });

  test("画像読み込み失敗時も目的と次の操作を残す", async ({ page }) => {
    await page.route(/\.(?:avif|gif|jpe?g|png|webp)(?:\?.*)?$/i, (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("大きな事故を防ぐ。");
    await expect(page.getByRole("link", { name: "安衛法AIを開く" })).toBeVisible();
  });
});
