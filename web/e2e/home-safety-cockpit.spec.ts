import { expect, test } from "@playwright/test";

const PRIMARY_DESTINATIONS = [
  "/chatbot",
  "/chemical-ra",
  "/resources/mlit",
  "/accident-news",
  "/laws",
  "/services/automation",
  "/goods",
  "/education/hazard-slides",
  "/training/visual-ky",
  "/accidents-analytics",
] as const;

test.describe("リニューアルホーム", () => {
  test("新しい相棒ヒーローと9つの主機能だけを表示し、全導線が公開ページへ到達する", async ({
    page,
    request,
  }) => {
    const response = await page.goto("/", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("#home-relaunch-title")).toContainText("小さな気づきが、");
    await expect(page.locator("#home-relaunch-title")).toContainText("大きな事故を防ぐ。");
    await expect(
      page.getByRole("heading", { level: 2, name: "仕事から選ぶ、9つの主機能" }),
    ).toBeVisible();
    await expect(page.locator('[aria-labelledby="main-services-title"] > div > ul > li')).toHaveCount(9);
    await expect(page.getByText("今日の熱中症リスク", { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-home-section="heat"]')).toHaveCount(0);

    for (const path of PRIMARY_DESTINATIONS) {
      await expect(page.locator(`main a[href="${path}"]`).first(), path).toBeVisible();
      expect((await request.get(path)).status(), path).toBeLessThan(400);
    }
  });

  test("390pxでv4チワワ、主要導線、footer noteを横溢れやブラウザエラーなく表示する", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });

    const mascot = page.getByAltText(
      "吹き出しと一緒に相談を案内する安全AIポータルのチワワ",
    );
    await expect(mascot).toBeVisible();
    expect(await mascot.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain(
      "mascot-chat-talk-v4.webp",
    );
    expect((await mascot.boundingBox())?.width).toBeLessThanOrEqual(104);
    await expect(page.getByText("気になること、聞いてみる？")).toBeVisible();
    await expect(page.getByRole("link", { name: "安衛法AIを開く" })).toHaveAttribute(
      "href",
      "/chatbot",
    );
    await expect(page.locator('a[href*="nbe0fafcf0f34"]')).toHaveAttribute(
      "href",
      /utm_source=anzen_ai_portal/u,
    );
    await expect(page.locator('a[href*="n838317f8153d"]')).toHaveAttribute(
      "href",
      /utm_source=anzen_ai_portal/u,
    );
    expect(
      await page.evaluate(
        () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      ),
    ).toBe(0);
    expect(errors).toEqual([]);
  });

  test("JavaScript無効でも見出し、v4チワワ、通常リンクをSSR HTMLに保持する", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("小さな気づきが、");
    await expect(page.getByAltText(/吹き出しと一緒に相談/u)).toBeVisible();
    await expect(page.getByRole("link", { name: "安衛法AIを開く" })).toHaveAttribute(
      "href",
      "/chatbot",
    );
    await context.close();
  });

  test("公式関連を示さない試験ルートは公開されない", async ({ request }) => {
    expect((await request.get("/exam-quiz")).status()).toBe(404);
    expect((await request.get("/e-learning/exams")).status()).toBe(404);
  });
});
