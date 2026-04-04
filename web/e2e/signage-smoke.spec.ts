import { expect, test } from "@playwright/test";

test.describe("signage smoke", () => {
  test("正常系: /signage が開き主要見出しが表示される @smoke", async ({ page }) => {
    await page.goto("/signage");

    await expect(page.getByText("安全AIサイト サイネージ")).toBeVisible();
    await expect(page.getByRole("heading", { name: "今日の現場リスクと安全要点" })).toBeVisible();

    await expect(page.getByText("気象庁 注意報・警報", { exact: false })).toBeVisible();
    await expect(page.getByText("トレンド（労働災害・建設事故）")).toBeVisible();
    await expect(page.getByText("直近の法改正（5件・要約）")).toBeVisible();

    await expect(page.getByText("API MODE:", { exact: false })).toBeVisible();
  });
});

