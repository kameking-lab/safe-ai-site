import { expect, test, type Page } from "@playwright/test";

const FOCUS_TARGETS = [
  ["/chatbot", '[aria-label="質問入力"]'],
  ["/chemical-ra", "#chemical-onebox-input"],
  ["/law-search", '[aria-label="法令フリーワード検索"]'],
  ["/risk", 'form[data-official-area-resolver] input[role="combobox"]'],
  ["/ky/paper", "#ky-work-description"],
] as const;

const TARGET_ROUTES = [
  "/",
  "/risk",
  "/chatbot",
  "/law-search",
  "/chemical-ra",
  "/ky/paper",
  "/safety-diary",
  "/accident-news",
  "/accidents",
  "/laws",
  "/training/visual-ky",
  "/education-certification/finder",
  "/signage",
  "/services/automation",
  "/safety-ai",
] as const;

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    };
  });
}

async function waitForClientReady(page: Page) {
  // Long-lived weather/signage requests make `networkidle` an invalid proxy for
  // interactivity. Wait for the document and two paint opportunities instead.
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => document.readyState !== "loading");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function activeNavigationHrefs(page: Page) {
  return page
    .locator('a[data-app-shell-nav-href][data-nav-active="true"]')
    .evaluateAll((links) => [
      ...new Set(links.map((link) => link.getAttribute("href") ?? "")),
    ]);
}

