import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTE = "/resources/netis-safety";

test("390px初期画面で画像カテゴリを先に選べる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();

  const categories = ["重機接触", "立入禁止", "墜落・転落", "暑熱・作業環境"];
  for (const label of categories) {
    const button = page.getByRole("button", { name: label, exact: true });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  }

  await expect(page.getByText("当サイトで出典を確認した10件を掲載しています。NETIS全登録技術の一覧ではありません。")).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "重機接触：5件" })).toBeFocused();
  await expect(page.getByText(/ヒヤリハンター/)).toBeVisible();
  await expect(page.getByText(/ドボレコJK/)).toBeVisible();
  await expect(page.getByText(/ハーネスノーティファイ/)).toHaveCount(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "重機接触：5件" })).toBeVisible();
  await expect(page.getByRole("button", { name: "重機接触" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "墜落・転落", exact: true }).click();
  await expect(page).toHaveURL(/risk=fall-prevention/);
  await expect(page.getByRole("heading", { name: "墜落・転落：2件" })).toBeVisible();
  await expect(page.getByText(/ハーネスノーティファイ/)).toBeVisible();
  await expect(page.getByText(/ヒヤリハンター/)).toHaveCount(0);

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/risk=machine-collision/);
  await expect(page.getByRole("heading", { name: "重機接触：5件" })).toBeVisible();
});

test("暑熱2件を表示し、検索・再読込・解除をURLから復元する", async ({ page }) => {
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
  await expect(page.getByRole("heading", { name: "暑熱・作業環境：2件" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /熱中対策バンド/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /TECHNO BAND/ })).toBeVisible();

  await page.getByLabel(/名称・登録番号・用途/).fill("存在しない技術");
  await page.getByRole("button", { name: "掲載技術を検索" }).click();
  await expect(page).toHaveURL(/risk=heat-environment&q=/);
  await expect(page.getByRole("heading", { name: "暑熱・作業環境：0件" })).toBeFocused();
  await expect(page.getByText("条件に合う当サイト掲載技術は0件です")).toBeVisible();
  await expect(page.getByRole("link", { name: /NETIS公式検索を開く/ })).toHaveAttribute(
    "href",
    "https://www.netis.mlit.go.jp/netis/input/pubsearch/search",
  );
  await expect(page.getByRole("status")).toContainText("0件表示しました");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
  await expect(page.getByLabel(/名称・登録番号・用途/)).toHaveValue("存在しない技術");
  await expect(page.getByRole("heading", { name: "暑熱・作業環境：0件" })).toBeVisible();
  await page.getByRole("button", { name: "検索を解除" }).click();
  await expect(page).toHaveURL(/risk=heat-environment$/);
  await expect(page.getByRole("heading", { name: "暑熱・作業環境：2件" })).toBeFocused();
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel(/名称・登録番号・用途/)).toHaveValue("存在しない技術");
  await expect(page.getByRole("heading", { name: "暑熱・作業環境：0件" })).toBeVisible();
  await page.goForward({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel(/名称・登録番号・用途/)).toHaveValue("");
  await expect(page.getByRole("heading", { name: "暑熱・作業環境：2件" })).toBeVisible();

  await page.getByRole("button", { name: "掲載全10件を見る" }).click();
  await expect(page).toHaveURL(new RegExp(`${ROUTE}$`));
  await expect(page.getByRole("heading", { name: "当サイト掲載：10件" })).toBeVisible();
});

