import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function dismissCookieChoice(page: import("@playwright/test").Page) {
  const choice = page.getByRole("region", { name: "任意Cookieの設定" });
  if (await choice.isVisible().catch(() => false)) {
    await choice.getByRole("button", { name: "拒否する" }).click();
  }
}

test("390pxで母集団と有用な構成比が先に見え、年別推移が1688px以内にある", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/accidents-analytics");
  await dismissCookieChoice(page);

  await expect(page.getByRole("heading", { name: "事故分析ダッシュボード" })).toBeVisible();
  await expect(page.getByText("2019〜2024年・収録個票4,782件")).toBeVisible();
  await expect(page.getByText("墜落・転落の構成比").first()).toBeVisible();
  await expect(page.getByText("26.1%", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("1,248 / 4,782件").first()).toBeVisible();

  const meterBox = await page.getByRole("meter", { name: "墜落・転落の構成比" }).boundingBox();
  const trendBox = await page.getByTestId("analytics-year-trend").boundingBox();
  expect(meterBox?.y).toBeLessThan(844);
  expect(trendBox?.y).toBeLessThan(1688);

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("mobile-initial.png") });
});

test("フィルタ・図・URL・ブラウザ戻る・0件表示が同じ条件に揃う", async ({ page }) => {
  await page.goto("/accidents-analytics");
  await dismissCookieChoice(page);

  await page.locator("#industry-filter").selectOption({ label: "建設業" });
  await expect.poll(() => new URL(page.url()).searchParams.get("industry")).toBe("建設業");
  await page.locator("#year-filter").selectOption("2024");
  await expect.poll(() => new URL(page.url()).searchParams.get("year")).toBe("2024");
  await page.locator("#type-filter").selectOption({ label: "墜落・転落" });
  await expect.poll(() => new URL(page.url()).searchParams.get("type")).toBe("墜落・転落");

  const meter = page.getByRole("meter", { name: "墜落・転落の構成比" });
  await expect(meter).toBeVisible();
  await expect(meter).not.toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByRole("button", { name: /CSV/ })).toBeVisible();

  // A different data view must not erase the selected case population.
  await page.getByRole("link", { name: "全国速報", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("view")).toBe("flash");
  await page.getByRole("link", { name: "収録事例", exact: true }).click();
  await expect(page.locator("#type-filter")).toHaveValue("墜落・転落");
  await expect(page.locator("#industry-filter")).toHaveValue("建設業");
  await expect(page.locator("#year-filter")).toHaveValue("2024");
  await page.reload();
  await expect(page.locator("#type-filter")).toHaveValue("墜落・転落");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /CSV/ }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain("建設業 × 墜落・転落 × 2024年");
  const targetCount = (await page.getByTestId("analytics-headline").innerText()).match(/対象\s*([\d,]+)件/)?.[1]?.replaceAll(",", "");
  expect(csv).toContain(`対象件数（件）,${targetCount}`);

  // Return past the tab round-trip, then past the accident-type selection.
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get("type")).toBeNull();
  await expect(page.locator("#industry-filter")).toHaveValue("建設業");
  await expect(page.locator("#year-filter")).toHaveValue("2024");

  await page.goto(
    "/accidents-analytics?industry=%E5%BB%BA%E8%A8%AD%E6%A5%AD&year=2024&type=%E6%BF%80%E7%AA%81%E3%81%95%E3%82%8C&prefecture=%E6%B2%96%E7%B8%84&age=75%7E",
  );
  await expect(page.getByText("この条件に一致する事例はありません")).toBeVisible();
  await expect(page.getByText("この条件に一致する事例がないため、構成比は算出しません。")).toBeVisible();
  await expect(page.getByRole("meter")).toHaveCount(0);
  await expect(page.getByText("NaN")).toHaveCount(0);
  await page.getByRole("button", { name: "全条件をリセット" }).click();
  await expect(page.locator("#industry-filter")).toHaveValue("");
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "26.1");
});

test("全国速報は別タブとして期間を明示し、収録事例の系列へ混ぜない", async ({ page }) => {
  await page.goto("/accidents-analytics?view=flash");
  await dismissCookieChoice(page);

  await expect(page.getByRole("link", { name: "全国速報" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText(/全国速報は発生対象/)).toBeVisible();
  await expect(page.getByText(/収録事例の2019〜2024年系列には接続していません/)).toBeVisible();
  await expect(page.getByTestId("analytics-visual-summary")).toHaveCount(0);
});

test("1440pxでは3図が同じ初期画面に並び、代替表をキーボードで開ける", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/accidents-analytics");
  await dismissCookieChoice(page);

  const visual = page.getByTestId("analytics-visual-summary");
  const boxes = await Promise.all([
    page.getByRole("meter", { name: "墜落・転落の構成比" }).boundingBox(),
    page.getByRole("heading", { name: "月別発生ヒートマップ" }).boundingBox(),
    page.getByTestId("analytics-year-trend").boundingBox(),
  ]);
  expect(boxes.every((box) => box !== null && box.y < 900)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("desktop-initial.png") });
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="analytics-visual-summary"]').analyze();
  expect(accessibility.violations).toEqual([]);

  const summary = visual.getByText("グラフの数値を表で確認");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(visual.getByRole("table")).toBeVisible();
  await expect(visual.getByRole("list", { name: "月別の事故件数" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "サマリーKPI" })).toBeHidden();
  const sources = page.getByText("出典・欠損値と集計の制限", { exact: true });
  await sources.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "厚生労働省・死亡災害データベース" })).toBeVisible();
  await expect(page.getByRole("table", { name: "現在の対象事例のデータ充足" })).toBeVisible();
});
