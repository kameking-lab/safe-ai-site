import { expect, test } from "@playwright/test";

test.describe("live mode", () => {
  test("正常系: 一覧表示→要約表示→チャット送信", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByRole("heading", { name: "法改正一覧" }).first()).toBeVisible();
    await expect(page.getByText("高所作業時の墜落防止措置の強化")).toBeVisible();

    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await page.getByRole("button", { name: "AI要約" }).click();
    await expect(page.getByText("3行要約")).toBeVisible();
    await expect(page.getByText("現場でやること")).toBeVisible();
    await expect(page.getByText("対象業種")).toBeVisible();
    await page.waitForTimeout(700);

    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();

    await expect(page.getByText("施行日はいつですか")).toBeVisible();
    await expect(page.getByText("に関するダミー回答です。")).toBeVisible();
  });

  test("失敗系: 一覧API 5xx でエラー通知表示", async ({ page }) => {
    await page.goto("/?forceRevisionsError=5xx");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("一覧の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("法改正一覧APIが一時的に利用できません。")).toBeVisible();
    await page.waitForTimeout(500);
    const retryButtonCount = await page.getByRole("button", { name: "一覧を再取得" }).count();
    expect(retryButtonCount).toBeGreaterThan(0);
  });
});
