import { expect, test } from "@playwright/test";

const STORY_PATH = "/about/project-story";

test.describe("project story and landing-page separation", () => {
  test("story has one H1, self canonical, AboutPage, and no personal-employment schema", async ({
    page,
  }) => {
    const response = await page.goto(STORY_PATH);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "現場の時間を、安全と本質的な仕事へ。",
    );
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.anzen-ai-portal.jp/about/project-story",
    );

    const schemas = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const serialized = schemas.join("\n");
    expect(serialized).toContain('"@type":"AboutPage"');
    expect(serialized).toContain('"@type":"BreadcrumbList"');
    expect(serialized).not.toContain('"@type":"ProfilePage"');
    expect(serialized).not.toContain('"@type":"Person"');
    expect(serialized).not.toContain("worksFor");
  });

  test("story and LP reflow from 320 to 1440 without horizontal overflow", async ({
    page,
  }) => {
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width === 1024 ? 768 : 844 });
      for (const path of [STORY_PATH, "/safety-ai"]) {
        await page.goto(path);
        const layout = await page.evaluate(() => ({
          overflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
          h1: document.querySelectorAll("main h1").length,
          missingAlt: [...document.querySelectorAll("main img")].filter(
            (image) => !image.hasAttribute("alt"),
          ).length,
        }));
        expect(layout, `${path} at ${width}px`).toEqual({
          overflow: false,
          h1: 1,
          missingAlt: 0,
        });
      }
    }
  });

  test("LP keeps one primary CTA and at most two secondary CTAs in the first view", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/safety-ai");

    await expect(page.locator('[data-lp-section="hero"] [data-hero-primary]')).toHaveCount(1);
    await expect(page.locator('[data-lp-section="hero"] [data-primary-action]')).toHaveCount(1);
    await expect(page.locator('[data-lp-section="hero"] [data-hero-secondary]')).toHaveCount(2);
    await expect(page.locator('[data-lp-section="hero"] [role=alert]')).toHaveCount(0);

    for (const label of [
      "今すぐ使う",
      "できることを見る",
      "自社向けに相談する",
    ]) {
      const link = page
        .locator('[data-lp-section="hero"]')
        .getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box, label).not.toBeNull();
      expect((box?.y ?? 768) + (box?.height ?? 0), label).toBeLessThanOrEqual(
        768,
      );
    }
  });

  test("story remains operable with keyboard, reduced motion, and forced colors", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    await page.goto(STORY_PATH);

    const primary = page.getByRole("link", { name: "安全AIポータルを使う" });
    let reachedPrimary = false;
    for (let index = 0; index < 50; index += 1) {
      await page.keyboard.press("Tab");
      reachedPrimary = await primary.evaluate(
        (element) => document.activeElement === element,
      );
      if (reachedPrimary) break;
    }
    expect(reachedPrimary).toBe(true);
    await expect(primary).toBeFocused();
    await expect(primary).toBeVisible();

    const media = await page.evaluate(() => ({
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      forced: matchMedia("(forced-colors: active)").matches,
    }));
    expect(media).toEqual({ reduced: true, forced: true });
  });

  test("story and LP SSR remain readable with JavaScript disabled", async ({ browser }) => {
    const port = process.env.PLAYWRIGHT_PORT ?? "3310";
    const context = await browser.newContext({
      baseURL: `http://localhost:${port}`,
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    for (const [path, expectedText, minimum, maximum] of [
      [
        STORY_PATH,
        "なぜ個人で安全AIポータルをつくり、無償で公開しているのか。その原点と、開発で大切にしていることだけを記します。",
        900,
        1400,
      ],
      [
        "/safety-ai",
        "WBGT、法令、化学物質、事故、教育を一つの場所で確認できます。",
        650,
        1000,
      ],
    ] as const) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(expectedText, { exact: true })).toBeVisible();

      const snapshot = await page.evaluate(() => ({
        overflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
        mainCharacters: (document.querySelector("main")?.innerText ?? "")
          .replace(/\s+/g, " ")
          .trim().length,
        links: document.querySelectorAll("main a[href]").length,
      }));
      expect(snapshot.overflow, path).toBe(false);
      expect(snapshot.mainCharacters, path).toBeGreaterThanOrEqual(minimum);
      expect(snapshot.mainCharacters, path).toBeLessThanOrEqual(maximum);
      expect(snapshot.links, path).toBeGreaterThan(5);
      await expect(page.locator("main h2"), path).not.toHaveCount(0);
    }
    await context.close();
  });
});
