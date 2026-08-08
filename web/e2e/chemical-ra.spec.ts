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

  test("化学物質DB → リスクアセスメントへの相互導線が機能する", async ({ page }) => {
    await page.goto("/chemical-database");
    await page.waitForLoadState("networkidle");
    // 本文の使い分け案内から、表示中のRA導線へ到達できる。
    const raLink = page
      .getByRole("main")
      .getByRole("link", { name: "化学物質RA", exact: true })
      .first();
    await expect(raLink).toBeVisible({ timeout: 5000 });
    await expect(raLink).toHaveAttribute("href", "/chemical-ra");
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
