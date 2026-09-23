import { expect, test, type Page } from "@playwright/test";

const VISUAL_ROUTES = [
  "/",
  "/chatbot",
  "/chemical-ra",
  "/accident-news",
  "/laws",
  "/contact/automation-email",
  "/goods",
  "/training/safety-seminars",
  "/materials/safety-images",
  "/accidents-analytics",
] as const;

const HOME_SERVICE_HREFS = [
  "/chatbot",
  "/chemical-ra",
  "/accident-news",
  "/laws",
  "/contact/automation-email",
  "/goods",
  "/training/safety-seminars",
  "/materials/safety-images",
  "/accidents-analytics",
] as const;

function routePrimaryAction(page: Page, route: string) {
  if (route === "/") {
    return page
      .getByRole("navigation", { name: "すぐに使う主要機能" })
      .getByRole("link", { name: /安衛法AIを開く/u });
  }
  if (route === "/contact/automation-email") {
    return page.getByRole("button", { name: "メールで相談する" });
  }
  return page.locator("main [data-primary-action], main a[href], main button").first();
}

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

test("ホームはチワワ主導の9主機能導線で、熱中症キャンペーンを表示しない", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /小さな気づきが、\s*大きな事故を防ぐ。/u,
    }),
  ).toBeVisible();
  await expect(
    page.locator('img[src*="mascot-chat-talk-v4.webp"]:visible').first(),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "すぐに使う主要機能" }),
  ).toBeVisible();

  const serviceLinks = page.locator(
    'section[aria-labelledby="main-services-title"] ul > li > a',
  );
  await expect(serviceLinks).toHaveCount(HOME_SERVICE_HREFS.length);
  await expect
    .poll(async () =>
      serviceLinks.evaluateAll((links) =>
        links.map((link) => link.getAttribute("href")),
      ),
    )
    .toEqual([...HOME_SERVICE_HREFS]);
  await expect(page.locator('[data-home-section="heat"]')).toHaveCount(0);
  await expect(page.locator("[data-home-heat-slide-deck]")).toHaveCount(0);
  await expect(
    page.locator('main a[href="/heat-illness-prevention/slides"]'),
  ).toHaveCount(0);
});

test("追加画像には代替テキストがあり、主要画像の表示領域が確保される", async ({
  page,
}) => {
  for (const { route, imageSelector } of [
    {
      route: "/",
      imageSelector: 'img[src*="mascot-chat-talk-v4.webp"]',
    },
    {
      route: "/materials/safety-images",
      imageSelector: 'img[alt*="安全AIポータル作成イラスト"]',
    },
  ] as const) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const visibleImage = page.locator(`${imageSelector}:visible`).first();
    await expect(visibleImage, route).toBeVisible();
    await expect(page.locator("main img:not([alt])"), route).toHaveCount(0);
    const imageMetrics = await visibleImage.evaluate((image) => {
        const rect = image.getBoundingClientRect();
        return {
          alt: image.getAttribute("alt"),
          width: rect.width,
          height: rect.height,
        };
      });
    if (route === "/") {
      await expect(
        page.locator('img[alt*="安全AIポータルのチワワ"]'),
      ).toHaveCount(1);
    } else {
      expect(imageMetrics.alt?.trim().length ?? 0, route).toBeGreaterThan(0);
    }
    expect(imageMetrics.width, route).toBeGreaterThan(100);
    expect(imageMetrics.height, route).toBeGreaterThan(100);
  }

  await page.goto("/services/automation", { waitUntil: "domcontentloaded" });
  const automationMascot = page.locator("[data-automation-service] img");
  await expect(automationMascot).toHaveCount(1);
  await expect(automationMascot).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/税込33,000円から/)).toBeVisible();
  await expect(page.locator("#overview [data-primary-action]")).toBeVisible();
});

test("forced colorsでも見出しと主操作が残る", async ({
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
    "/contact/automation-email",
    "/materials/safety-images",
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1").first(), route).toBeVisible();
    await expect(routePrimaryAction(page, route), route).toBeVisible();
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "仕事から選ぶ、9つの主機能" }),
  ).toBeVisible();
  await expect(
    page.locator('section[aria-labelledby="main-services-title"] ul > li > a'),
  ).toHaveCount(9);
  await expect(page.locator('[data-home-section="heat"]')).toHaveCount(0);
  await context.close();
});

test("ホームの主要導線はキーボードで開ける", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const primary = page
    .getByRole("navigation", { name: "すぐに使う主要機能" })
    .getByRole("link", { name: /安衛法AIを開く/u });
  await primary.focus();
  await expect(primary).toBeFocused();
  await Promise.all([page.waitForURL("**/chatbot"), page.keyboard.press("Enter")]);
  await expect(page.locator("main h1").first()).toBeVisible();
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
