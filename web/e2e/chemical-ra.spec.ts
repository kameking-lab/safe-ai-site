import { test, expect, type Page } from "@playwright/test";

async function openSaveReadyChemicalRa(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.route("**/api/chemical-ra", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        chemicalName: "トルエン",
        casNumber: "108-88-3",
        flashPoint: "4℃",
        exposureLimit: "50 ppm",
        ghsHazards: [],
        ppeRecommendations: [],
        safetyMeasures: [],
        emergencyMeasures: [],
        regulatoryNotes: [],
        relatedHazards: [],
        assessmentStatus: "unavailable",
        assessmentNotice: "公式SDSと専門家による最終確認が必要です。",
        aiStatus: "disabled_for_safety",
      }),
    });
  });
  await page.goto("/chemical-ra?name=トルエン&run=1");
  await expect(page.getByRole("button", { name: "この結果を保存" })).toBeVisible();
}

test.describe("化学物質RA", () => {
  test("長い条件記録を保存・再表示しても原本の条件と記録日を印刷に保持する", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    // 架空の印刷試験入力。安全性や対策効果を主張する実施記録ではない。
    const lines = (label: string, count: number) => Array.from({ length: count }, (_, index) =>
      `${label}${String(index + 1).padStart(2, "0")}: 印刷試験用の架空条件です。作業場所、容器、確認事項を別々に記録し、現場への適用は人が確認します。`,
    ).join("\n");
    const work = lines("作業行", 25);
    const existing = lines("既存行", 18);
    const additional = lines("追加行", 22);
    const ppe = lines("保護具行", 12);
    const componentVersion = `印刷試験製品版-${"VERSION1234567890".repeat(12)}-VERSION-END`;
    let cloudRequests = 0;
    let assessmentRequests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/chemical-ra") && request.method() === "POST") assessmentRequests += 1;
    });
    await page.route("**/api/chemical/ra-records", async (route) => {
      cloudRequests += 1;
      await route.fulfill({ status: 500, body: "{}" });
    });
    await page.clock.setFixedTime(new Date("2026-10-08T03:00:00Z"));
    const search = page.waitForResponse((response) => response.url().includes("/api/chemical/search") && response.request().method() === "POST");
    await page.goto("/chemical-ra?cas=108-88-3");
    expect((await search).status()).toBe(200);
    await expect(page.getByRole("combobox", { name: "物質名・CAS番号・SDS記載名" })).toHaveValue("トルエン");
    await page.getByRole("button", { name: "作業条件へ進む", exact: true }).click();
    await page.getByLabel("作業内容（任意）— 最新SDS・公式ツール確認用のメモ").fill(work);
    await page.getByLabel("作業時間（時間/日）", { exact: true }).fill("1");
    await page.getByRole("combobox", { name: "SDS確認状況", exact: true }).selectOption("not-confirmed");
    await page.getByLabel("SDS発行日", { exact: true }).fill("2026-10-01");
    await page.getByLabel("成分・製品版", { exact: true }).fill(componentVersion);
    await page.getByRole("combobox", { name: "換気", exact: true }).selectOption("local");
    await page.getByRole("combobox", { name: "全体換気", exact: true }).selectOption("yes");
    await page.getByRole("combobox", { name: "局所排気", exact: true }).selectOption("yes");
    await page.getByRole("combobox", { name: "取扱量", exact: true }).selectOption("small");
    await page.getByLabel("使用温度（℃）", { exact: true }).fill("25");
    await page.getByRole("combobox", { name: "作業頻度", exact: true }).selectOption("weekly");
    await page.getByRole("combobox", { name: "飛散・噴霧の状態", exact: true }).selectOption("vapor");
    await page.getByRole("combobox", { name: "皮膚接触の可能性", exact: true }).selectOption("yes");
    await page.getByRole("textbox", { name: /^使用する保護具/ }).fill(ppe);
    await page.getByRole("combobox", { name: "保護具の適合性", exact: true }).selectOption("not-confirmed");
    await page.getByRole("combobox", { name: "代替物質の検討", exact: true }).selectOption("not-considered");
    await page.getByRole("textbox", { name: /^既存措置/ }).fill(existing);
    await page.getByRole("textbox", { name: /^追加措置/ }).fill(additional);
    await page.getByLabel("担当", { exact: true }).fill("印刷試験の記録担当");
    await page.getByLabel("期限", { exact: true }).fill("2026-10-15");
    await page.getByLabel("再評価日", { exact: true }).fill("2026-10-16");
    const [response] = await Promise.all([
      page.waitForResponse((value) => value.url().endsWith("/api/chemical-ra") && value.request().method() === "POST"),
      page.getByRole("button", { name: "公的情報を確認", exact: true }).click(),
    ]);
    expect(response.status()).toBe(200);
    await page.getByRole("button", { name: "この結果を保存", exact: true }).click();
    await expect(page.getByText(/クラウドへは送信していません/).first()).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("safe-ai:chemical-ra-records:v1")!)[0] as {
      raId: string; savedAt: string; payload: { assessmentSnapshot: { workContent: string; controls: { existing: string; additional: string }; ppe: { description: string } } };
    });
    expect(saved.payload.assessmentSnapshot.workContent).toBe(work);
    expect(saved.payload.assessmentSnapshot.controls).toEqual({ existing, additional });
    expect(saved.payload.assessmentSnapshot.ppe.description).toBe(ppe);
    await page.clock.setFixedTime(new Date("2026-10-20T03:00:00Z"));
    await page.goto(`/chemical-ra?raId=${encodeURIComponent(saved.raId)}`);
    await expect(page.getByText("保存済みの参考情報記録を表示中", { exact: true })).toBeVisible();
    await expect(page.getByText("変更を印刷に反映するには保存してください。", { exact: true })).toBeVisible();
    await expect(page.getByLabel("作業内容（任意）— 最新SDS・公式ツール確認用のメモ")).toHaveValue(work);
    await expect(page.getByLabel("作業時間（時間/日）", { exact: true })).toHaveValue("1");
    // 未保存の編集を、保存当時の記録や分類に混ぜない。
    await page.getByLabel("作業内容（任意）— 最新SDS・公式ツール確認用のメモ").fill("未保存の編集内容");
    await page.getByLabel("作業時間（時間/日）", { exact: true }).fill("9");
    await page.emulateMedia({ media: "print" });
    const report = page.getByTestId("chemical-ra-print-report");
    await expect(report).toBeVisible();
    for (const value of [work, existing, additional, ppe, componentVersion, "記録日: 2026年10月8日", "1 時間/日", "SDS確認", "不足・未確認", "未評価", "VERSION-END", "参照資料", "確認欄"]) {
      await expect(report).toContainText(value);
    }
    await expect(report).not.toContainText("未保存の編集内容");
    await expect(report).not.toContainText("9 時間/日");
    await expect(report.locator("tbody tr")).toHaveCount(7);
    await page.emulateMedia({ media: "screen" });
    await page.getByLabel("作業内容（任意）— 最新SDS・公式ツール確認用のメモ").fill(work);
    await page.getByLabel("作業時間（時間/日）", { exact: true }).fill("8");
    const editedComponentVersion = `${componentVersion} / SDS-v2`;
    await page.getByLabel("成分・製品版", { exact: true }).fill(editedComponentVersion);
    await page.getByLabel("SDS発行日", { exact: true }).fill("2026-10-19");
    await page.getByRole("button", { name: "この結果を保存", exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("safe-ai:chemical-ra-records:v1")!).length)).toBe(2);
    const copies = await page.evaluate(() => JSON.parse(localStorage.getItem("safe-ai:chemical-ra-records:v1")!) as typeof saved[]);
    expect(copies.find((record) => record.raId === saved.raId)).toEqual(saved);
    const latest = copies.find((record) => record.raId !== saved.raId)!;
    await page.emulateMedia({ media: "print" });
    await expect(report).toContainText("8 時間/日");
    await expect(report).toContainText("SDS-v2");
    await expect(report).toContainText("2026-10-19");
    await expect(report).toContainText("記録日: 2026年10月20日");
    await expect(page).toHaveURL(new RegExp(`raId=${latest.raId}`));
    await page.emulateMedia({ media: "screen" });
    await page.reload();
    await expect(page.getByLabel("作業時間（時間/日）", { exact: true })).toHaveValue("8");
    await expect(page.getByLabel("成分・製品版", { exact: true })).toHaveValue(editedComponentVersion);
    await page.emulateMedia({ media: "print" });
    for (const value of [work, existing, additional, ppe, editedComponentVersion, "8 時間/日", "記録日: 2026年10月20日", "不足・未確認", "未評価", "参照資料", "確認欄"]) await expect(report).toContainText(value);
    const pdfPath = testInfo.outputPath("long-saved-ra.pdf");
    await page.pdf({ path: pdfPath, format: "A4", preferCSSPageSize: true, printBackground: false });
    await testInfo.attach("長い保存RA-A4", { path: pdfPath, contentType: "application/pdf" });
    await testInfo.attach("入力条件", { body: JSON.stringify({ work, existing, additional, ppe, componentVersion: editedComponentVersion, savedAt: latest.savedAt }), contentType: "application/json" });
    expect(assessmentRequests).toBe(1);
    expect(cloudRequests).toBe(0);
  });

  for (const item of [
    { cas: "108-88-3", name: "トルエン", count: 7 },
    { cas: "67-64-1", name: "アセトン", count: 5 },
    { cas: "64-17-5", name: "エタノール", count: 6 },
  ]) {
    test(`${item.name}の実API分類・炎・一部収録注記を印刷にも保持する @smoke`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      const searchPromise = page.waitForResponse((response) =>
        response.url().includes("/api/chemical/search") && response.request().method() === "POST",
      );
      await page.goto(`/chemical-ra?cas=${item.cas}`);
      expect((await searchPromise).status()).toBe(200);
      await expect(page.getByRole("combobox", { name: "物質名・CAS番号・SDS記載名" })).toHaveValue(item.name);
      await page.getByRole("button", { name: "作業条件へ進む", exact: true }).click();
      await page.getByLabel("作業時間（時間/日）", { exact: true }).fill("1");
      await page.getByLabel("作業内容（任意）— 最新SDS・公式ツール確認用のメモ").fill("容器から移す");
      const [response] = await Promise.all([
        page.waitForResponse((value) => value.url().endsWith("/api/chemical-ra") && value.request().method() === "POST"),
        page.getByRole("button", { name: "公的情報を確認", exact: true }).click(),
      ]);
      expect(response.status()).toBe(200);
      const data = await response.json();
      const conclusion = page.getByTestId("ra-conclusion");
      await expect(conclusion.getByTestId("ghs-picto-flame")).toBeVisible();
      await expect(conclusion).toContainText("引火性液体");
      await expect(conclusion).toContainText("GHS分類は一部収録です");
      const report = page.getByTestId("chemical-ra-print-report");
      await expect(report).toBeHidden();
      await page.emulateMedia({ media: "print" });
      await expect(report).toBeVisible();
      await expect(report.getByTestId("ghs-picto-flame")).toBeVisible();
      await expect(report.getByTestId("chemical-ra-print-coverage")).toContainText("未確認");
      await expect(report).toContainText("1 時間/日");
      await expect(report).toContainText("容器から移す");
      await expect(report).toContainText("不足・未確認");
      await expect(report).toContainText("正式なRA結果ではありません");
      await expect(report.locator("tbody tr")).toHaveCount(item.count);
      for (const hazard of data.ghsHazards) {
        await expect(report).toContainText(hazard.category);
        await expect(report).toContainText(hazard.classification);
      }
      await expect(conclusion).toBeHidden();
      await expect(page.locator("[data-primary-task]")).toBeHidden();
      const pdfPath = testInfo.outputPath(`chemical-${item.cas}.pdf`);
      await page.pdf({ path: pdfPath, format: "A4", preferCSSPageSize: true, printBackground: false });
      await testInfo.attach(`A4-${item.cas}`, { path: pdfPath, contentType: "application/pdf" });
      await page.emulateMedia({ media: "screen" });
      await expect(conclusion).toBeVisible();
      // 既存のKY導線は維持する。今回の変更は印刷だけ。
      if (item.cas === "108-88-3") {
        await page.getByRole("link", { name: "この作業条件をKYへ", exact: true }).click();
        await expect(page).toHaveURL(/\/ky\/paper/);
        await expect(page.getByText(/化学物質条件を候補として読み込みました。GHS分類は一部収録です/)).toBeVisible();
      }
    });
  }
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/chemical-ra");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Dataset または SoftwareApplication 構造化データが含まれる", async ({ page }) => {
    await page.goto("/chemical-ra");
    const allTexts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const types = allTexts
      .map((t) => {
        try {
          const parsed = JSON.parse(t);
          return Array.isArray(parsed) ? parsed.map((p) => p["@type"]) : [parsed["@type"]];
        } catch {
          return [];
        }
      })
      .flat();
    // Dataset (RA データ) または SoftwareApplication (RA ツール) のいずれか
    const hasRelevant = types.some((t) =>
      ["Dataset", "SoftwareApplication"].includes(t as string),
    );
    expect(hasRelevant).toBe(true);
  });

  test("化学物質DB → RA準備への相互導線が機能する", async ({ page }) => {
    await page.goto("/chemical-database");
    await page.waitForLoadState("networkidle");
    // 本文の使い分け案内から、表示中のRA導線へ到達できる。
    const raLink = page
      .getByRole("main")
      .getByText("このページの使い分け：", { exact: true })
      .locator("..")
      .getByRole("link", { name: "化学物質RA準備", exact: true });
    await expect(raLink).toBeVisible({ timeout: 5000 });
    await expect(raLink).toHaveAttribute("href", "/chemical-ra");
    await raLink.click();
    await expect(page).toHaveURL(/\/chemical-ra$/u);
    await expect(page.getByRole("heading", { level: 1, name: "化学物質RA準備", exact: true })).toBeVisible();
  });

  test("例の物質名をURLへ載せず同一タブで検索欄へ引き継ぐ", async ({ page }) => {
    const requestedUrls: string[] = [];
    page.on("request", (request) => requestedUrls.push(request.url()));
    await page.goto("/chemical-ra");

    await page
      .getByText("職種別クイックスタート（例から選ぶ）", { exact: true })
      .click();
    const link = page.getByRole("link", { name: "トルエン", exact: true });
    await expect(link).toHaveAttribute("href", "/chemical-ra");
    await link.click();

    await expect(page).toHaveURL(/\/chemical-ra$/u);
    await expect(page.locator("#chemical-onebox-input")).toHaveValue("トルエン");
    expect(requestedUrls.join("\n")).not.toContain(encodeURIComponent("トルエン"));
  });

  test("製品検索から固定URLで物質名を引き継ぎ主操作へ進める", async ({ page }) => {
    const requestedUrls: string[] = [];
    page.on("request", (request) => requestedUrls.push(request.url()));
    await page.route("**/api/sds/search", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          source: "internal-db",
          hits: [
            {
              id: "privacy-e2e-product",
              productName: "試験用塗料",
              manufacturer: "試験メーカー",
              category: "塗料",
              use: "塗装",
              sdsRevised: "2026-08-01",
              components: [
                {
                  cas: "108-88-3",
                  name: "トルエン",
                  contentPct: 50,
                  contentLabel: "40-60%",
                },
              ],
            },
          ],
        }),
      });
    });
    await page.goto("/chemical-ra/product-search");
    await page.getByLabel("製品名／型番").fill("試験用塗料");
    await page.getByRole("button", { name: "SDS DBを検索" }).click();

    const raLink = page.getByRole("link", { name: "収録済み成分情報を確認" });
    await expect(raLink).toHaveAttribute("href", "/chemical-ra");
    await raLink.click();

    await expect(page).toHaveURL(/\/chemical-ra$/u);
    await expect(page.locator("#chemical-onebox-input")).toHaveValue("トルエン");
    await page.getByRole("button", { name: "作業条件へ進む" }).click();
    await expect(
      page.getByLabel("作業内容（任意）— 最新SDS・公式ツール確認用のメモ"),
    ).toBeVisible();
    expect(requestedUrls.join("\n")).not.toContain(encodeURIComponent("トルエン"));
  });

  test("クラウド未同意では保存APIへ本文を送らず、ローカル保存と表示する", async ({ page }) => {
    let cloudRequests = 0;
    await page.route("**/api/chemical/ra-records", async (route) => {
      cloudRequests += 1;
      await route.fulfill({ status: 500, body: "{}" });
    });
    await openSaveReadyChemicalRa(page);

    await page.getByRole("button", { name: "この結果を保存" }).click();

    await expect(page.getByText(/クラウドへは送信していません/).first()).toBeVisible();
    expect(cloudRequests).toBe(0);
  });

  for (const status of [401, 500]) {
    test(`クラウドPOSTが${status}なら同期失敗と表示し、同期済みにしない`, async ({ page }) => {
      let cloudPosts = 0;
      await page.route("**/api/chemical/ra-records", async (route) => {
        if (route.request().method() === "POST") cloudPosts += 1;
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify({ ok: false }),
        });
      });
      await openSaveReadyChemicalRa(page);
      const cloudConsent = page.getByRole("checkbox", {
        name: /認証済みクラウドへの送信を希望/,
      });
      if (await cloudConsent.isDisabled()) {
        await page.getByRole("button", { name: "この結果を保存" }).click();
        await expect(page.getByText(/クラウドへは送信していません/).first()).toBeVisible();
        await expect(page.getByText(/同期も完了しました/)).toHaveCount(0);
        expect(cloudPosts).toBe(0);
        return;
      }
      await cloudConsent.check();

      await page.getByRole("button", { name: "この結果を保存" }).click();

      await expect(page.getByText(/クラウド同期は失敗しました/).first()).toBeVisible();
      await expect(page.getByText(/同期も完了しました/)).toHaveCount(0);
      expect(cloudPosts).toBe(1);
    });
  }

  test("クラウドPOSTが200かつok=trueのときだけ同期完了と表示する", async ({ page }) => {
    let cloudPosts = 0;
    await page.route("**/api/chemical/ra-records", async (route) => {
      if (route.request().method() === "POST") cloudPosts += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });
    await openSaveReadyChemicalRa(page);
    const cloudConsent = page.getByRole("checkbox", {
      name: /認証済みクラウドへの送信を希望/,
    });
    if (await cloudConsent.isDisabled()) {
      await page.getByRole("button", { name: "この結果を保存" }).click();
      await expect(page.getByText(/クラウドへは送信していません/).first()).toBeVisible();
      await expect(page.getByText(/同期も完了しました/)).toHaveCount(0);
      expect(cloudPosts).toBe(0);
      return;
    }
    await cloudConsent.check();

    await page.getByRole("button", { name: "この結果を保存" }).click();

    await expect(page.getByText(/同期も完了しました/).first()).toBeVisible();
    expect(cloudPosts).toBe(1);
  });
});
