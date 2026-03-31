import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("live mode", () => {
  test("正常系: 一覧表示→要約表示→チャット送信 @smoke", async ({ page }) => {
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

  test("失敗系: 一覧API 5xx でエラー通知表示 @failure", async ({ page }) => {
    await page.goto("/?forceRevisionsError=5xx");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("一覧の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("法改正一覧APIが一時的に利用できません。")).toBeVisible();
    await page.waitForTimeout(500);
    const retryButtonCount = await page.getByRole("button", { name: "一覧を再取得" }).count();
    expect(retryButtonCount).toBeGreaterThan(0);
  });

  test("失敗系: 一覧API timeout でエラー通知表示 @failure", async ({ page }) => {
    await page.goto("/?forceRevisionsError=timeout");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("一覧の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("法改正一覧の取得がタイムアウトしました。再試行してください。")).toBeVisible();
    await expect(page.getByRole("button", { name: "一覧を再取得" })).toBeVisible();
  });

  test("失敗系: 一覧API validation で再試行なし表示 @failure", async ({ page }) => {
    await page.goto("/?forceRevisionsError=validation");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("一覧の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("法改正一覧APIの入力検証エラーです。")).toBeVisible();
    await expect(page.getByText("このエラーは再試行対象外です。")).toBeVisible();
    await expect(page.getByRole("button", { name: "一覧を再取得" })).toHaveCount(0);
  });

  test("失敗系: 要約API 5xx で ErrorNotice と再試行表示 @failure", async ({ page }) => {
    await page.goto("/?forceSummaryError=5xx");
    await page.getByRole("button", { name: "AI要約" }).click();
    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await expect(page.getByText("要約の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("要約APIが一時的に利用できません。")).toBeVisible();
    await expect(page.getByRole("button", { name: "要約を再取得" })).toBeVisible();
  });

  test("失敗系: 要約API timeout で ErrorNotice 表示 @failure", async ({ page }) => {
    await page.goto("/?forceSummaryError=timeout");
    await page.getByRole("button", { name: "AI要約" }).click();
    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await expect(page.getByText("要約API応答がタイムアウトしました。")).toBeVisible({ timeout: 12000 });
    await expect(page.getByRole("button", { name: "要約を再取得" })).toBeVisible();
  });

  test("失敗系: 要約API validation で再試行なし表示 @failure", async ({ page }) => {
    await page.goto("/?forceSummaryError=validation");
    await page.getByRole("button", { name: "AI要約" }).click();
    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await expect(page.getByText("要約APIの入力検証エラーです。")).toBeVisible();
    await expect(page.getByText("このエラーは再試行対象外です。")).toBeVisible();
    await expect(page.getByRole("button", { name: "要約を再取得" })).toHaveCount(0);
  });

  test("失敗系: チャットAPI validation で再試行なし表示 @failure", async ({ page }) => {
    await page.goto("/?forceChatError=validation");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャットの入力形式が不正です。")).toBeVisible();
    await expect(page.getByText("このエラーは再試行対象外です。")).toBeVisible();
  });

  test("失敗系: チャットAPI 5xx で再試行表示 @failure", async ({ page }) => {
    await page.goto("/?forceChatError=5xx");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャットAPIが一時的に利用できません。")).toBeVisible();
    await expect(page.getByRole("button", { name: "同じ質問を再送" })).toBeVisible();
  });

  test("失敗系: チャットAPI timeout で再試行表示 @failure", async ({ page }) => {
    await page.goto("/?forceChatError=timeout");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャット応答がタイムアウトしました。再試行してください。")).toBeVisible({
      timeout: 12000,
    });
    await expect(page.getByRole("button", { name: "同じ質問を再送" })).toBeVisible();
  });

  test("回復系: 要約API 5xx から再試行で回復 @recovery", async ({ page }) => {
    await page.goto("/?forceSummaryError=5xx");
    await page.getByRole("button", { name: "AI要約" }).click();
    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await expect(page.getByText("要約の取得に失敗しました")).toBeVisible();

    await page.goto("/");
    await page.getByRole("button", { name: "AI要約" }).click();
    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await expect(page.getByText("3行要約")).toBeVisible();
  });

  test("回復系: チャットAPI 5xx から再送で回復 @recovery", async ({ page }) => {
    await page.goto("/?forceChatError=5xx");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャットAPIが一時的に利用できません。")).toBeVisible();

    await page.goto("/");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("に関するダミー回答です。")).toBeVisible();
  });
});
