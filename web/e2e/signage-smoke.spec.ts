import { expect, test } from "@playwright/test";

test.describe("signage smoke", () => {
  test("正常系: /signage が開き主要見出しが表示される @smoke", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/signage", { waitUntil: "networkidle" });

    await expect(page.getByText("安全AIポータル サイネージ")).toBeVisible();
    await expect(page.getByRole("heading", { name: "今日の現場リスクと安全要点" })).toBeVisible();

    const presentation = page.locator('[data-signage-presentation="1024"]');
    await expect(presentation).toBeVisible();
    await expect(presentation.getByText("現在状態", { exact: true })).toBeVisible();
    await expect(presentation.getByText("データ鮮度", { exact: true })).toBeVisible();
    await expect(
      presentation.getByText("気象庁 警報・注意報", { exact: true }).first(),
    ).toBeVisible();
    await expect(presentation.getByRole("heading", { name: "朝礼要点" })).toBeVisible();
    await expect(presentation.getByRole("navigation", { name: "公式確認先" })).toBeVisible();
    await page.getByRole("button", { name: "設定・詳細" }).click();
    await expect(page.getByRole("heading", { name: "全国の警報・注意報地図" })).toBeVisible();
  });
});