test.describe("relevance-guarded task completion", () => {
  test("主入力を初期画面内に完全表示し、focusしても固定UIに隠さない", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const [route, targetSelector] of FOCUS_TARGETS) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route).toBeLessThan(400);
      await waitForClientReady(page);

      const target = page.locator(targetSelector).first();
      await expect(target, route).toBeVisible();
      if (route === "/risk") {
        await expect(target).toHaveAccessibleName("現場の地域を検索");
      }
      await expect(page.locator("main [role=alert]"), route).toHaveCount(0);
      await target.focus();
      await expect(target, route).toBeFocused();

      const geometry = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement;
        const rect = active.getBoundingClientRect();
        const hit = document.elementFromPoint(
          Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2)),
          Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2)),
        );
        return {
          tag: active.tagName,
          top: rect.top,
          bottom: rect.bottom,
          viewportHeight: innerHeight,
          uncovered: hit === active || active.contains(hit),
        };
      });
      expect(geometry.top, route).toBeGreaterThanOrEqual(0);
      expect(geometry.bottom, route).toBeLessThanOrEqual(
        geometry.viewportHeight,
      );
      expect(geometry.uncovered, route).toBe(true);
    }
  });

  test("検証済み地域aliasを共有resolverで解決し、曖昧区は選択必須、戻ると状態復元", async ({
    page,
  }) => {
    const queries = [
      "横浜 港北",
      "横浜市港北区",
      "大阪 北区",
      "大阪市北区",
      "さいたま 大宮",
      "札幌 中央区",
      "福岡 博多",
      "名古屋 中区",
    ];

    await page.goto("/risk", { waitUntil: "domcontentloaded" });
    await waitForClientReady(page);
    const resolver = page.locator('[data-official-area-resolver="shared"]');
    const input = resolver.getByRole("combobox");
    for (const query of queries) {
      await input.fill(query);
      await expect(resolver.getByRole("option"), query).toHaveCount(1);
      await input.press("Escape");
    }

    await input.fill("中央区");
    await expect
      .poll(() => resolver.getByRole("option").count())
      .toBeGreaterThan(1);
    await resolver.getByRole("button", { name: "この地域を表示" }).click();
    await expect(page).not.toHaveURL(/area=/);
    expect(await resolver.getByRole("option").count()).toBeGreaterThan(1);
    await expect(input).toHaveAttribute("aria-expanded", "true");

    await input.fill("大阪市北区");
    await resolver.getByRole("button", { name: "この地域を表示" }).click();
    await expect(page).toHaveURL(/area=osaka-osaka/);
    await expect(input).toHaveValue("大阪府 大阪市");

    await page.goto("/chatbot", { waitUntil: "domcontentloaded" });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/risk\?area=osaka-osaka/);
    await expect(input).toHaveValue("大阪府 大阪市");
    await expect(resolver.getByRole("combobox")).toHaveCount(1);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForClientReady(page);
    const homePicker = page.locator("details[data-home-area-picker]");
    await expect(homePicker).toHaveAttribute(
      "data-home-area-picker-hydrated",
      "true",
      { timeout: 15_000 },
    );
    const homeInput = page.locator("#home-area-change");
    if (!(await homeInput.isVisible())) {
      await page.locator("details:has(#home-area-change) summary").click();
    }
    const homeForm = page.locator("form").filter({ has: homeInput });
    await homeInput.fill("横浜 港北");
    await expect
      .poll(() => homeForm.getByRole("option").count(), { timeout: 15_000 })
      .toBe(1);

    await page.goto("/ky/paper", { waitUntil: "domcontentloaded" });
    await waitForClientReady(page);
    const kyLocation = page.locator("#ky-location");
    await kyLocation.fill("横浜 港北");
    await expect(page.getByText(/横浜市 → 神奈川県の警戒区域/)).toBeVisible();
  });

  test("横断検索は機能5件・文書20件・その他20件に制限し、本文をURLへ載せずページ送りする", async ({
    page,
  }) => {
    await page.goto("/search", { waitUntil: "domcontentloaded" });
    await waitForClientReady(page);
    const search = page.getByRole("searchbox", { name: "サイト内を横断検索" });
    await search.fill("CAS");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/search$/);
    const other = page.locator(
      '[data-search-result-section="search-other-results"]',
    );
    await expect(other.locator("li").first()).toBeVisible();
    await expect(other.locator("li")).toHaveCount(20);
    const firstPageHref = await other.locator("li a").first().getAttribute("href");
    await expect(other.locator("li").first()).toContainText("種別:");
    await expect(other.locator("li").first()).toContainText("一致理由:");
    await expect(other.locator("li").first()).toContainText("検証状態:");
    await expect(other.locator("li").first()).toContainText("一致抜粋:");

    const next = other.getByRole("button", { name: "次の20件" });
    await next.click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(other.locator("li")).toHaveCount(20);
    await expect(other.locator("li a").first()).not.toHaveAttribute(
      "href",
      firstPageHref!,
    );
    await other.getByRole("button", { name: "前の20件" }).click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(other.locator("li a").first()).toHaveAttribute(
      "href",
      firstPageHref!,
    );

    await search.fill("法令");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/search$/);
    const destinations = page.locator(
      '[data-search-result-section="search-destinations"] li',
    );
    await expect(destinations.first()).toBeVisible();
    expect(await destinations.count()).toBeLessThanOrEqual(5);

    await search.fill("安衛法 第14条");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/search$/);
    const documents = page.locator(
      '[data-search-result-section="search-official-documents"] li',
    );
    await expect(documents.first()).toBeVisible();
    expect(await documents.count()).toBeLessThanOrEqual(20);
    await expect(documents.first()).toContainText("一次資料:");
    await expect(documents.first()).toContainText(/施行日:|更新日・対象時点:/);
  });

  test("公開検索の自由入力はURL・履歴・リンクへ複製せず、画面内で結果を更新する", async ({
    page,
  }) => {
    await page.goto("/search?cat=law", { waitUntil: "domcontentloaded" });
    await waitForClientReady(page);
    await expect(page.locator('[data-search-client-ready="true"]')).toBeVisible({
      timeout: 30_000,
    });
    const initialUrl = page.url();
    const search = page.getByRole("searchbox", { name: "サイト内を横断検索" });
    await search.fill("フォークリフト");
    await search.press("Enter");
    await expect(page.getByText(/「フォークリフト」の検索結果/)).toBeVisible();
    expect(page.url()).toBe(initialUrl);

    const marker = "山田太郎-健康情報-現場A";
    await search.fill(marker);
    await search.press("Enter");
    await expect(page.getByText(new RegExp(marker))).toBeVisible();
    expect(page.url()).toBe(initialUrl);
    await expect(page.locator(`a[href*="${encodeURIComponent(marker)}"]`)).toHaveCount(0);

    await page.goto("/law-navi", { waitUntil: "domcontentloaded" });
    await waitForClientReady(page);
    await expect(page.locator('[data-law-navi-ready="true"]')).toBeVisible({
      timeout: 30_000,
    });
    const lawUrl = page.url();
    const lawSearch = page.getByRole("searchbox", { name: "法令ナビの検索語" });
    await lawSearch.fill("フォークリフト");
    await lawSearch.press("Enter");
    await expect(page.getByRole("link", { name: /フォークリフト/ }).first()).toBeVisible();
    expect(page.url()).toBe(lawUrl);

    await page.goto("/privacy-search-missing-page", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "サイト内を検索" })).toHaveAttribute(
      "href",
      "/search",
    );
    await expect(page.locator('form input[name="q"]')).toHaveCount(0);
  });

  test("モバイルmenuはURLを変えずdrawerを開き、focus trap・Escape・focus returnを満たす", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForClientReady(page);
    const initialUrl = page.url();
    const details = page.locator("details[data-mobile-site-menu]");
    const summary = details.locator(
      ':scope > summary[aria-controls="mobile-site-menu"]',
    );
    await summary.click();
    await expect(details).toHaveAttribute("open", "");
    expect(page.url()).toBe(initialUrl);
    await expect(
      page.locator('#mobile-site-menu a[href="/features"]'),
    ).toHaveCount(0);
    await expect(
      page.locator(
        'nav[data-mobile-nav="bottom"] a[href="/features"]',
      ),
    ).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(document.activeElement?.closest("#mobile-site-menu")),
        ),
      )
      .toBe(true);

    await page.evaluate(() => {
      const menu = document.getElementById("mobile-site-menu")!;
      const focusable = [...menu.querySelectorAll<HTMLElement>("a,button")].filter(
        (element) => element.offsetParent !== null,
      );
      focusable.at(-1)?.focus();
    });
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => {
        const menu = document.getElementById("mobile-site-menu")!;
        const first = [...menu.querySelectorAll<HTMLElement>("a,button")].find(
          (element) => element.offsetParent !== null,
        );
        return document.activeElement === first;
      }),
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(details).not.toHaveAttribute("open", "");
    expect(await summary.evaluate((node) => document.activeElement === node)).toBe(
      true,
    );

    await page.setViewportSize({ width: 844, height: 390 });
    await summary.click();
    const firstLandscapeLink = page.locator("#mobile-site-menu a:visible").first();
    await expect(firstLandscapeLink).toBeVisible();
    const box = await firstLandscapeLink.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("主要ナビは初期表示・Next遷移・戻る進むで現在ページだけを示す", async ({
    page,
  }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /hydration|did not match|server rendered html/i.test(message.text())
      ) {
        hydrationErrors.push(message.text());
      }
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForClientReady(page);
    await expect.poll(() => activeNavigationHrefs(page)).toEqual(["/"]);
    await expect(
      page.locator('a[href="/"][data-app-shell-nav-href="/"]'),
    ).toHaveAttribute("aria-current", "page");

    const menuDetails = page.locator("details[data-mobile-site-menu]");
    const menuSummary = menuDetails.locator(
      ':scope > summary[aria-controls="mobile-site-menu"]',
    );
    await menuSummary.click();
    await page
      .getByRole("region", {
        name: "モバイルサイトメニュー。Escキーで閉じます",
      })
      .getByRole("link", { name: "法令検索", exact: true })
      .click();
    await expect(page).toHaveURL(/\/law-search$/);
    await expect.poll(() => activeNavigationHrefs(page)).toEqual(["/law-search"]);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => activeNavigationHrefs(page)).toEqual(["/"]);

    await page.goForward();
    await expect(page).toHaveURL(/\/law-search$/);
    await expect.poll(() => activeNavigationHrefs(page)).toEqual(["/law-search"]);
    expect(hydrationErrors).toEqual([]);
  });

  test("1024以上のサイネージは現在値と朝礼要点を1画面に収め、設定drawerがfocusを返す", async ({
    page,
  }) => {
    for (const [width, height] of [
      [1024, 768],
      [1280, 720],
      [1366, 768],
      [1440, 900],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/signage", { waitUntil: "domcontentloaded" });
      const board = page.locator('[data-signage-presentation="1024"]');
      await expect(board).toBeVisible();
      await waitForClientReady(page);
      await expect(page.locator('[data-signage-client-ready="true"]')).toBeVisible({
        timeout: 30_000,
      });
      await expect(board).toContainText("現在状態");
      await expect(board).toContainText("データ鮮度");
      await expect(board).toContainText("WBGT");
      await expect(board).toContainText("気象庁 警報・注意報");
      await expect(board).toContainText("朝礼要点");
      await expect(board).toContainText("公式確認先");

      const layout = await page.evaluate(() => {
        const root = document.documentElement;
        const board = document.querySelector(
          '[data-signage-presentation="1024"]',
        ) as HTMLElement;
        const boardRect = board.getBoundingClientRect();
        return {
          fitsViewport: root.scrollHeight <= innerHeight,
          noHorizontalOverflow: root.scrollWidth <= innerWidth,
          boardTop: boardRect.top,
          boardBottom: boardRect.bottom,
          settingsHeight: (
            board.querySelector(
              "[data-signage-settings-trigger]",
            ) as HTMLElement
          ).getBoundingClientRect().height,
        };
      });
      expect(layout.fitsViewport, `${width}x${height}`).toBe(true);
      expect(layout.noHorizontalOverflow, `${width}x${height}`).toBe(true);
      expect(layout.boardTop, `${width}x${height}`).toBeGreaterThanOrEqual(0);
      expect(layout.boardBottom, `${width}x${height}`).toBeLessThanOrEqual(height);
      expect(layout.settingsHeight, `${width}x${height}`).toBeGreaterThanOrEqual(
        44,
      );
      for (const label of [
        "現在状態",
        "データ鮮度",
        "WBGT",
        "気象庁 警報・注意報",
        "朝礼要点",
        "公式確認先",
      ]) {
        await expect(
          board.getByText(label, { exact: false }).first(),
          `${width}x${height}: ${label}`,
        ).toBeInViewport();
      }
    }

    await page.setViewportSize({ width: 1024, height: 768 });
    await waitForClientReady(page);
    const trigger = page.locator("[data-signage-settings-trigger]");
    await trigger.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]')),
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    expect(await trigger.evaluate((node) => document.activeElement === node)).toBe(
      true,
    );
  });

  test("自動化相談は1024 heroとメールfallbackから完遂できる", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/services/automation", { waitUntil: "domcontentloaded" });
    await waitForClientReady(page);
    const h1 = page.locator("h1").first();
    const cta = page.locator("[data-primary-action]").first();
    await expect(h1).toBeVisible();
    await expect(page.locator("body")).toContainText("初回30分");
    await expect(page.locator("body")).toContainText("33,000円から");
    const hero = {
      h1: await h1.boundingBox(),
      cta: await cta.boundingBox(),
    };
    expect(hero.h1?.height ?? 999).toBeLessThanOrEqual(140);
    expect(
      hero.cta ? hero.cta.y + hero.cta.height : 999,
    ).toBeLessThanOrEqual(768);
    await expect(page.locator("#pricing [data-primary-pricing] > article")).toHaveCount(3);
    await expect(page.locator("#model-cases article")).toHaveCount(3);
    await expect(page.locator("#overview [role=alert]")).toHaveCount(0);
    await expect(page.locator("#pricing details")).not.toHaveAttribute("open", "");

    await page.goto("/contact/automation-email", {
      waitUntil: "domcontentloaded",
    });
    const fallback = page.getByRole("textbox", {
      name: "コピー用の相談テンプレート",
    });
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveAttribute("readonly", "");
    await expect(
      page.getByRole("textbox", { name: "コピー用の宛先" }),
    ).toHaveValue("safe-ai-playwright-never-send@gmail.com");
    await expect(
      page.getByRole("textbox", { name: "コピー用の件名" }),
    ).toHaveValue("安全AIポータル｜業務自動化・講習の相談");
    await expect(page.locator("body")).not.toContainText(
      "safe-ai-playwright-never-send@outlook.com",
    );
    await expect(page.locator("body")).toContainText(
      "メールアプリが開かない場合",
    );
    await expect(page.locator("body")).not.toContainText("送信済み");
  });

  test("未確認事故は404/noindex/canonicalなし/JSON-LDなし、照合済みだけ200", async ({
    request,
  }) => {
    const hidden = await request.get("/accidents/synthetic-audit-case");
    expect(hidden.status()).toBe(404);
    const hiddenHtml = await hidden.text();
    expect(hiddenHtml).toContain('name="robots" content="noindex');
    expect(hiddenHtml).not.toContain('rel="canonical"');
    expect(hiddenHtml).not.toContain("application/ld+json");

    const verified = await request.get("/accidents/mhlw-100620");
    expect(verified.status()).toBe(200);
    const verifiedHtml = await verified.text();
    expect(verifiedHtml).toContain('rel="canonical"');
    expect(verifiedHtml).toContain("/accidents/mhlw-100620");
    expect(verifiedHtml).toContain("application/ld+json");

    const sitemap = await request.get("/sitemap-accidents.xml");
    expect(await sitemap.text()).not.toContain("synthetic-audit-case");
  });

  test("320px（1280pxの400%相当）・390px・768pxと支援mediaで横溢れしない", async ({
    page,
  }) => {
    // This one contract intentionally compiles and inspects more than twenty
    // routes. Keep every assertion while allowing a cold Windows dev server to
    // finish route compilation.
    test.setTimeout(120_000);
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 800 });
    for (const route of TARGET_ROUTES) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route).toBeLessThan(400);
      await waitForClientReady(page);
      const overflow = await horizontalOverflow(page);
      expect(overflow.scrollWidth, route).toBeLessThanOrEqual(
        overflow.clientWidth + 1,
      );
    }

    for (const width of [390, 768] as const) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ["/risk", "/search?cat=law", "/services/automation"] as const) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const overflow = await horizontalOverflow(page);
        expect(overflow.scrollWidth, `${route} at ${width}`).toBeLessThanOrEqual(
          overflow.clientWidth + 1,
        );
      }
    }
  });

  test("JavaScript無効でも目的と公式代替導線が分かり、熱中症noindexを維持", async ({
    browser,
    request,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    for (const route of [
      "/chatbot",
      "/chemical-ra",
      "/law-search",
      "/risk",
      "/services/automation",
    ] as const) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route).toBeLessThan(400);
      await expect(page.locator("h1").first(), route).toBeVisible();
      await expect(
        page.getByText(/JavaScriptが無効です/).first(),
        route,
      ).toBeVisible();
      await expect(
        page.locator('a[href*="jma.go.jp"], a[href*="e-gov.go.jp"]').first(),
        route,
      ).toBeVisible();
    }
    await context.close();

    for (const route of [
      "/heat-illness-prevention",
      "/heat-illness-prevention/r7-compliance",
      "/heat-illness-prevention/wbgt-calculator",
    ] as const) {
      const response = await request.get(route);
      expect(response.status(), route).toBe(200);
      expect(await response.text(), route).toContain(
        'name="robots" content="noindex, follow"',
      );
    }
  });
});
