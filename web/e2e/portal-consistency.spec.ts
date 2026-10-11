import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) {
  test.describe(`portal consistency ${width}px @smoke`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("法令の例から該当条文と公式法令に進める", async ({ page }) => {
      await page.goto("/law-search");
      await page.getByRole("combobox", { name: "法令で絞り込む" }).selectOption("労働基準法");
      await page.getByRole("searchbox", { name: "法令フリーワード検索" }).fill("賃金");
      await page.getByRole("button", { name: "安衛法 第61条", exact: true }).click();
      await expect(page.getByRole("combobox", { name: "法令で絞り込む" })).toHaveValue("労働安全衛生法");
      await expect(page.getByRole("searchbox", { name: "条番号で検索" })).toHaveValue("第61条");
      await expect(page.getByRole("searchbox", { name: "法令フリーワード検索" })).toHaveValue("");
      const result = page.locator("article").filter({ hasText: "第61条" });
      await expect(result).toHaveCount(1);
      await expect(result).toContainText("安衛法");
      await expect(result).not.toContainText("労基法");
      await expect(result.getByRole("link", { name: "e-Gov", exact: true })).toHaveAttribute("href", "https://laws.e-gov.go.jp/law/347AC0000000057");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });

    test("計算入口を統一し、旧勾配の誤入力では結果を隠し再開できる", async ({ page }) => {
      await page.goto("/construction-calc");
      await expect(page).toHaveURL(/\/tools\/construction-calculators$/u);
      await expect(page.locator('[data-calculator-status="published"]')).toHaveCount(17);
      const legacy = "/construction-calc/slope-ratio-convert?from=angle&angleDeg=45";
      await page.goto(legacy);
      await expect(page.locator("#calc-field-angleDeg")).toHaveValue("45");
      await expect(page.getByRole("status", { name: /^計算結果:/u })).toBeVisible();
      await page.locator("#calc-field-angleDeg").fill("0");
      await expect(page.getByRole("list", { name: "入力の注意" })).toBeVisible();
      await expect(page.getByRole("status", { name: /^計算結果:/u })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "計算書を出力（PDF/印刷）" })).toHaveCount(0);
      await page.locator("#calc-field-angleDeg").fill("45");
      await expect(page.getByRole("button", { name: "計算書を出力（PDF/印刷）" })).toBeVisible();
      await page.reload();
      await expect(page.locator("#calc-field-angleDeg")).toHaveValue("45");
      await page.goto("/tools/construction-calculators/concrete-quantity");
      await page.getByRole("button", { name: "例の数字で試す" }).click();
      await page.getByRole("button", { name: "計算する", exact: true }).click();
      await expect(page.locator("#calculation-result-title")).toBeVisible();
      await page.goBack();
      await expect(page.locator("#calc-field-angleDeg")).toHaveValue("45");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });

    test("多言語看板は文言変更後に両言語を確認して保存できる", async ({ page }) => {
      await page.goto("/materials/safety-images/helmet-required");
      await page.getByLabel("英語", { exact: true }).check();
      await page.getByText("詳細設定（文字・サイズ・形式）", { exact: true }).click();
      await page.getByLabel("表示する文字（日本語）").fill("保護帽を正しく着用");
      const downloadButton = page.getByRole("button", { name: "この看板をダウンロード", exact: true });
      await expect(downloadButton).toBeDisabled();
      await expect(page.getByText("未確認：日本語／英語", { exact: true })).toBeVisible();
      await page.getByLabel("表示する文字（英語）").fill("Wear your helmet correctly");
      await page.getByLabel("日本語の意味を確認した", { exact: true }).check();
      await page.getByLabel("英語の意味を確認した", { exact: true }).check();
      await expect(downloadButton).toBeEnabled();
      const [response, download] = await Promise.all([
        page.waitForResponse((item) => item.url().endsWith("/api/safety-images/helmet-required/download") && item.request().method() === "POST"),
        page.waitForEvent("download"),
        downloadButton.click(),
      ]);
      expect(response.status()).toBe(200);
      expect(response.request().postDataJSON().settings.texts).toMatchObject({ ja: "保護帽を正しく着用", en: "Wear your helmet correctly" });
      expect(download.suggestedFilename()).toBe("helmet-required-ja-en-a4-portrait.jpg");
      await page.getByLabel("表示する文字（日本語）").fill("保護帽を着用");
      await expect(downloadButton).toBeDisabled();
      await page.getByRole("button", { name: "元に戻す", exact: true }).click();
      await expect(downloadButton).toBeEnabled();
      await expect(page.getByLabel("英語", { exact: true })).not.toBeChecked();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });
  });
}
