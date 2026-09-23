import { expect, test } from "@playwright/test";

test("チワワの下部で主要5機能を選び、戻ったら選択位置へ戻る", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const toolbox = page.locator("#mascot-tools");
  await expect(toolbox).toBeVisible();
  await expect(toolbox.getByRole("navigation", { name: "チワワと試す5機能" }).getByRole("link")).toHaveCount(5);
  await expect(toolbox.getByRole("textbox", { name: "安衛法AIへの質問" })).toBeVisible();
  await expect(toolbox.getByRole("combobox", { name: "化学物質を検索" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  const goods = page.locator('a.hs-card[href="/goods"]');
  await goods.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(400);
  await goods.click();
  await expect(page).toHaveURL(/\/goods$/u);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/u);
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 }).toBeGreaterThan(before - 160);
});
