import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectTouchSize(locator: ReturnType<Page["locator"]>) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
}

for (const width of [375, 390]) {
  test.describe(`safe AI primary actions ${width}px @smoke`, () => {
    test.use({ viewport: { width, height: 812 }, isMobile: true, hasTouch: true });

    test("検索・チャット・計算・法令・化学物質を片手幅で操作できる", async ({ page }, testInfo) => {
      test.setTimeout(120_000);

      await page.goto("/search");
      await page.locator('[data-search-client-ready="true"]').waitFor();
      const searchInput = page.getByRole("searchbox", { name: "サイト内を横断検索" });
      await searchInput.fill("アーク溶接");
      const clear = page.getByRole("button", { name: "検索語をクリア" });
      const searchSubmit = page.locator('form[role="search"] button[type="submit"]');
      await expectTouchSize(searchInput);
      await expectTouchSize(clear);
      await expectTouchSize(searchSubmit);
      await expectNoHorizontalOverflow(page);
      await capture(page, testInfo, "site-search");
      await searchSubmit.click();
      await clear.click();
      await expect(searchInput).toHaveValue("");
      await expect(clear).toHaveCount(0);

      await page.goto("/chatbot");
      const question = page.getByRole("textbox", { name: "質問入力" });
      const send = page.getByRole("button", { name: "送信", exact: true });
      await question.fill("足場の手すりは？");
      await expect(send).toBeEnabled();
      await expectTouchSize(question);
      await expectTouchSize(send);
      const navOverlap = await page.evaluate(() => {
        const sendButton = document.querySelector<HTMLButtonElement>('form button[type="submit"]');
        const bottomNav = [...document.querySelectorAll("nav")].find((nav) => {
          const rect = nav.getBoundingClientRect();
          return getComputedStyle(nav).position === "fixed" && rect.width > 0 && rect.height > 0;
        });
        if (!sendButton || !bottomNav) return null;
        return sendButton.getBoundingClientRect().bottom - bottomNav.getBoundingClientRect().top;
      });
      expect(navOverlap).not.toBeNull();
      expect(navOverlap!).toBeLessThanOrEqual(0);
      await expectNoHorizontalOverflow(page);
      await capture(page, testInfo, "chat-composer");
      // AIへの送信は行わない。

      await page.goto("/tools/construction-calculators/concrete-quantity");
      await page.locator('fieldset[aria-label="計算入力"]:not([disabled])').waitFor();
      const calculate = page.getByRole("button", { name: "計算する", exact: true });
      await page.getByRole("button", { name: "例の数字で試す" }).click();
      await expectTouchSize(calculate);
      await calculate.click();
      await expect(page.locator("#calculation-result-title")).toBeVisible();
      await expect(page.locator('section[aria-labelledby="calculator-history-title"] li').first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await capture(page, testInfo, "calculator-result");

      await page.goto("/law-search");
      const articleNumber = page.getByRole("searchbox", { name: "条番号で検索" });
      const example = page.getByRole("button", { name: "安衛法 第61条", exact: true });
      // SSR直後のクリックがhydrationより早い場合は、入力値が反映されるまで再試行する。
      await expect(async () => {
        await example.click();
        await expect(articleNumber).toHaveValue("第61条", { timeout: 1_000 });
      }).toPass({ timeout: 20_000 });
      const lawArticle = page.locator("article").filter({ hasText: "第61条" });
      await expect(lawArticle).toHaveCount(1);
      await expect(lawArticle).toContainText("安衛法");
      await expectTouchSize(articleNumber);
      await expectNoHorizontalOverflow(page);
      await lawArticle.scrollIntoViewIfNeeded();
      await capture(page, testInfo, "law-article-61");

      await page.goto("/chemical-database");
      const chemicalInput = page.getByRole("searchbox", { name: "物質名・CAS番号で検索" }).first();
      const filteredRows = page.locator('table[aria-describedby="chemical-list-legend"] tbody tr');
      const chemicalRow = filteredRows.filter({ hasText: "108-88-3" }).first();
      // 化学物質一覧もhydration後に絞り込みが機能するまで待つ。
      await expect(async () => {
        await chemicalInput.fill("108-88-3");
        await expect(chemicalInput).toHaveValue("108-88-3", { timeout: 2_000 });
        await expect(filteredRows).toHaveCount(1, { timeout: 2_000 });
        await expect(chemicalRow).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
      await expect(chemicalRow).toContainText("トルエン");
      await expectTouchSize(chemicalInput);
      await expectNoHorizontalOverflow(page);
      await chemicalRow.scrollIntoViewIfNeeded();
      await capture(page, testInfo, "chemical-cas-108-88-3");
    });
  });
}
