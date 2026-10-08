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
  test("PCで原点、チワワ、6つの既存道具への入口を表示する", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const heroHeading = page.getByRole("heading", { level: 1 });
    await expect(heroHeading).toContainText("その書類、");
    await expect(heroHeading).toContainText("現場に行こう。");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "今日の仕事に、すぐ使える。",
      }),
    ).toBeVisible();
    await expect(page.getByText("今日の熱中症リスク")).toHaveCount(0);

    const heroMascot = page.getByAltText(
      "ヘルメットをかぶり、タブレットを持つチワワ",
    );
    await expect(heroMascot).toBeVisible();
    await expect(heroMascot).toHaveAttribute(
      "src",
      /mascot-tablet-dx/u,
    );

    const mainCards = page
      .locator('#tools a[data-lp-tool]');
    await expect(mainCards).toHaveCount(6);
    const cardHrefs = await mainCards.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    );
    expect(cardHrefs).toEqual(["/ky/paper", "/chatbot", "/chemical-ra", "/training/safety-seminars", "/materials/safety-images", "/construction-calc"]);
  });

  test("スマホで横にはみ出さず、季節機能を固定ナビから外す", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText("現場に行こう。");
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
