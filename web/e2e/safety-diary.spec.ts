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

  test("作成→保存フロー（従来表示 ?canvas=0）: localStorage(meeting-record) に永続化される", async ({ page }) => {
    // S1第九弾で既定がキャンバスになったため、従来フォームは ?canvas=0 で開く
    await page.goto("/safety-diary?canvas=0");
    await page.waitForLoadState("networkidle");

    const site = page.getByLabel("作業所名", { exact: true });
    await site.fill("E2E現場テスト");

    const saveBtn = page.getByRole("button", { name: "保存" }).first();
    await saveBtn.click();
    await page.waitForTimeout(800);

    const stored = await page.evaluate(() => localStorage.getItem("meeting-record"));
    expect(stored).toContain("E2E現場テスト");
  });

  test("キャンバスが既定表示になる（S1第九弾 β外し）", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("anzen-onboarding-v1-seen", "1");
      localStorage.removeItem("meeting-record");
    });
    await page.goto("/safety-diary");
    await expect(page.getByTestId("paper-stage-content")).toBeVisible();
    // 従来表示への復路と ?canvas=0 の永続
    await page.getByRole("button", { name: "従来表示" }).click();
    await expect(page.getByLabel("作業所名", { exact: true })).toBeVisible();
    expect(page.url()).toContain("canvas=0");
    // 従来表示から「新しい表示へ」で復帰（URLの canvas=0 が外れる）
    await page.getByRole("button", { name: "🗺 新しい表示へ" }).click();
    await expect(page.getByTestId("paper-stage-content")).toBeVisible();
    expect(page.url()).not.toContain("canvas=0");
  });

  test("キャンバス既定表示に保存・「…」その他操作（印刷プレビュー/前回複製/点検AI）がある（機能パリティ）", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("anzen-onboarding-v1-seen", "1");
    });
    await page.goto("/safety-diary");
    await expect(page.getByTestId("paper-stage-content")).toBeVisible();
    // 保存＝主ボタン（solid・常設）
    await expect(page.getByRole("button", { name: "保存", exact: true })).toBeVisible();
    // 「…」シート
    await page.getByRole("button", { name: "その他の操作（複製・印刷・点検項目AI）" }).click();
    await expect(page.getByRole("menuitem", { name: /前回を複製/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /AIで該当項目を推論/ })).toBeVisible();
    const preview = page.getByRole("menuitem", { name: /印刷プレビュー/ });
    await preview.click();
    await expect(page.getByText("印刷プレビュー（A4横・打合せ書）")).toBeVisible();
  });

  test("保存一覧ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/safety-diary/list");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByText("保存した打合せ書")).toBeVisible();
  });
});
