import { expect, test } from "@playwright/test";

for (const slug of ["concrete-quantity", "earthwork-conversion-dump-trucks"]) {
  test(`061 ${slug} のA4に条件・単位・日時・根拠を残す`, async ({ page }, testInfo) => {
    await page.goto(`/tools/construction-calculators/${slug}`);
    await page.getByRole("button", { name: "例の数字で試す", exact: true }).click();
    await page.getByRole("button", { name: "計算する", exact: true }).click();
    await expect(page.locator("#calculation-result-title")).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await page.setViewportSize({ width: 794, height: 1123 });
    const printed = page.locator(".construction-calculator-print");
    await expect(printed).toBeVisible();
    await expect(printed).toContainText("使用した入力値");
    await expect(printed).toContainText("根拠資料");
    await expect(printed).toContainText("計算式の版：");
    await expect(printed).toContainText("資料確認日：");
    await expect(printed).toContainText(/\d{4}\/\d{1,2}\/\d{1,2}/);
    expect(await printed.locator("a[href^='https://']").count()).toBeGreaterThan(0);
    await printed.screenshot({ path: testInfo.outputPath(`061-${slug}-print.png`) });
    await page.pdf({ path: testInfo.outputPath(`061-${slug}.pdf`), format: "A4", printBackground: true });
  });
}

test("061 旧計算書にも日時・入力単位・根拠を残す", async ({ page }, testInfo) => {
  await page.addInitScript(() => { window.print = () => undefined; });
  await page.goto("/construction-calc/concrete-volume");
  await page.locator("#calc-field-calcMode").selectOption("direct");
  await page.locator("#calc-field-volume").fill("10");
  await page.locator("#calc-field-lossRate").fill("5");
  await page.locator("#calc-field-truckCapacity").fill("4");
  await page.getByRole("button", { name: "計算書を出力（PDF/印刷）", exact: true }).click();
  const printed = page.locator(".calc-report-root");
  await expect(printed).toContainText(/作成日時：\d{4}\/\d{2}\/\d{2}/);
  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: 794, height: 1123 });
  await expect(printed).toBeVisible();
  await expect(printed).toContainText("m³");
  await expect(printed).toContainText(/根拠/);
  await expect(printed.getByRole("heading", { name: "4. 根拠（法令・基準・出典）", exact: true }).locator("..")).toContainText("日本建築学会 JASS5");
  await printed.screenshot({ path: testInfo.outputPath("061-legacy-concrete-print.png") });
  await page.pdf({ path: testInfo.outputPath("061-legacy-concrete.pdf"), format: "A4", printBackground: true });
});
