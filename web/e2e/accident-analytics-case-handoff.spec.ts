import { expect, test } from "@playwright/test";

test("統計の対応条件を事例検索へ渡し、解除できる", async ({ page }) => {
  test.setTimeout(90000);
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration|server rendered html/i.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    if (/hydration|server rendered html/i.test(error.message)) hydrationErrors.push(error.message);
  });
  const params = new URLSearchParams({
    industry: "建設業",
    type: "墜落・転落",
    year: "2024",
    severity: "死亡",
    month: "1",
  });
  await page.goto(`/accidents-analytics?${params}`, { waitUntil: "domcontentloaded" });

  const handoff = page.getByTestId("analytics-case-handoff");
  const link = handoff.getByRole("link", { name: "この条件に対応する事例を探す" });
  await expect(link).toHaveAttribute("href", /acc_industries=construction/);
  await expect(link).toHaveAttribute("href", /acc_hazard=fall/);
  await expect(link).toHaveAttribute("href", /acc_year=2024/);
  await expect(link).toHaveAttribute("href", /acc_severity=/);
  await expect(handoff).toContainText("引き継げない条件: 月: 1");
  await expect(handoff).toContainText("統計の対象件数と事例検索の件数は一致しません");

  await link.click();
  await expect(page).toHaveURL(/\/accidents\?/);
  await expect(page.locator("#accident-results")).toBeVisible();
  await page.locator("#accident-results details").first().locator("summary").click();
  await expect(page.locator("#accident-hazard-filter")).toHaveValue("fall");
  await expect(page.locator("#accident-year-filter")).toHaveValue("2024");
  await expect(page.locator("#accident-severity-filter")).toHaveValue("死亡");

  await expect(page.getByLabel("事例検索の適用条件")).toContainText("業種: 建設");
  await expect(page.getByLabel("事例検索の適用条件")).toContainText("年: 2024年");
  await expect(page.locator("#accident-results")).toContainText("0件");
  await page.locator("#accident-severity-filter").selectOption("");
  await expect(page).not.toHaveURL(/acc_severity=/);
  await expect(page.locator("#accident-severity-filter")).toHaveValue("");
  await page.locator("#accident-year-filter").selectOption("");
  await expect(page).not.toHaveURL(/acc_year=/);
  const cards = page.locator("#accident-results article");
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  for (let index = 0; index < count; index++) {
    await expect(cards.nth(index)).toContainText("建設業");
  }
  await page.getByRole("button", { name: "すべての絞り込みを解除" }).click();
  await expect(page).not.toHaveURL(/acc_(?:hazard|year|severity|industries)=/);
  await expect(page.locator("#accident-hazard-filter")).toHaveValue("");
  await expect(page.locator("#accident-year-filter")).toHaveValue("");
  await page.locator("#accident-type-filter").selectOption("転倒");
  await expect(page).toHaveURL(/acc_type=/);
  await page.locator("#accident-hazard-filter").selectOption("fall");
  await expect(page.locator("#accident-type-filter")).toHaveValue("すべて");
  await expect(page).not.toHaveURL(/acc_type=/);
  await expect(page).toHaveURL(/acc_hazard=fall/);
  expect(hydrationErrors).toEqual([]);
});

test("直接URLと戻る操作では有効な統計事故型が旧事故型に優先する", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/accidents?acc_type=転倒&acc_hazard=fall", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#accident-results")).toBeVisible();
  await expect(page).not.toHaveURL(/acc_type=/);
  await page.locator("#accident-results details").first().locator("summary").click();
  await expect(page.locator("#accident-type-filter")).toHaveValue("すべて");
  await expect(page.locator("#accident-hazard-filter")).toHaveValue("fall");
  await expect(page.locator("#accident-results article").first()).toBeVisible();

  await page.evaluate(() => {
    window.history.pushState(null, "", "/accidents?acc_type=転倒");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.locator("#accident-type-filter")).toHaveValue("転倒");
  await expect(page.locator("#accident-hazard-filter")).toHaveValue("");
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#accident-type-filter")).toHaveValue("すべて");
  await expect(page.locator("#accident-hazard-filter")).toHaveValue("fall");
  await expect(page).not.toHaveURL(/acc_type=/);
});

test("無効な統計事故型では旧事故型を維持する", async ({ page }) => {
  await page.goto("/accidents?acc_type=転倒&acc_hazard=unknown", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#accident-results")).toBeVisible();
  await page.locator("#accident-results details").first().locator("summary").click();
  await expect(page.locator("#accident-type-filter")).toHaveValue("転倒");
  await expect(page.locator("#accident-hazard-filter")).toHaveValue("");
  await expect(page).toHaveURL(/acc_type=/);
});
