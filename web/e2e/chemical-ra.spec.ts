import { test, expect, type Page } from "@playwright/test";

async function choose(page: Page, group: string, option: RegExp) {
  await page.getByRole("radiogroup", { name: group }).getByRole("radio", { name: option }).click();
}

async function answerBasics(page: Page) {
  await choose(page, "製品の状態", /^液体$/);
  await choose(page, "1回（1日）に扱う量", /中量/);
  await choose(page, "換気", /窓・換気扇/);
  await page.getByLabel(/1日の作業時間/).selectOption("8");
  await page.getByLabel("日数").selectOption("5");
}

test.describe("化学物質リスクアセスメント", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/chemical-ra");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1, name: "化学物質リスクアセスメント", exact: true })).toBeVisible();
    await expect(page.getByText("厚生労働省 CREATE-SIMPLE の手法に基づく計算")).toBeVisible();
    await expect(page.getByRole("link", { name: /CREATE-SIMPLEを開く|公式CREATE-SIMPLE/ })).toHaveCount(0);
  });

  test("SoftwareApplication 構造化データが含まれる", async ({ page }) => {
    await page.goto("/chemical-ra");
    const types = (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((t) => {
      try {
        const parsed = JSON.parse(t);
        return (Array.isArray(parsed) ? parsed : [parsed]).map((p) => p["@type"]);
      } catch {
        return [];
      }
    });
    expect(types).toContain("SoftwareApplication");
  });

  test("物質を選んで作業条件を答えると、その場でリスクレベルと下げる対策が出る @smoke", async ({ page }) => {
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET") posts.push(request.url());
    });
    await page.goto("/chemical-ra");
    await page.getByLabel("物質名またはCAS番号").fill("トルエン");
    await page.getByRole("button", { name: /トルエン.*CAS 108-88-3/ }).click();
    await expect(page.getByRole("list", { name: "判定する物質" })).toContainText("トルエン");
    await answerBasics(page);
    await choose(page, "皮膚に付く範囲", /両手の手のひら/);

    const result = page.locator("section", { has: page.getByRole("heading", { name: "③ リスクレベル" }) });
    await expect(result.getByText("いちばん高いリスクレベル")).toBeVisible();
    await expect(result.getByRole("heading", { name: "レベルを下げるには" })).toBeVisible();
    await result.getByRole("button", { name: "この条件にする" }).first().click();
    await expect(result.getByText(/対策後の条件にしました/)).toBeVisible();

    await result.getByLabel("記録の名前（作業名）").fill("e2e 小分け作業");
    await result.getByRole("button", { name: "保存" }).click();
    await expect(page.getByRole("heading", { name: "保存した記録（1）" })).toBeVisible();
    // 判定・保存は端末内。入力内容をサーバーへ送らない
    expect(posts.filter((url) => !url.includes("/_next/") && !url.includes("vitals"))).toEqual([]);
  });

  test("CAS番号つきURLで開くと物質が入った状態で始まる", async ({ page }) => {
    await page.goto("/chemical-ra?cas=67-64-1");
    await expect(page.getByRole("list", { name: "判定する物質" })).toContainText("アセトン");
  });

  test("化学物質DB → リスクアセスメントへの導線が機能する", async ({ page }) => {
    await page.goto("/chemical-database");
    const raLink = page
      .getByRole("main")
      .getByText("このページの使い分け：", { exact: true })
      .locator("..")
      .getByRole("link", { name: "化学物質リスクアセスメント", exact: true });
    await expect(raLink).toHaveAttribute("href", "/chemical-ra");
    await raLink.click();
    await expect(page).toHaveURL(/\/chemical-ra$/u);
    await expect(page.getByRole("heading", { level: 1, name: "化学物質リスクアセスメント", exact: true })).toBeVisible();
  });

  test("製品検索から物質名をURLに載せずに引き継ぐ", async ({ page }) => {
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
              components: [{ cas: "108-88-3", name: "トルエン", contentPct: 50, contentLabel: "40-60%" }],
            },
          ],
        }),
      });
    });
    await page.goto("/chemical-ra/product-search");
    await page.getByLabel("製品名／型番").fill("試験用塗料");
    await page.getByRole("button", { name: "SDS DBを検索" }).click();
    const raLink = page.getByRole("link", { name: "主成分のリスクを判定" });
    await expect(raLink).toHaveAttribute("href", "/chemical-ra");
    await raLink.click();
    await expect(page).toHaveURL(/\/chemical-ra$/u);
    await expect(
      page.getByRole("list", { name: "判定する物質" }).or(page.getByRole("button", { name: /トルエン.*CAS 108-88-3/ })),
    ).toBeVisible();
    expect(requestedUrls.join("\n")).not.toContain(encodeURIComponent("トルエン"));
  });

  test("スマホ幅で横にはみ出さない", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/chemical-ra?cas=108-88-3");
    await expect(page.getByRole("list", { name: "判定する物質" })).toContainText("トルエン");
    await answerBasics(page);
    await expect(page.getByText("いちばん高いリスクレベル")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });
});
