import { expect, test } from "@playwright/test";

test.describe("任意検索本文のURL非露出", () => {
  test("法令検索は入力・送信・質問例選択後もURLを変えない", async ({ page }) => {
    await page.goto("/law-search?law=all");
    const initialUrl = page.url();
    const keyword = "山田太郎 新宿A現場の足場";
    const input = page.getByRole("searchbox", { name: "法令フリーワード検索" });

    await input.fill(keyword);
    await expect(page).toHaveURL(initialUrl);
    await page.getByRole("button", { name: "検索", exact: true }).click();
    await expect(page).toHaveURL(initialUrl);
    expect(page.url()).not.toContain(encodeURIComponent(keyword));

    await page.getByRole("button", { name: "安衛法 第61条" }).click();
    await expect(input).toHaveValue("第61条");
    await expect(page).toHaveURL(initialUrl);
  });

  test("事故クイック検索はDB結果を更新してもURLを変えない", async ({ page }) => {
    await page.goto(`/accidents?acc_type=${encodeURIComponent("墜落")}`);
    const initialUrl = page.url();
    const keyword = "フォークリフト";

    await page
      .getByRole("searchbox", { name: "事故事例キーワード検索" })
      .fill(keyword);
    await page.getByRole("button", { name: "検索", exact: true }).click();
    const results = page.locator("#accident-results");
    await expect(results.getByText("0件", { exact: true })).toBeVisible();
    await expect(
      results.getByText("条件に一致する事故データがありません", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("searchbox", { name: "事故事例キーワード検索" }),
    ).toHaveValue(keyword);
    await expect(page).toHaveURL(initialUrl);
    expect(page.url()).not.toContain(encodeURIComponent(keyword));
  });
});
