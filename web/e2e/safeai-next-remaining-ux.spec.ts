import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("060 小さい非ゼロ値を画面・履歴・コピー・CSV・印刷で一致させる", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { (window as Window & { calcCopy?: string }).calcCopy = text; } } });
  });
  await page.goto("/tools/construction-calculators/concrete-quantity");
  await page.locator("#construction-calculator-dimensionUnit").selectOption("mm");
  for (const field of ["length", "width", "height"]) await page.locator("#construction-calculator-" + field).fill("1");
  await page.locator("#construction-calculator-quantity").fill("1");
  await page.locator("#construction-calculator-lossPercent").fill("0");
  await page.locator("#construction-calculator-truckCapacityM3").fill("4");
  await page.getByRole("button", { name: "計算する", exact: true }).click();
  await expect(page.locator("#calculation-result-title")).toBeVisible();
  await expect(page.getByText("正味体積: 表示精度未満m³", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "結果をコピー", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { calcCopy?: string }).calcCopy)).toContain("正味体積: 表示精度未満m³");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const csvPath = testInfo.outputPath("060-small.csv");
  await (await pending).saveAs(csvPath);
  expect(readFileSync(csvPath, "utf8")).toContain('"正味体積","表示精度未満","m³"');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("060-small-320.png"), fullPage: true });
  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: 794, height: 1123 });
  const printed = page.locator(".construction-calculator-print");
  await expect(printed).toBeVisible();
  await expect(printed).toContainText("表示精度未満");
  await printed.screenshot({ path: testInfo.outputPath("060-small-print.png") });
  await page.pdf({ path: testInfo.outputPath("060-small.pdf"), format: "A4", printBackground: true });
});

test("048 規制は閉じて開始し、閉じたまま絞り込みを解除できる", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/chemical-database");
  const filters = page.locator("[data-chemical-regulation-filters]");
  const summary = filters.locator("summary");
  await expect(filters).toHaveJSProperty("open", false);
  const search = page.getByRole("searchbox", { name: "物質名・CAS番号で検索" });
  await search.fill("108-88-3");
  await summary.click();
  await filters.getByRole("button", { name: "有機則 第二種", exact: true }).click();
  await summary.click();
  await expect(filters).toHaveJSProperty("open", false);
  const clear = page.getByRole("button", { name: "絞り込みを解除", exact: true });
  await expect(clear).toBeVisible();
  await clear.click();
  await expect(search).toHaveValue("108-88-3");
  const card = page.locator('[data-chemical-mobile-card][data-cas="108-88-3"]');
  await expect(card).toBeVisible();
  await expect(card.getByRole("heading", { name: "トルエン", exact: true })).toBeVisible();
  await expect(card.getByRole("link", { name: "詳細を見る", exact: true })).toHaveAttribute("href", "/chemical-database/108-88-3");
  await expect(page.getByText("1 件選択中", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("048-filter-320.png"), fullPage: true });
});

test("052 選択後も固定の候補検索中表示を残さない", async ({ page }) => {
  await page.goto("/chemical-ra?cas=108-88-3");
  await expect(page.locator("header [data-status-badge]")).toHaveCount(0);
  const input = page.getByRole("combobox");
  await expect(input).toHaveValue("トルエン");
  await expect(page.getByText("候補を検索中", { exact: true })).toHaveCount(0);
  await expect(page.locator("header [data-status-badge]")).toHaveCount(0);
});

test("062 開始前の資料案内を開かず読め、未確認の選定を保留する", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/goods");
  const wizard = page.locator("#goods-guided-selection");
  await expect(wizard.getByText(/作業条件の記録と製品仕様書を用意/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("062-start-320.png"), fullPage: true });
  await wizard.getByRole("button", { name: "粉じん・ガスを吸う作業", exact: true }).click();
  await wizard.getByRole("button", { name: /粉じん・研削・清掃/ }).click();
  await wizard.getByRole("button", { name: /換気が効いている/ }).click();
  await expect(wizard.getByRole("heading", { name: "酸素濃度を測りましたか？" })).toBeVisible();
  await wizard.getByRole("button", { name: /分からない・未確認/ }).click();
  await wizard.getByRole("button", { name: "未確認のまま確認事項を見る", exact: true }).click();
  await expect(wizard.getByText("選定を保留・確認が必要", { exact: true })).toBeVisible();
  await expect(wizard.getByRole("link", { name: /Amazon|楽天で一般検索/ })).toHaveCount(0);
});
