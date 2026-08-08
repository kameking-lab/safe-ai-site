import { expect, test, type Page } from "@playwright/test";

const SERVICE_PATH = "/services/automation";

async function fillStepOne(page: Page) {
  await expect(
    page.locator('form[data-automation-consult-ready="true"]'),
  ).toBeVisible();
  await page.getByLabel(/相談種別/).selectOption("automation");
  await page
    .getByLabel(/現在困っていること/)
    .fill("毎週5つのCSVを手作業で結合し、重複確認と集計に3時間かかっています。");
  await page
    .getByLabel(/自動化・講習・資料作成の希望/)
    .fill("CSVを自動で結合し、定型レポートを作成できるようにしたいです。");
  await page.getByRole("button", { name: /返信先の入力へ進む/ }).click();
}

async function fillStepTwo(page: Page) {
  await page.getByLabel(/お名前・担当者名/).fill("テスト担当者");
  await page.getByLabel(/返信用メールアドレス/).fill("tester@example.invalid");
  await page.getByLabel(/会社・団体名/).fill("テスト団体");
  await page.getByLabel(/希望時期/).selectOption("within-1-month");
  await page.getByLabel(/予算帯/).selectOption("100000-300000");
  await page.getByLabel(/オンライン・現地等の希望/).selectOption("online");
  await page.getByRole("checkbox", { name: /個人情報の取扱いに同意する/ }).check();
}

