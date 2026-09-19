import { expect, test } from "@playwright/test";

const MAIN_ROUTES = [
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

test.describe("新しい安全AIポータルのホーム", () => {
  test("PCで理念、修正済みチワワ、9つの主機能を先頭に表示する", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const heroHeading = page.getByRole("heading", { level: 1 });
    await expect(heroHeading).toContainText("小さな気づきが、");
    await expect(heroHeading).toContainText("大きな事故を防ぐ。");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "仕事から選ぶ、9つの主機能",
      }),
    ).toBeVisible();
    await expect(page.getByText("今日の熱中症リスク")).toHaveCount(0);

    const heroMascot = page.getByAltText(
      "吹き出しと一緒に相談を案内する安全AIポータルのチワワ",
    );
    await expect(heroMascot).toBeVisible();
    await expect(heroMascot).toHaveAttribute(
      "src",
      /mascot-chat-talk-v4/u,
    );

    const mainCards = page
      .locator('section[aria-labelledby="main-services-title"] ul > li > a');
    await expect(mainCards).toHaveCount(9);
    const cardHrefs = await mainCards.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    );
    expect(cardHrefs).toEqual(MAIN_ROUTES);
  });

  test("スマホで横にはみ出さず、季節機能を固定ナビから外す", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText("大きな事故を防ぐ。");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    const mobileNavigation = page.getByRole("navigation", {
      name: "モバイル ボトムナビゲーション",
    });
    await expect(
      mobileNavigation.getByRole("link", { name: /化学RA/u }),
    ).toBeVisible();
    await expect(
      mobileNavigation.getByRole("link", { name: /熱中症/u }),
    ).toHaveCount(0);
  });

  test("主機能の公開先はすべて応答し、試験ライブラリは公開しない", async ({
    request,
  }) => {
    for (const route of MAIN_ROUTES) {
      const response = await request.get(route);
      expect(response.status(), route).toBe(200);
    }
    const netis = await request.get("/resources/netis-safety");
    expect(netis.status()).toBe(200);
    const exams = await request.get("/e-learning/exams");
    expect(exams.status()).toBe(404);
  });
});
