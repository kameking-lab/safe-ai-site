import { expect, test, type Page } from "@playwright/test";

const servicesSection = (page: Page) =>
  page.locator('section[aria-labelledby="main-services-title"]');

const overflowX = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test("旧5機能パネルは主機能カードへ統合され、各カード下段から使える", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.locator("#mascot-tools")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "チワワと試す5機能" })).toHaveCount(0);
  const services = servicesSection(page);
  await expect(services.locator("ul > li > a")).toHaveCount(9);
  // 旧パネルの操作はカードリンクの外（兄弟要素）にあり、リンク内へ入れ子にしない
  await expect(services.locator("ul > li > a :is(a, button, input, textarea)")).toHaveCount(0);

  const chat = page.locator("#mascot-chat");
  await expect(chat.getByRole("textbox", { name: "安衛法AIへの質問" })).toBeVisible();
  await expect(chat.getByRole("button", { name: "質問する" })).toBeVisible();
  await expect(page.locator("#mascot-chemical").getByRole("combobox", { name: "化学物質を検索" })).toBeVisible();
  await expect(services.locator('ul > li > a[href="/accident-news"]')).toHaveCount(1);
  await expect(services.locator('ul > li > a[href="/laws"]')).toHaveCount(1);
  await expect(page.locator("#mascot-slides").getByRole("link", { name: /スライドを見る/ })).toHaveAttribute(
    "href",
    "/training/safety-seminars/safety-management-basics-osh-law#seminar-player",
  );
  expect(await overflowX(page)).toBeLessThanOrEqual(1);
});

for (const width of [320, 360, 390]) {
  test(`${width}px幅で統合カードが横にはみ出さない`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    for (const id of ["#mascot-chat", "#mascot-chemical", "#mascot-slides"]) {
      const card = page.locator(id);
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    }
    expect(await overflowX(page)).toBeLessThanOrEqual(1);
  });
}

test("統合カードの操作はキーボードだけで順に到達できる", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const chatLink = page.locator('#mascot-chat > a[href="/chatbot"]');
  await chatLink.focus();
  await expect(chatLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "安衛法AIへの質問" })).toBeFocused();
  await page.keyboard.type("フルハーネスの特別教育は必要？");
  await page.keyboard.press("Tab");
  await expect(page.locator("#mascot-chat").getByRole("button", { name: "質問する" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator('#mascot-chemical > a[href="/chemical-ra"]')).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox", { name: "化学物質を検索" })).toBeFocused();

  const slides = page.locator("#mascot-slides").getByRole("link", { name: /スライドを見る/ });
  await slides.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/training\/safety-seminars\/safety-management-basics-osh-law#seminar-player$/u);
});

test("主機能カードから戻ると選択位置へ戻る", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const goods = page.locator('a.hs-card[href="/goods"]');
  await goods.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(400);
  await goods.click();
  await expect(page).toHaveURL(/\/goods$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/u);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(before - 320);
  await expect(goods).toBeInViewport();
});

test("統合カード下段のリンクから戻っても選択位置へ戻る", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const slides = page.locator("#mascot-slides").getByRole("link", { name: /スライドを見る/ });
  await slides.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(400);
  await slides.click();
  await expect(page).toHaveURL(/#seminar-player$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/u);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(before - 320);
  await expect(slides).toBeInViewport();
});
