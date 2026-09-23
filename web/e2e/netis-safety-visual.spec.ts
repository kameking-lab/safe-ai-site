import { expect, test } from "@playwright/test";

const ROUTE = "/resources/netis-safety";

test("390px初期画面で画像カテゴリを先に選べる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();

  const firstRow = ["重機接触", "立入禁止"];
  for (const label of firstRow) {
    const button = page.getByRole("button", { name: label, exact: true });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  }

  await expect(page.getByRole("button", { name: "墜落・転落" })).toBeVisible();
  await expect(page.getByRole("button", { name: "暑熱・作業環境" })).toBeVisible();
  const loadedImages = await page
    .locator('[aria-label="安全課題カテゴリ"] img')
    .evaluateAll((images) =>
      images.map((image) => ({
        complete: (image as HTMLImageElement).complete,
        naturalWidth: (image as HTMLImageElement).naturalWidth,
      })),
    );
  expect(loadedImages).toHaveLength(4);
  expect(loadedImages.every(({ complete, naturalWidth }) => complete && naturalWidth > 0)).toBe(true);
});

test("カテゴリ選択、URL再読込、戻るで同じ絞り込みを復元する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();

  await page.getByRole("button", { name: "重機接触", exact: true }).click();
  await expect(page).toHaveURL(/risk=machine-collision/);
  await expect(page.getByRole("heading", { name: "重機接触：3件" })).toBeFocused();
  await expect(page.getByText(/ヒヤリハンター/)).toBeVisible();
  await expect(page.getByText(/ドボレコJK/)).toBeVisible();
  await expect(page.getByText(/ハーネスノーティファイ/)).toHaveCount(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "重機接触：3件" })).toBeVisible();
  await expect(page.getByRole("button", { name: "重機接触" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "墜落・転落", exact: true }).click();
  await expect(page).toHaveURL(/risk=fall-prevention/);
  await expect(page.getByRole("heading", { name: "墜落・転落：1件" })).toBeVisible();
  await expect(page.getByText(/ハーネスノーティファイ/)).toBeVisible();
  await expect(page.getByText(/ヒヤリハンター/)).toHaveCount(0);

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/risk=machine-collision/);
  await expect(page.getByRole("heading", { name: "重機接触：3件" })).toBeVisible();
});

test("暑熱は0件を明示し、キーボード操作と公式検索を保つ", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();

  const machineButton = page.getByRole("button", { name: "重機接触", exact: true });
  await machineButton.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/risk=machine-collision/);
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();

  const heatButton = page.getByRole("button", { name: "暑熱・作業環境", exact: true });
  await heatButton.focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/risk=heat-environment/);
  await expect(page.getByRole("heading", { name: "暑熱・作業環境：0件" })).toBeVisible();
  await expect(page.getByText("このカテゴリの検証済み掲載技術は0件です")).toBeVisible();
  await expect(page.getByRole("link", { name: /NETIS公式検索を開く/ })).toHaveAttribute(
    "href",
    "https://www.netis.mlit.go.jp/netis/input/pubsearch/search",
  );
  await expect(page.getByRole("status")).toContainText("0件表示しました");

  await page.getByRole("button", { name: "全5件を見る" }).click();
  await expect(page).toHaveURL(new RegExp(`${ROUTE}$`));
  await expect(page.getByRole("heading", { name: "全5技術：5件" })).toBeVisible();
});

test("320px・390px・1280pxで横にはみ出さず詳細と公式リンクを操作できる", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${ROUTE}?risk=fall-prevention`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const details = page.locator("details").filter({
      has: page.getByText("仕組み・適用条件を詳しく見る", { exact: true }),
    });
    await details.locator("summary").focus();
    await page.keyboard.press("Space");
    await expect(details).toHaveAttribute("open", "");
    const officialLink = details.getByRole("link", { name: "NETIS公式で照合" });
    await expect(officialLink).toHaveAttribute(
      "href",
      "https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-230282",
    );
    const summaryBox = await details.locator("summary").boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(summaryBox!.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Space");
    await expect(details).not.toHaveAttribute("open", "");
  }
});
