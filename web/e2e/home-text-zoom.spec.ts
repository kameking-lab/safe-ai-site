import { expect, test } from "@playwright/test";

test("ホームはテキスト400%拡大相当でも横スクロールなく主導線を使える", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  const response = await page.goto("/", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);

  await expect(page.locator("#home-relaunch-title")).toContainText("小さな気づきが、");
  await expect(page.locator("#home-relaunch-title")).toContainText("大きな事故を防ぐ。");
  await expect(page.getByRole("link", { name: "安衛法AIを開く" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "仕事から選ぶ、9つの主機能" })).toBeVisible();
  await expect(page.locator('[aria-labelledby="main-services-title"] > div > ul > li')).toHaveCount(9);

  const reflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  expect(reflow.scrollWidth - reflow.clientWidth).toBeLessThanOrEqual(2);
});
