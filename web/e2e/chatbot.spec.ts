import { test, expect } from "@playwright/test";

test.describe("チャットボット", () => {
  test("ページが表示される @smoke", async ({ page }) => {
    const res = await page.goto("/chatbot");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("テキスト入力エリアが存在する", async ({ page }) => {
    await page.goto("/chatbot");
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
  });

  test("入力エリアにプレースホルダーが表示される", async ({ page }) => {
    await page.goto("/chatbot");
    const textarea = page.locator("textarea");
    await expect(textarea).toHaveAttribute("placeholder", /作業や設備/);
  });

  test("送信ボタンが存在する", async ({ page }) => {
    await page.goto("/chatbot");
    // 送信ボタン（disabled状態でも存在すること）
    const submitButton = page.locator("button[type='submit'], button:has(svg)").last();
    await expect(submitButton).toBeAttached();
  });

  test("初期画面は会話入力へ集中できる", async ({ page }) => {
    await page.goto("/chatbot");
    await expect(
      page.getByRole("heading", { name: "安衛法AI", exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-chatbot-question-chip]")).toHaveCount(3);
    await expect(page.locator("[data-chatbot-composer]")).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "安衛法AIとの会話" })
        .locator("[role='alert']"),
    ).toHaveCount(0);
  });

  for (const width of [320, 390]) {
    test(`${width}pxでも入力欄がbottom navに隠れない`, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.goto("/chatbot");
      const composer = page.locator("[data-chatbot-composer]");
      await expect(composer).toBeVisible();
      const box = await composer.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      const bottomNav = page.locator('[data-mobile-nav="bottom"]');
      if (await bottomNav.isVisible()) {
        const navBox = await bottomNav.boundingBox();
        expect(navBox).not.toBeNull();
        expect(box!.y + box!.height).toBeLessThanOrEqual(navBox!.y + 1);
      }
    });
  }

  test("複数ターン後も履歴だけがスクロールしcomposerが見える", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let requestCount = 0;
    await page.route("**/api/chatbot/stream", async (route) => {
      requestCount += 1;
      const answer = [
        "結論",
        "足場の種類と作業床の条件を確認して判断します。".repeat(18),
        "次の質問\n高さと足場の種類を教えてください。",
      ].join("\n");
      const payload = {
        answer,
        sources: [],
        source_type: "rag",
        confidence: "low",
        requiresHumanReview: true,
      };
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream; charset=utf-8" },
        body:
          `event: text\ndata: ${JSON.stringify({ chunk: answer })}\n\n` +
          `event: meta\ndata: ${JSON.stringify(payload)}\n\n`,
      });
    });
    await page.goto("/chatbot");

    await page.locator("[data-chatbot-question-chip]").first().click();
    for (let turn = 1; turn <= 4; turn += 1) {
      await expect.poll(() => requestCount).toBe(turn);
      const submit = page.locator(
        '[data-chatbot-composer] button[type="submit"]',
      );
      await expect(submit).toBeVisible();
      if (turn < 4) {
        await page
          .locator("[data-chatbot-composer] textarea")
          .fill(`追加条件 ${turn}：高さは${turn + 1}mです`);
        await submit.click();
      }
    }

    const history = page.locator("[data-chatbot-history]");
    await expect(history).toBeVisible();
    await expect
      .poll(() =>
        history.evaluate((node) => node.scrollHeight > node.clientHeight),
      )
      .toBe(true);

    const composer = page.locator("[data-chatbot-composer]");
    await expect(composer).toBeVisible();
    const composerBox = await composer.boundingBox();
    expect(composerBox).not.toBeNull();
    expect(composerBox!.y).toBeGreaterThanOrEqual(0);
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844);

    const bottomNav = page.locator('[data-mobile-nav="bottom"]');
    if (await bottomNav.isVisible()) {
      const bottomNavBox = await bottomNav.boundingBox();
      expect(bottomNavBox).not.toBeNull();
      expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(
        bottomNavBox!.y + 1,
      );
    }

    const latestActions = page.locator("[data-chatbot-answer-actions]").last();
    await expect(latestActions).toBeVisible();
    const actionsBox = await latestActions.boundingBox();
    expect(actionsBox).not.toBeNull();
    expect(actionsBox!.y + actionsBox!.height).toBeLessThanOrEqual(
      composerBox!.y + 1,
    );
    const copyButton = latestActions.getByRole("button", { name: "コピー" });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
  });

  test("15秒経過後も固定補助UIに遮られず390pxで入力・送信できる", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("anzen-usage-score-v1", "30");
      localStorage.setItem("anzen-page-view-count-v1", "5");
    });
    let requests = 0;
    await page.route("**/api/chatbot/stream", async (route) => {
      requests += 1;
      const answer = "結論\n足場の条件を確認します。［1］\n\n次の質問\n高さを教えてください。";
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream; charset=utf-8" },
        body:
          `event: text\ndata: ${JSON.stringify({ chunk: answer })}\n\n` +
          `event: meta\ndata: ${JSON.stringify({
            answer,
            sources: [],
            source_type: "rag",
            confidence: "low",
            requiresHumanReview: true,
          })}\n\n`,
      });
    });

    await page.goto("/chatbot");
    await page.waitForTimeout(18_000);
    await expect(
      page.getByRole("button", { name: "シェアメニューを開く" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: /ご意見をお聞かせください/ }),
    ).toHaveCount(0);

    const composer = page.locator("[data-chatbot-composer]");
    const input = composer.locator("textarea");
    await expect
      .poll(() =>
        input.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          ) === node;
        }),
      )
      .toBe(true);
    await input.fill("足場の条件を確認したい");
    await expect(input).toBeFocused();
    await composer.locator('button[type="submit"]').click();
    await expect.poll(() => requests).toBe(1);
    await expect(page.getByText("足場の条件を確認します。［1］")).toBeVisible();
  });

  test("mobile keyboard相当の短いviewportではbottom navを退避して入力できる", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await page.goto("/chatbot");
    const composer = page.locator("[data-chatbot-composer]");
    const input = composer.locator("textarea");
    await input.scrollIntoViewIfNeeded();
    await input.focus();
    await expect(input).toBeFocused();
    await expect(page.locator('[data-mobile-nav="bottom"]')).toBeHidden();
    const inputBox = await input.boundingBox();
    expect(inputBox).not.toBeNull();
    expect(inputBox!.y).toBeGreaterThanOrEqual(0);
    expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(500);
    await input.fill("足場の条件を確認したい");
    await expect(input).toHaveValue("足場の条件を確認したい");
  });

  test("400%相当の360x225でも横溢れせずcomposerへ到達できる", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 225 });
    await page.goto("/chatbot");
    const input = page.locator("[data-chatbot-composer] textarea");
    await input.scrollIntoViewIfNeeded();
    await input.focus();
    await expect(page.locator('[data-mobile-nav="bottom"]')).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    const inputBox = await input.boundingBox();
    expect(inputBox).not.toBeNull();
    expect(inputBox!.y).toBeGreaterThanOrEqual(0);
    expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(225);
  });

  test("JavaScript無効でも320/390pxで送信でき、質問をURLへ載せない", async ({
    browser,
    baseURL,
  }) => {
    const question = "労働安全衛生法第61条を示してください";
    for (const width of [320, 390]) {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width, height: 720 },
        extraHTTPHeaders: {
          "x-forwarded-for": `198.51.100.${70 + width / 10}`,
        },
      });
      const page = await context.newPage();
      try {
        await page.goto(`${baseURL}/chatbot`);
        const main = page.locator("main");
        const chatbotClient = main.locator("[data-chatbot-client]");
        const form = main.locator("form[action='/api/chatbot/no-script']");
        const textarea = form.locator("textarea[name='message']");
        const submit = form.getByRole("button", { name: "送信" });
        const bottomNav = page.locator("[data-mobile-nav='bottom']");

        await expect(main).toHaveCount(1);
        await expect(chatbotClient).toHaveCount(1);
        await expect(chatbotClient).toBeHidden();
        await expect(main.locator("textarea:visible")).toHaveCount(1);
        await expect(textarea).toBeVisible();
        await expect(form).toHaveAttribute("method", "post");
        await expect(form).not.toHaveAttribute("action", /\?/);
        await textarea.fill(question);
        await submit.scrollIntoViewIfNeeded();
        await expect(submit).toBeVisible();
        await expect(bottomNav).toBeVisible();

        const submitBox = await submit.boundingBox();
        const navBox = await bottomNav.boundingBox();
        expect(submitBox).not.toBeNull();
        expect(navBox).not.toBeNull();
        expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(navBox!.y);

        const submissionPromise = page.waitForRequest(
          (request) =>
            new URL(request.url()).pathname === "/api/chatbot/no-script" &&
            request.method() === "POST",
        );
        const responsePromise = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname === "/api/chatbot/no-script" &&
            response.request().method() === "POST",
        );
        const [, , noScriptResponse] = await Promise.all([
          page.waitForURL(/\/api\/chatbot\/no-script$/),
          submit.click(),
          responsePromise,
        ]);
        const submission = await submissionPromise;
        expect(new URL(submission.url()).search).toBe("");
        expect(
          new URLSearchParams(submission.postData() ?? "").get("message"),
        ).toBe(question);
        const responseHeaders = noScriptResponse.headers();
        expect(responseHeaders["content-security-policy"]).toBe(
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
        );
        expect(responseHeaders["content-security-policy-report-only"]).toBeUndefined();
        expect(responseHeaders["referrer-policy"]).toBe("no-referrer");
        expect(responseHeaders["cache-control"]).toContain("no-store");
        expect(responseHeaders["x-robots-tag"]).toContain("noindex");
        await expect(page.getByRole("heading", { name: "回答" })).toBeVisible({
          timeout: 15_000,
        });
        const sources = page.locator("details").filter({ hasText: /^根拠 \d+件/ });
        await expect(sources).toBeVisible();
        expect(await sources.getAttribute("open")).toBeNull();
        expect(page.url()).not.toContain(encodeURIComponent(question));
        expect(page.url()).not.toContain("message=");
      } finally {
        await context.close();
      }
    }
  });

  test("JavaScript無効でも安全管理者の選択済み業種を多段質問へ引き継ぐ", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 720 },
      extraHTTPHeaders: { "x-forwarded-for": "198.51.100.119" },
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseURL}/chatbot`);
      const form = page.locator("form[action='/api/chatbot/no-script']");
      await form.locator("textarea[name='message']").fill("安全管理者は必要？");
      await Promise.all([
        page.waitForURL(/\/api\/chatbot\/no-script$/),
        form.getByRole("button", { name: "送信" }).click(),
      ]);

      await expect(page.getByText("事業場の主な業種はどれですか？")).toBeVisible();
      const construction = page.getByRole("button", {
        name: "建設業",
        exact: true,
      });
      const responsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/chatbot/no-script" &&
          response.request().method() === "POST",
      );
      const [constructionResponse] = await Promise.all([
        responsePromise,
        construction.click(),
      ]);

      await expect(page.getByRole("heading", { name: "回答" })).toBeVisible();
      await expect(page.locator("main")).toContainText("安全管理者");
      await expect(page.locator("details")).toContainText(
        "労働安全衛生法 第11条",
      );
      expect(constructionResponse.headers()["x-ai-used"]).toBe("false");

      const continuationForm = page
        .locator("form[action='/api/chatbot/no-script']")
        .filter({ has: page.locator("textarea[name='message']") });
      const selectedState = JSON.parse(
        await continuationForm.locator("input[name='state']").inputValue(),
      ) as { industry?: string };
      expect(selectedState.industry).toBe("建設業");

      await continuationForm.locator("textarea[name='message']").fill("条件");
      const conditionsResponsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/chatbot/no-script" &&
          response.request().method() === "POST",
      );
      const [conditionsResponse] = await Promise.all([
        conditionsResponsePromise,
        continuationForm.getByRole("button", { name: "送信" }).click(),
      ]);

      await expect(page.locator("main")).toContainText("安全管理者");
      await expect(page.locator("details")).toContainText(
        "労働安全衛生法 第11条",
      );
      await expect(
        page.getByText("事業場の主な業種はどれですか？"),
      ).toHaveCount(0);
      expect(conditionsResponse.headers()["x-ai-used"]).toBe("false");

      await continuationForm
        .locator("textarea[name='message']")
        .fill("建設業");
      const repeatedIndustryResponsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/chatbot/no-script" &&
          response.request().method() === "POST",
      );
      await Promise.all([
        repeatedIndustryResponsePromise,
        continuationForm.getByRole("button", { name: "送信" }).click(),
      ]);
      await expect(page.locator("main")).toContainText("安全管理者");
      await expect(page.locator("details")).toContainText(
        "労働安全衛生法 第11条",
      );
      await expect(
        page.getByText("事業場の主な業種はどれですか？"),
      ).toHaveCount(0);
      expect(new URL(page.url()).search).toBe("");
    } finally {
      await context.close();
    }
  });
});
