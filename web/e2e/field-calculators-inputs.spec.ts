import { test, expect } from "@playwright/test";
const prefix = "/tools/construction-calculators";
test("mobile empty input, explicit sample, edit status, reset and zero distinction", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(prefix + "/concrete-quantity");
    const length = page.locator("#construction-calculator-length");
    await expect(length).toHaveValue("");
    await page.getByRole("button", { name: "例の数字で試す" }).click();
    await expect(page.locator("#calculation-result-title")).toBeVisible();
    await length.fill("12");
    await expect(page.getByText("例の数字を一部変更した概算です。残りの例も確認してください。")).toBeVisible();
    await page.getByRole("button", { name: /入力をリセット/ }).click();
    await expect(length).toHaveValue("");
    await expect(page.locator("#calculation-result-title")).toHaveCount(0);
    await page.getByRole("button", { name: "例の数字で試す" }).click();
    await page.locator("#construction-calculator-lossPercent").fill("");
    await page.getByRole("button", { name: "計算する", exact: true }).click();
    await expect(page.getByRole("alert", { name: "計算できません" })).toContainText("ロス率");
    await page.locator("#construction-calculator-lossPercent").fill("0");
    await page.getByRole("button", { name: "計算する", exact: true }).click();
    await expect(page.locator("#calculation-result-title")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
test("sheet and board directional layouts give independently checked purchase counts", async ({ page }) => {
    for (const slug of ["curing-sheet-quantity", "wire-mesh-quantity"]) {
        await page.goto(prefix + "/" + slug);
        await page.getByRole("button", { name: "例の数字で試す" }).click();
        await page.locator("#construction-calculator-lossPercent").fill("0");
        await expect(page.locator("#calculation-result-title + dl")).toContainText("6枚");
        await page.locator("#construction-calculator-overlap").fill("0");
        await expect(page.locator("#calculation-result-title + dl")).toContainText("4枚");
    }
    await page.goto(prefix + "/board-panel-quantity");
    await page.getByRole("button", { name: "例の数字で試す" }).click();
    await page.locator("#construction-calculator-coverLength").fill("3.64");
    await page.locator("#construction-calculator-coverWidth").fill("2.73");
    await page.locator("#construction-calculator-lossPercent").fill("0");
    await expect(page.locator("#calculation-result-title + dl")).toContainText("6枚");
});
test("polygon live geometry, reverse order and crossing rejection", async ({ page }) => {
    await page.goto(prefix + "/polygon-area");
    await page.getByRole("button", { name: "例の数字で試す" }).click();
    await expect(page.locator("#calculation-result-title + dl")).toContainText("12m²");
    await page.locator("#construction-calculator-point-1-x").fill("4");
    await page.locator("#construction-calculator-point-1-y").fill("3");
    await page.locator("#construction-calculator-point-2-x").fill("0");
    await page.locator("#construction-calculator-point-2-y").fill("3");
    await page.locator("#construction-calculator-point-3-x").fill("4");
    await page.locator("#construction-calculator-point-3-y").fill("0");
    await page.getByRole("button", { name: "計算する", exact: true }).click();
    await expect(page.getByRole("alert").first()).toContainText("交差");
});
test("D13 table mass is used in real UI and diagram number focuses dimensions", async ({ page }) => {
    await page.goto(prefix + "/rebar-weight");
    await page.getByRole("button", { name: "例の数字で試す" }).click();
    await page.locator("#construction-calculator-barDesignation").selectOption("D13");
    await page.locator("#construction-calculator-length").fill("4");
    await page.locator("#construction-calculator-quantity").fill("10");
    await expect(page.locator("#calculation-result-title + dl")).toContainText("39.8kg");
    await page.getByRole("button", { name: /1本長さの入力へ/ }).click();
    await expect(page.locator("#construction-calculator-length")).toBeFocused();
});
test("search and category filters keep ordinary detail links", async ({ page }) => {
    await page.goto(prefix);
    await page.getByRole("searchbox", { name: "計算ツールを検索" }).fill("ボード");
    await expect(page.locator('[data-calculator-status="published"]')).toHaveCount(1);
    await expect(page.locator('[data-calculator-status="published"] a')).toHaveAttribute("href", prefix + "/board-panel-quantity");
});
