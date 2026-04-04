import { expect, test } from "@playwright/test";

test.describe("signage smoke", () => {
  test("正常系: /signage が開き主要見出しが表示される @smoke", async ({ page }) => {
    await page.goto("/signage");

    await expect(page.getByText("安全AIサイト サイネージモード")).toBeVisible();
    await expect(page.getByRole("heading", { name: "今日の現場リスクと安全要点" })).toBeVisible();

    await expect(page.getByText("本日の予想")).toBeVisible();
    await expect(page.getByText("今後1週間の予想")).toBeVisible();
    await expect(page.getByText("日本域 警報・注意報", { exact: false })).toBeVisible();
    await expect(page.getByText("報道ベースの労働災害（参考）")).toBeVisible();
    await expect(page.getByText("直近の法改正（5件・要約）")).toBeVisible();

    await expect(page.getByText("API MODE:", { exact: false })).toBeVisible();
  });
});