test("選択済みカテゴリの再操作でも結果へ移動し、未知の値は全10件へ戻す", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${ROUTE}?risk=restricted-zone&from=review`);
  await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
  const restricted = page.getByRole("button", { name: "立入禁止", exact: true });
  await expect(restricted).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "立入禁止：3件" })).toBeVisible();
  await expect(page.getByText(/パノラマOプレミアム/)).toBeVisible();
  await expect(page.getByText(/MICS-AI/)).toBeVisible();
  await restricted.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "立入禁止：3件" })).toBeFocused();

  await page.getByRole("button", { name: "掲載全10件を見る" }).click();
  await expect(page).toHaveURL(`${page.url().split("?")[0]}?from=review`);
  await expect(page.locator("#netis-technology-results article")).toHaveCount(10);
  await page.goto(`${ROUTE}?risk=unknown`);
  await expect(page.getByRole("heading", { name: "当サイト掲載：10件" })).toBeVisible();
  await expect(page.getByText("カテゴリ代表画像には現場・機材の写真と3Dモデル図が含まれます。掲載技術固有の製品写真・画面ではありません。")).toBeVisible();
});

test("カテゴリと結果のARIA・コントラストに問題がない", async ({ page }) => {
  for (const query of ["", "?risk=heat-environment&q=存在しない技術"]) {
    await page.goto(`${ROUTE}${query}`);
    await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
    const accessibility = await new AxeBuilder({ page })
      .include('[data-netis-explorer-ready="true"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  }
});

test("全10件へ戻す操作で検索も解除し、戻るで条件を復元する", async ({ page }) => {
  await page.goto(`${ROUTE}?risk=heat-environment&q=存在しない技術&from=review`);
  await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "暑熱・作業環境：0件" })).toBeVisible();
  await page.getByRole("button", { name: "掲載全10件を見る" }).click();
  await expect(page).toHaveURL(`${page.url().split("?")[0]}?from=review`);
  await expect(page.locator("#netis-technology-results article")).toHaveCount(10);
  await expect(page.getByLabel(/名称・登録番号・用途/)).toHaveValue("");
  await expect(page.getByRole("heading", { name: "当サイト掲載：10件" })).toBeFocused();
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel(/名称・登録番号・用途/)).toHaveValue("存在しない技術");
  await expect(page.getByRole("heading", { name: "暑熱・作業環境：0件" })).toBeVisible();
  await page.getByRole("button", { name: "掲載技術を検索" }).click();
  await expect(page.getByRole("heading", { name: "暑熱・作業環境：0件" })).toBeFocused();
});

test("320px・390px・1440pxで横にはみ出さず詳細と公式リンクを操作できる", async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${ROUTE}?risk=fall-prevention`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const details = page
      .locator("article")
      .filter({ hasText: "KT-230282-A" })
      .locator("details");
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
    const controls = await page.locator('[data-netis-explorer-ready="true"] button, [data-netis-explorer-ready="true"] a, [data-netis-explorer-ready="true"] summary').evaluateAll((elements) =>
      elements
        .map((element) => ({ name: element.textContent, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0)
        .map(({ name, rect }) => ({ name, width: rect.width, height: rect.height })),
    );
    for (const control of controls) {
      expect(control.height, `${viewport.width}px ${control.name}`).toBeGreaterThanOrEqual(44);
      expect(control.width, `${viewport.width}px ${control.name}`).toBeGreaterThanOrEqual(44);
    }
    await page.keyboard.press("Space");
    await expect(details).not.toHaveAttribute("open", "");
  }
});

test("カードの名称・画像からNETIS公式詳細へ進み、戻るで絞り込み・検索・位置・フォーカスを復元する", async ({ page }) => {
  // 外部NETISはテストで叩かず、同一タブ遷移先をスタブする
  await page.route("https://www.netis.mlit.go.jp/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>NETIS stub</title><p>NETIS detail stub</p>" }),
  );
  for (const viewport of [
    { width: 320, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${ROUTE}?risk=machine-collision&q=${encodeURIComponent("センサー")}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
    await expect(page.locator("#netis-technology-results article")).toHaveCount(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBeLessThanOrEqual(1);

    for (const article of await page.locator("#netis-technology-results article").all()) {
      await expect(article.locator("a[aria-hidden='true']")).toBeVisible();
      await expect(article.getByRole("heading", { level: 4 })).toBeVisible();
      await expect(article.getByText(/^[A-Z]{2}-\d{6}-(?:A|VE)$/)).toBeVisible();
      const box = await article.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }

    // キーボード：名称リンクをEnterで開く
    const nameLink = page.getByRole("link", { name: /ハッとセンサー\s*（NETIS公式の詳細を開く）/ });
    await nameLink.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(0);
    await nameLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/netis\.mlit\.go\.jp\/netis\/pubsearch\/details\?regNo=KK-210002/);

    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/risk=machine-collision&q=/);
    await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
    await expect(page.getByLabel(/名称・登録番号・用途/)).toHaveValue("センサー");
    await expect(nameLink).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(scrollBefore - 40);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(scrollBefore + 40);

    // 画像クリックも同じ詳細へ
    await page
      .locator("article")
      .filter({ hasText: "KT-180097-VE" })
      .locator("a[aria-hidden='true']")
      .click();
    await expect(page).toHaveURL(/regNo=KT-180097/);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/risk=machine-collision&q=/);
    await expect(page.getByRole("heading", { name: "重機接触：2件" })).toBeVisible();
  }
});