test.describe("業務自動化・講習・資料作成サービス", () => {
  test("ホーム、ナビ、サービス案内から目的が分かる導線で到達できる", async ({
    page,
  }) => {
    await page.goto("/");
    const homeCta = page.getByRole("link", {
      name: /無料相談を始める|メールで相談する|料金と例を見る/,
    }).first();
    await expect(homeCta).toBeVisible();
    await homeCta.click();
    await expect(page).toHaveURL(new RegExp(`${SERVICE_PATH}(?:#.*)?$`));
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /業務自動化・講習を\s*小さな一件から。/,
      }),
    ).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(
      page.locator('[data-automation-cta-position="global_nav"]'),
    ).toHaveAttribute("href", "/services/automation");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "メニューを開閉" }).click();
    await expect(
      page.locator('[data-automation-cta-position="mobile_nav"]'),
    ).toHaveAttribute("href", "/services/automation");

    await page.goto("/safety-ai");
    await expect(
      page.getByRole("link", { name: /自動化例・料金を見る/ }),
    ).toHaveAttribute("href", "/services/automation");
  });

  test("答えに必要な5セクションだけで、料金3件と想定例3件を先に示す", async ({ page }) => {
    const response = await page.goto(SERVICE_PATH, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    const sections = [
      "overview",
      "pricing",
      "model-cases",
      "services",
      "consult-form",
    ];
    expect(sections).toHaveLength(5);
    await expect(
      page.locator("[data-automation-service] > section[id]"),
    ).toHaveCount(5);
    for (const id of sections) {
      await expect(page.locator(`#${id}`), id).toHaveCount(1);
    }
    const pricingCards = page.locator("#pricing [data-primary-pricing] > article");
    await expect(pricingCards).toHaveCount(3);
    await expect(pricingCards).toHaveText([
      /ちょこっと自動化[\s\S]*33,000〜88,000円[\s\S]*目安1〜2週間[\s\S]*軽微修正1回/,
      /業務フロー自動化[\s\S]*110,000〜440,000円[\s\S]*目安3〜8週間[\s\S]*修正2回/,
      /講習・資料作成[\s\S]*55,000円から[\s\S]*2〜6週間/,
    ]);
    await expect(page.getByText("33,000〜88,000円").first()).toBeVisible();
    const pricingDetails = page.locator("#pricing details").first();
    await expect(pricingDetails).not.toHaveAttribute("open", "");
    await pricingDetails.locator("summary").click();
    await expect(page.getByText(/大幅な仕様変更、現地作業/)).toBeVisible();
    await expect(page.locator("#model-cases article")).toHaveCount(3);
    await expect(page.locator("#faq")).toHaveCount(0);
    await expect(page.locator("#overview [role=alert]")).toHaveCount(0);
  });

  test("固有metadata、self canonical、Open Graph、構造化データを持つ", async ({ page }) => {
    await page.goto(SERVICE_PATH, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/業務自動化・AI活用・講習・資料作成の相談/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Excel.*定型業務.*初回30分無料.*33,000円/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.anzen-ai-portal.jp/services/automation",
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /業務自動化・AI活用/,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );

    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    for (const schema of schemas) expect(() => JSON.parse(schema)).not.toThrow();
    const serializedSchemas = schemas.join("\n");
    expect(serializedSchemas).toContain('"@type":"Service"');
    expect(serializedSchemas).toContain('"@type":"BreadcrumbList"');
    expect(serializedSchemas).not.toContain("aggregateRating");
  });

  test("320〜1440pxで本文が横にはみ出さず、主要CTAは44px以上", async ({ page }) => {
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.goto(SERVICE_PATH, { waitUntil: "domcontentloaded" });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
        `${width}px horizontal overflow`,
      ).toBeLessThanOrEqual(2);

      const cta = page.locator("[data-primary-action]");
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      expect(box?.height ?? 0, `${width}px CTA height`).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0, `${width}px CTA width`).toBeGreaterThanOrEqual(44);
    }
  });

  test("200%文字拡大とreduced motionでも主要内容とフォームへ到達できる", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(SERVICE_PATH);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "料金", exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(2);
    await page.locator("#consult-form").scrollIntoViewIfNeeded();
    await expect(page.getByLabel(/相談種別/)).toBeVisible();
  });

  test("JavaScript無効でも料金・想定例・対象業務と相談代替を確認できる", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    const response = await page.goto(SERVICE_PATH, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("初回30分は無料", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/33,000円/).first()).toBeVisible();
    await page.locator("#pricing details").first().locator("summary").click();
    await expect(page.getByText(/大幅な仕様変更、現地作業/)).toBeVisible();
    await expect(page.locator("#model-cases article")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "依頼できること" })).toBeVisible();
    await expect(page.getByText(/Webフォームを利用できません/)).toBeVisible();
    await expect(page.locator("#faq")).toHaveCount(0);
    await context.close();
  });

  test("キーボードで段階フォームを進み、成功時に入力や受付番号をURLへ出さない", async ({
    page,
  }) => {
    await page.route("**/api/automation-consult", async (route) => {
      const headers = route.request().headers();
      expect(headers["idempotency-key"]).toMatch(/^[A-Za-z0-9._:-]{16,100}$/);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          referenceId: "AUTO-DO-NOT-EXPOSE",
          receivedAt: "2026-07-23T10:00:00+09:00",
        }),
      });
    });
    await page.goto(`${SERVICE_PATH}#consult-form`);

    await page.getByLabel(/相談種別/).focus();
    await fillStepOne(page);
    await expect(page.getByRole("heading", { name: "返信先と希望条件を教えてください" })).toBeFocused();
    await fillStepTwo(page);
    await page.getByRole("button", { name: /無料相談を送信/ }).focus();
    await page.keyboard.press("Enter");

    const success = page
      .getByRole("status")
      .filter({ hasText: "相談を受け付けました" });
    await expect(success).toBeFocused();
    await expect(success).toContainText("相談を受け付けました");
    await expect(page).toHaveURL(`${SERVICE_PATH}#consult-form`);
    await expect(page.getByText("AUTO-DO-NOT-EXPOSE")).toHaveCount(0);
  });

  test("エラー要約から項目へ移動でき、スクリーンリーダー名がある", async ({ page }) => {
    await page.goto(`${SERVICE_PATH}#consult-form`);
    await expect(
      page.locator('form[data-automation-consult-ready="true"]'),
    ).toBeVisible();
    await page.getByRole("button", { name: /返信先の入力へ進む/ }).click();
    const summary = page.getByRole("alert", { name: "入力内容を確認してください" });
    await expect(summary).toBeFocused();
    const errorLink = summary.getByRole("link", {
      name: /相談種別：相談種別を選択してください/,
    });
    await expect(errorLink).toHaveAttribute("href", "#automation-consult-type");
    await errorLink.click();
    await expect(page.getByLabel(/相談種別/)).toBeFocused();
    await expect(page.getByLabel(/相談種別/)).toHaveAttribute("aria-invalid", "true");
  });

  test("送信連打はAPIを1回だけ呼び、送信中ボタンを無効化する", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/automation-consult", async (route) => {
      requestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, referenceId: "PRIVATE" }),
      });
    });
    await page.goto(`${SERVICE_PATH}#consult-form`);
    await fillStepOne(page);
    await fillStepTwo(page);
    const submit = page.getByRole("button", { name: /無料相談を送信/ });
    await submit.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect(page.getByRole("button", { name: "送信中です" })).toBeDisabled();
    await expect(page.getByRole("status")).toBeVisible();
    expect(requestCount).toBe(1);
  });

  test("メール通知失敗を成功と偽装せず、安全な一般表現を出す", async ({ page }) => {
    await page.route("**/api/automation-consult", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: {
            code: "delivery_failed",
            message: "provider secret and internal details",
          },
        }),
      }),
    );
    await page.goto(`${SERVICE_PATH}#consult-form`);
    await fillStepOne(page);
    await fillStepTwo(page);
    await page.getByRole("button", { name: /無料相談を送信/ }).click();
    const alert = page.getByRole("alert").filter({ hasText: "受付は完了していません" });
    await expect(alert).toContainText("受付は完了していません");
    await expect(alert).not.toContainText("provider secret");
    await expect(page.getByText("相談を受け付けました")).toHaveCount(0);
  });
});
