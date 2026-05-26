import { test, expect } from "@playwright/test";

test.describe("安全工程打合せ書", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/safety-diary");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("タイトルに『打合せ書』が含まれる", async ({ page }) => {
    await page.goto("/safety-diary");
    await expect(page).toHaveTitle(/打合せ書/);
  });

  test("作成→保存フロー: localStorage(meeting-record) に永続化される", async ({ page }) => {
    await page.goto("/safety-diary");
    await page.waitForLoadState("networkidle");

    const site = page.getByLabel("作業所名", { exact: true });
    await site.fill("E2E現場テスト");

    const saveBtn = page.getByRole("button", { name: "保存" }).first();
    await saveBtn.click();
    await page.waitForTimeout(800);

    const stored = await page.evaluate(() => localStorage.getItem("meeting-record"));
    expect(stored).toContain("E2E現場テスト");
  });

  test("保存一覧ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/safety-diary/list");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByText("保存した打合せ書")).toBeVisible();
  });
});
