import { expect, test } from "@playwright/test";

const HOME_MASCOT_SELECTOR = 'img[data-pet-static]';
const HOME_MASCOT_LABEL = "緑のヘルメットをかぶった安全わんこ";

test.describe("チワワが案内するコンパクトホーム", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("320〜1440pxと200%・400%相当幅でチワワと7つの道具を横にはみ出さず表示する", async ({ page }) => {
    for (const width of [320, 390, 720, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      const mascot = page.locator(HOME_MASCOT_SELECTOR).first();
      await expect(page.getByRole("img", { name: HOME_MASCOT_LABEL, exact: true })).toBeVisible();
      await expect(mascot).toBeVisible();
      await expect(mascot).toHaveJSProperty("complete", true);
      await expect.poll(() => mascot.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      // The approved mobile order places the optional mascot after direct tool links.
      await mascot.scrollIntoViewIfNeeded();
      const box = await mascot.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      const services = page.locator("#tools");
      await expect(services.locator("a[data-lp-tool]")).toHaveCount(7);
      await expect(services.getByRole("heading", { level: 3 })).toHaveCount(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    }
  });

  test("keyboard、forced colors、reduced motionでも主操作を利用できる", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.goto("/");
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);

    const mascotTools = page.locator("[data-home-lp]");
    const primaryAction = mascotTools.locator('[data-lp-tool][href="/chatbot"]');
    await expect(primaryAction).toBeVisible();
    await primaryAction.focus();
    await expect(primaryAction).toBeFocused();
    const chemicalAction = mascotTools.getByRole("navigation", { name: "すぐ使う道具" })
      .getByRole("link", { name: /化学物質RA準備/u });
    await expect(chemicalAction).toHaveAttribute("href", "/chemical-ra");
    await chemicalAction.focus();
    await expect(chemicalAction).toBeFocused();
    const netisAction = page.getByRole("link", { name: "すべての機能を見る", exact: true });
    await netisAction.focus();
    await expect(netisAction).toBeFocused();
    await primaryAction.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/chatbot$/);
    await expect(page.getByLabel("質問入力")).toBeVisible();
  });

  test("画像読み込み失敗時も案内文と7つの道具への通常リンクを残す", async ({ page }) => {
    await page.route("**/*", (route) => route.request().resourceType() === "image" ? route.abort() : route.continue());
    await page.goto("/");

    const mascot = page.locator(HOME_MASCOT_SELECTOR).first();
    await expect(mascot).toHaveJSProperty("complete", true);
    await expect(mascot).toHaveJSProperty("naturalWidth", 0);
    await expect(page.getByRole("img", { name: HOME_MASCOT_LABEL, exact: true })).toBeVisible();
    await expect(page.getByText("安全わんこと、ひとつずつ確認しよう。", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /その書類、\s*AIに任せて、\s*現場に行こう。/u,
      }),
    ).toBeVisible();
    const services = page.locator("#tools");
    await expect(services.getByRole("heading", { level: 3 })).toHaveCount(3);
    await expect(services.locator("a[data-lp-tool]")).toHaveCount(7);
    const primaryAction = page.locator("[data-home-lp]").locator('[data-lp-tool][href="/chatbot"]');
    await primaryAction.click();
    await expect(page).toHaveURL(/\/chatbot$/);
    await expect(page.getByLabel("質問入力")).toBeVisible();
  });

  test("動きの読込失敗では読み込めた静止画と主リンクへ戻る", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.route("**/mascot/anzen-wanko-v1/idle.webp", (route) => route.abort());
    await page.goto("/");
    await page.locator("[data-pet-companion]").scrollIntoViewIfNeeded();
    await expect(page.getByRole("status").filter({ hasText: "動きを読み込めなかったため、静止画で表示しています。" })).toBeVisible();
    const mascot = page.locator(HOME_MASCOT_SELECTOR);
    await expect(mascot).toBeVisible();
    await expect(mascot).toHaveJSProperty("complete", true);
    await expect.poll(() => mascot.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator("[data-pet-strip]")).toHaveCount(0);
    await expect(page.locator("#tools a[data-lp-tool]")).toHaveCount(7);
    await expect(page.locator('#tools a[data-lp-tool][href="/chatbot"]')).toHaveAttribute("href", "/chatbot");
  });

  test("動作設定の変更と非表示・再表示でも手動停止とフォーカスを保つ", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    const stripRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/mascot\/anzen-wanko-v1\/(idle|waving|activework|review)\.webp(?:\?|$)/.test(request.url())) {
        stripRequests.push(request.url());
      }
    });
    await page.goto("/");
    const companion = page.locator("[data-pet-companion]");
    const mascot = page.locator(HOME_MASCOT_SELECTOR);
    await companion.scrollIntoViewIfNeeded();
    await expect(companion.getByRole("button", { name: "端末の設定で動きを停止中" })).toBeDisabled();
    await expect(mascot).toBeVisible();
    await expect(mascot).toHaveJSProperty("complete", true);
    await expect(page.locator("[data-pet-strip]")).toHaveCount(0);
    expect(stripRequests).toEqual([]);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator('[data-pet-strip][data-pet-playing="true"]')).toBeVisible();
    await companion.getByRole("button", { name: "わんこの動きを停止", exact: true }).click();
    await expect(page.locator("[data-pet-strip]")).toHaveCount(0);
    await expect(mascot).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(companion.getByRole("button", { name: "端末の設定で動きを停止中" })).toBeDisabled();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const resume = companion.getByRole("button", { name: "わんこの動きを再開", exact: true });
    await expect(resume).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-pet-strip]")).toHaveCount(0);

    await companion.getByRole("button", { name: "安全わんこを非表示", exact: true }).click();
    const restore = companion.getByRole("button", { name: "安全わんこを再表示", exact: true });
    await expect(restore).toBeFocused();
    await expect(companion.getByRole("img", { name: HOME_MASCOT_LABEL })).toHaveCount(0);
    await restore.click();
    await expect(resume).toBeFocused();
    await expect(resume).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-pet-strip]")).toHaveCount(0);
    await resume.click();
    await expect(page.locator('[data-pet-strip][data-pet-playing="true"]')).toBeVisible();

    await companion.getByRole("button", { name: "安全わんこを非表示", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await restore.click();
    await expect(companion.getByRole("combobox", { name: "わんこのしぐさ" })).toBeFocused();
    await expect(mascot).toBeVisible();
    await expect(page.locator("[data-pet-strip]")).toHaveCount(0);
  });

  test("JavaScript無効でもチワワの説明と主操作を利用できる", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, reducedMotion: "reduce", viewport: { width: 390, height: 900 } });
    try {
      const page = await context.newPage();
      await page.goto("/");
      await expect(page.locator(HOME_MASCOT_SELECTOR).first()).toBeVisible();
      await expect(page.getByRole("img", { name: HOME_MASCOT_LABEL, exact: true })).toBeVisible();
      await expect(page.locator(HOME_MASCOT_SELECTOR)).toHaveJSProperty("complete", true);
      await expect.poll(() => page.locator(HOME_MASCOT_SELECTOR).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: /その書類、\s*AIに任せて、\s*現場に行こう。/u,
        }),
      ).toBeVisible();
      await expect(page.locator("[data-home-lp] a[data-lp-tool]")).toHaveCount(7);
      await expect(page.locator("#tools a[data-lp-tool]")).toHaveCount(7);
      const fallbackNav = page.getByRole("navigation", { name: "JavaScriptなしで利用できる機能" });
      await expect(fallbackNav.getByRole("link", { name: "安衛法AI", exact: true })).toHaveAttribute("href", "/chatbot");
      await expect(fallbackNav.getByRole("link", { name: "化学物質RA", exact: true })).toHaveAttribute("href", "/chemical-ra");
      await expect(page.locator('[data-home-section="heat"]')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
