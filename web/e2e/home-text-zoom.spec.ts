import { expect, test } from "@playwright/test";

test("ホームは400%ズーム相当幅でも横スクロールなく主導線を使える", async ({
  page,
}) => {
  // 1440px画面を400%ズームしたときの実効CSS幅（360px）でreflowを確認する。
  // root font-size=400%はブラウザズームとは異なり、全remを4倍にしてしまうため
  // ここでは実際のズーム時と同じレイアウト幅を使う。
  await page.setViewportSize({ width: 360, height: 900 });
  await page.setExtraHTTPHeaders({
    "x-vercel-ip-country": "JP",
    "x-vercel-ip-country-region": "13",
  });
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /小さな気づきが、\s*大きな事故を防ぐ。/u,
    }),
  ).toBeVisible();
  const mascotTools = page.getByRole("region", { name: "チワワと試す5機能" });
  await expect(mascotTools.getByRole("link")).toHaveCount(5);
  for (const link of await mascotTools.getByRole("link").all()) {
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();
  }
  const services = page.getByRole("region", { name: "仕事から選ぶ、9つの主機能" });
  await expect(services.getByRole("listitem")).toHaveCount(9);
  for (const link of await services.getByRole("listitem").getByRole("link").all()) {
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();
  }
  for (const selector of [
    '[data-home-section="updates"]',
    '[data-home-section="safety-labs"]',
    'section[aria-labelledby="home-feature-directory"]',
    '[data-home-section="automation-consult"]',
  ]) {
    const section = page.locator(selector);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
  }

  const reflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
  }));
  expect(reflow.scrollWidth - reflow.clientWidth).toBeLessThanOrEqual(2);
  await expect(page.locator('[data-home-section="quality"]')).toHaveCount(0);
  await expect(page.locator('[data-home-section="heat"]')).toHaveCount(0);
  await expect(page.locator('main [data-warning-card]')).toHaveCount(0);
});
