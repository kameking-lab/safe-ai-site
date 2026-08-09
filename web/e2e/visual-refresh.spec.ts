import { expect, test } from "@playwright/test";

const VISUAL_ROUTES = [
  "/",
  "/heat-illness-prevention/slides",
  "/services/automation",
  "/chemical-ra",
  "/ky/paper",
  "/chatbot",
  "/law-search",
  "/accidents",
  "/safety-ai",
] as const;

test("1280pxを400%拡大した相当幅（320 CSS px）でも主要画面がリフローする", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });

  for (const route of VISUAL_ROUTES) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main h1").first(), route).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
      `${route} horizontal overflow`,
    ).toBeLessThanOrEqual(2);
  }
});

test("追加画像には代替テキストがあり、主要画像の表示領域が確保される", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/heat-illness-prevention/slides",
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const imageSelector =
      route === "/"
        ? 'img[src*="visual-ky"]'
        : 'img[src*="visual-refresh"]';
    await expect(page.locator(imageSelector).first(), route).toBeVisible();
    await expect(page.locator(`${imageSelector}:not([alt])`), route).toHaveCount(0);
    const imageMetrics = await page
      .locator(imageSelector)
      .first()
      .evaluate((image) => {
        const rect = image.getBoundingClientRect();
        return {
          alt: image.getAttribute("alt"),
          width: rect.width,
          height: rect.height,
        };
      });
    expect(imageMetrics.alt?.trim().length ?? 0, route).toBeGreaterThan(0);
    expect(imageMetrics.width, route).toBeGreaterThan(100);
    expect(imageMetrics.height, route).toBeGreaterThan(100);
  }

  await page.goto("/services/automation", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-automation-service] img")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/税込33,000円から/)).toBeVisible();
  await expect(page.locator("#overview [data-primary-action]")).toBeVisible();
});

test("forced colorsでも見出し・主操作・現在値が残る", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    forcedColors: "active",
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
  });
  const page = await context.newPage();

  for (const route of [
    "/",
    "/heat-illness-prevention/slides",
    "/services/automation",
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1").first(), route).toBeVisible();
    await expect(page.locator("main [data-primary-action]").first(), route).toBeVisible();
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const heatSection = page.locator('[data-home-section="heat"]');
  await expect(heatSection).toBeVisible();
  const heatStatus = heatSection.locator("[data-heat-status]").first();
  await expect(heatStatus).toBeVisible();
  const heatWarnings = heatSection.locator("[data-warning-card]");
  const warningCount = await heatWarnings.count();
  expect(warningCount).toBeLessThanOrEqual(1);
  if (warningCount === 0) {
    await expect(heatStatus).toHaveAttribute(
      "data-heat-status",
      /^(?:national-live|ready)$/u,
    );
  } else {
    const warning = heatWarnings.first();
    await expect(warning).toBeVisible();
    await expect(warning).toHaveAttribute(
      "data-warning-trigger",
      /^upstream-(?:unavailable|stale)$/u,
    );
    await expect(warning).toContainText(/公式情報を確認/u);
    await expect(
      heatSection.locator('a[href^="https://www.wbgt.env.go.jp/"]').first(),
    ).toBeVisible();
  }
  await context.close();
});

test("熱中症スライドはキーボードでめくれ、Escapeで元の操作へ戻る", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/heat-illness-prevention/slides", {
    waitUntil: "networkidle",
  });

  const trigger = page.getByRole("button", { name: "投影モード" });
  await trigger.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", {
    name: "熱中症ブリーフィング投影モード",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("1 / 15", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "閉じる" })).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("2 / 15", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("モバイルメニューは標準detailsで開き、Escapeと表示支援を維持する", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const details = page.locator("details[data-mobile-site-menu]");
  const trigger = details.locator(
    'summary[aria-controls="mobile-site-menu"]',
  );
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await expect(page.getByRole("link", { name: "通知", exact: true })).toBeFocused();

  const menu = page.getByRole("region", {
    name: "モバイルサイトメニュー。Escキーで閉じます",
  });
  const displaySettings = menu.getByText("表示設定", { exact: true });
  await displaySettings.click();
  const largeText = menu.getByRole("button", { name: "文字大", exact: true });
  await largeText.click();
  await expect(largeText).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveClass(/large-font/);

  await page.keyboard.press("Escape");
  await expect(details).not.toHaveAttribute("open", "");
  await expect(trigger).toBeFocused();
});
