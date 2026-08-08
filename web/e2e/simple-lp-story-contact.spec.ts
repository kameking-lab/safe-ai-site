import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 320, height: 900, label: "400% reflow equivalent" },
  { width: 360, height: 900, label: "small mobile" },
  { width: 390, height: 900, label: "mobile" },
  { width: 768, height: 900, label: "tablet" },
  { width: 1024, height: 768, label: "200% reflow equivalent" },
  { width: 1440, height: 900, label: "desktop" },
] as const;

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport + 1);
}

test.describe("simple LP, story, and mail contact", () => {
  test("LP reflows from 320 to 1440 and keeps the primary action visible", async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto("/safety-ai", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "安全情報を、現場で使える行動へ。",
      );
      await expect(page.locator("[data-lp-section]")).toHaveCount(4);
      await expect(page.locator('[data-lp-section="available"]')).toHaveCount(1);
      await expect(page.locator('[data-lp-section="customize"]')).toHaveCount(1);
      await expect(page.locator('[data-lp-section="learn"]')).toHaveCount(1);
      await expect(page.locator("[data-hero-primary]")).toHaveCount(1);
      await expect(page.locator("[data-hero-secondary]")).toHaveCount(2);
      await expect(page.locator('article[data-simple-safety-ai-lp] [role="alert"]')).toHaveCount(0);
      await expect(page.locator("[data-hero-primary] a")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("landscape, keyboard, reduced motion, and forced colors keep the LP usable", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    await page.goto("/safety-ai", { waitUntil: "domcontentloaded" });
    const primary = page.locator("[data-hero-primary] a");
    await primary.focus();
    await expect(primary).toBeFocused();
    await expect(primary).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          matchMedia("(prefers-reduced-motion: reduce)").matches &&
          matchMedia("(forced-colors: active)").matches,
      ),
    ).toBe(true);
    await expectNoHorizontalOverflow(page);
  });

  test("story stays concise, independent, and free of removed career claims", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/about/project-story", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-story-block]")).toHaveCount(5);
    await expect(page.getByText("一級土木施工管理技士")).toBeVisible();
    await expect(page.getByText("労働安全コンサルタント")).toBeVisible();
    const body = await page.locator("body").innerText();
    for (const term of [
      "日商簿記2級",
      "現場別気象警報・熱中症通知システム",
      "安全eラーニングシステム",
      "年間表彰",
    ]) {
      expect(body).not.toContain(term);
    }
    await expectNoHorizontalOverflow(page);
  });

  test("automation first view states price and method, with only three primary cases", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/services/automation", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "業務自動化・講習を",
    );
    await expect(page.getByText("初回30分は無料", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/33,000円/).first()).toBeVisible();
    await expect(page.locator("#overview [role=status]")).toContainText(
      /Webフォーム受付中|メール相談受付中|受付停止中/,
    );
    await expect(page.locator("#overview [data-primary-action]")).toHaveCount(1);
    await expect(page.locator('#overview [role="alert"]')).toHaveCount(0);
    await expect(page.locator("#pricing [data-primary-pricing] > article")).toHaveCount(3);
    await expect(page.locator("#model-cases article")).toHaveCount(3);
    await expect(page.locator("#model-cases details")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("contact route is noindex/no-store and exposes a selectable no-JS template", async ({ page, request }) => {
    const response = await request.get("/contact/automation-email/draft?message=must-not-be-read");
    expect(response.status()).toBe(405);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");

    await page.goto("/contact/automation-email", { waitUntil: "domcontentloaded" });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex.*nofollow.*noarchive/i,
    );
    await expect(page.getByRole("textbox", { name: "コピー用の相談テンプレート" })).toBeVisible();
    const html = await page.content();
    expect(html).not.toMatch(/primary@gmail|audit@outlook/i);
  });

  test("JavaScript-disabled pages retain text, links, and the manual copy fallback", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(new URL("/safety-ai", baseURL).toString(), {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "今すぐ使う" }).first()).toBeVisible();

    await page.goto(new URL("/contact/automation-email", baseURL).toString(), {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("textbox", { name: "コピー用の相談テンプレート" })).toBeVisible();
    await expect(page.getByText(/上の宛先・件名・本文を選択/)).toBeVisible();
    await context.close();
  });

  test("the LP remains actionable if the Chihuahua image fails", async ({ page }) => {
    await page.route("**/mascot/mascot-pointing.webp", (route) => route.abort());
    await page.goto("/safety-ai", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("img", { name: "次に使う機能を案内するチワワ" }),
    ).toBeAttached();
    await expect(page.locator("[data-hero-primary] a")).toBeVisible();
  });
});
