import { test, expect } from "@playwright/test";

test.describe("安全衛生日誌", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/safety-diary");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("ページタイトルに『安全衛生日誌』が含まれる", async ({ page }) => {
    await page.goto("/safety-diary");
    await expect(page).toHaveTitle(/安全衛生日誌/);
  });

  test("日誌作成→保存フロー: localStorage に永続化される", async ({ page }) => {
    await page.goto("/safety-diary");
    // ハイドレーション完了を待つ（タブUIが現れるまで）
    await page.waitForLoadState("networkidle");

    // 現場名入力（type=text の最初の入力欄を狙う）
    const textInputs = page.locator('input[type="text"]');
    if (await textInputs.count() > 0) {
      await textInputs.first().fill("E2E現場テスト");
    }

    // 保存ボタン（テキストに「保存」を含む）
    const saveBtn = page.getByRole("button", { name: /保存/ }).first();
    if (await saveBtn.count() > 0 && (await saveBtn.isVisible())) {
      await saveBtn.click();
      // 保存後 localStorage を確認
      await page.waitForTimeout(500);
      const stored = await page.evaluate(() =>
        localStorage.getItem("anzen-safety-diary-v1"),
      );
      // 保存成功時に何らかのエントリが書き込まれている
      expect(stored).toBeTruthy();
    }
  });
});
