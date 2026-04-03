import { expect, test } from "@playwright/test";

test.describe("signage smoke", () => {
  test("正常系: /signage が開き主要見出しが表示される @smoke", async ({ page }) => {
    await page.goto("/signage");

    await expect(page.getByText("安全AIサイト サイネージモード")).toBeVisible();
    await expect(page.getByRole("heading", { name: "今日の現場リスクと安全要点" })).toBeVisible();

    await expect(page.getByText("今日の現場リスク")).toBeVisible();
    await expect(page.getByText("警報・注意報")).toBeVisible();
    await expect(page.getByText("本日の事故ピックアップ")).toBeVisible();
    await expect(page.getByText("最近の法改正要点")).toBeVisible();

    await expect(page.getByText("API MODE:", { exact: false })).toBeVisible();
  });
});

