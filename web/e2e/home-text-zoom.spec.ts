import { expect, test } from "@playwright/test";

test("ホームはテキスト400%拡大でも横スクロールなく主導線を使える", async ({
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
      name: "今日の熱中症リスク",
    }),
  ).toBeVisible();
  await expect(page.locator('[data-home-section="heat"]')).toBeVisible();
  await expect(
    page.locator('[data-home-section="chat"] textarea'),
  ).toBeAttached();
  await expect(
    page.locator('[data-home-section="chemical"] input'),
  ).toBeAttached();
  for (const selector of [
    '[data-home-section="learning"]',
    '[data-home-section="core-features"]',
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
  const heatState = await page
    .locator('[data-home-section="heat"] [data-heat-status]')
    .getAttribute("data-heat-status");
  await expect(page.locator('[data-home-section] [data-warning-card]')).toHaveCount(
    heatState === "degraded" || heatState === "unavailable" ? 1 : 0,
  );
});
