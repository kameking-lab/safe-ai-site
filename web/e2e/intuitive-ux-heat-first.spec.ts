import { expect, test } from "@playwright/test";

test("ホームは相棒ヒーローから主要作業へ直接進める", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("#home-relaunch-title")).toContainText("小さな気づきが、");
  await expect(page.locator("#home-relaunch-title")).toContainText("大きな事故を防ぐ。");
  for (const [name, href] of [
    ["安衛法AIを開く", "/chatbot"],
    ["化学物質RAを開く", "/chemical-ra"],
    ["安全資料を探す", "/resources/mlit"],
  ] as const) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
  await expect(page.getByText("熱中症予防キャンペーン", { exact: true })).toHaveCount(0);
});

test("モバイルは9つの主機能と全機能一覧を正規URLで区別する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const cards = page.locator('[aria-labelledby="main-services-title"] > div > ul > li > a');
  await expect(cards).toHaveCount(9);
  await expect(page.getByRole("link", { name: "すべての機能" })).toHaveAttribute(
    "href",
    "/features",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test("JavaScript無効でも新トップの実情報と通常リンクをSSR HTMLに保持する", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("大きな事故を防ぐ。");
  await expect(page.locator('a[href="/education/hazard-slides"]')).toBeVisible();
  await expect(page.locator('main a[href="/training/visual-ky"]')).toBeVisible();
  await context.close();
});