test("効率化参考技術を目的・分類・検索から探し、現行登録未確認を表示する", async ({ page }, testInfo) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${ROUTE}?purpose=efficiency`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-netis-explorer-ready="true"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "作業効率化候補：17件" })).toBeVisible();
    await expect(page.locator("#netis-technology-results article")).toHaveCount(17);
    for (const category of ["測量・出来形", "記録・点検", "現場測量・土量", "施工計画・3D記録", "重機・機械化", "道路作業・区画線"]) {
      const button = page.getByRole("button", { name: category });
      await expect(button.locator("img")).toBeVisible();
      expect(await button.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    }
    await page.screenshot({ path: testInfo.outputPath(`efficiency-categories-${width}.png`), fullPage: false });
    await expect(page.getByText(/効率化の第1陣6件のうち5件は国交省の2026年4月一覧.*第2陣14件は同4月一覧の参考技術です/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "測量・出来形" }).click();
    await expect(page).toHaveURL(/purpose=efficiency.*risk=survey-measurement|risk=survey-measurement.*purpose=efficiency/);
    await expect(page.getByRole("heading", { name: "測量・出来形：3件" })).toBeVisible();
    await page.getByLabel(/名称・登録番号・用途/).fill("ScanX");
    await page.getByRole("button", { name: "掲載技術を検索" }).click();
    await expect(page.getByRole("heading", { name: "測量・出来形：1件" })).toBeVisible();
    await expect(page.locator("#netis-technology-results article")).toContainText(["現行登録未確認"]);
  }
});

test("末尾付きNETIS番号で効率化候補を一意に探せる", async ({ page }) => {
  await page.goto(`${ROUTE}?purpose=efficiency&q=KT-210020-A`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "作業効率化候補：1件" })).toBeVisible();
  await expect(page.locator("#netis-technology-results article")).toHaveCount(1);
  await expect(page.locator("#netis-technology-results article")).toContainText("ScanX");
});

test("第2陣14件を目的別に探し、資料時点と写真権利を確認できる", async ({ page }, testInfo) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${ROUTE}?purpose=quality`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "品質・検査候補：3件" })).toBeVisible();
    const qualityButton = page.getByRole("button", { name: "品質・検査", exact: true });
    await expect(qualityButton.locator("img")).toBeVisible();
    expect(await qualityButton.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath(`wave2-quality-${width}.png`), fullPage: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  await page.getByText("写真の出典・ライセンスを確認").click();
  await expect(page.getByRole("link", { name: "A Road Roller working on an arterial road in Amaravati.jpg" })).toBeVisible();
  await page.getByRole("button", { name: "作業を効率化" }).click();
  await page.getByLabel(/名称・登録番号・用途/).fill("KT-230092-A");
  await page.getByRole("button", { name: "掲載技術を検索" }).click();
  await expect(page.getByRole("heading", { name: "作業効率化候補：1件" })).toBeVisible();
  await expect(page.locator("#netis-technology-results article")).toContainText("2026年4月公式一覧掲載");
  await expect(page.locator("#netis-technology-results article")).toContainText("9月現行NETIS個別状態未確認");
});
