import { expect, test } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

test.describe("効果先行ホームの圧縮予算", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.setExtraHTTPHeaders({
      "x-vercel-ip-country": "JP",
      "x-vercel-ip-country-region": "13",
    });
  });

  test("実値、法令入力、事故・法改正、化学物質入力、学習を先に短く配置する", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-home-section="heat"]')).toBeVisible();

    expect(
      await page.locator("[data-home-section]").evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("data-home-section")),
      ),
    ).toEqual([
      "heat",
      "chat",
      "updates",
      "chemical",
      "learning",
      "core-features",
      "safety-labs",
      "automation-consult",
    ]);

    await expect(
      page.getByRole("heading", { level: 1, name: "今日の熱中症リスク" }),
    ).toBeVisible();
    await expect(page.locator('[data-home-section="heat"] [data-heat-status]')).toBeVisible();
    const heatState = await page
      .locator('[data-home-section="heat"] [data-heat-status]')
      .getAttribute("data-heat-status");
    await expect(
      page.locator('[data-home-section="heat"] [data-warning-card]'),
    ).toHaveCount(
      heatState === "degraded" || heatState === "unavailable" ? 1 : 0,
    );
    if (heatState === "degraded" || heatState === "unavailable") {
      const warning = page.locator(
        '[data-home-section="heat"] [data-warning-card]',
      );
      await expect(warning).toHaveText(
        /^(取得できません|情報が古いため|一部を確認できません)/,
      );
      expect((await warning.innerText()).trim().length).toBeLessThanOrEqual(32);
    }
    await expect(page.locator('[data-home-section="heat"] [data-primary-action]')).toHaveCount(1);
    await expect(page.locator('[data-home-section="quality"]')).toHaveCount(0);

    const metrics = await page.evaluate(({ viewportHeight }) => {
      const top = (selector: string) =>
        document.querySelector(selector)?.getBoundingClientRect().top ??
        Number.POSITIVE_INFINITY;
      const height = (selector: string) =>
        document.querySelector(selector)?.getBoundingClientRect().height ??
        Number.POSITIVE_INFINITY;
      return {
        screens: document.documentElement.scrollHeight / viewportHeight,
        heatHeight: height('[data-home-section="heat"]'),
        slideHeight: height("[data-home-heat-slide-deck]"),
        chatInputScreen: top('[data-home-section="chat"] textarea') / viewportHeight,
        accidentScreen: top('[data-home-update="accidents"]') / viewportHeight,
        lawScreen: top('[data-home-update="law-reform"]') / viewportHeight,
        chemicalInputScreen:
          top('[data-home-section="chemical"] input') / viewportHeight,
        learningScreen: top('[data-home-section="learning"]') / viewportHeight,
        mainDom: document.querySelector("main")?.querySelectorAll("*").length ?? 0,
      };
    }, { viewportHeight: MOBILE_VIEWPORT.height });

    expect(metrics.screens).toBeLessThanOrEqual(12);
    expect(metrics.heatHeight).toBeLessThanOrEqual(1_200);
    expect(metrics.slideHeight).toBeGreaterThanOrEqual(240);
    expect(metrics.slideHeight).toBeLessThanOrEqual(340);
    expect(metrics.chatInputScreen).toBeLessThanOrEqual(1.5);
    expect(metrics.accidentScreen).toBeLessThanOrEqual(2);
    expect(metrics.lawScreen).toBeLessThanOrEqual(2.5);
    expect(metrics.chemicalInputScreen).toBeLessThanOrEqual(3.1);
    expect(metrics.learningScreen).toBeLessThanOrEqual(4);
    expect(metrics.mainDom).toBeLessThanOrEqual(700);

    await expect(page.locator('[data-accident-origin="official"]')).toHaveCount(1);
    expect(
      await page.locator('[data-accident-origin="reported-unverified"]').count(),
    ).toBeLessThanOrEqual(2);
    await expect(page.locator('[data-home-update="accidents"]')).not.toContainText(
      "事故なし",
    );
    await expect(page.locator("[data-law-source-state]")).toHaveCount(3);
    await expect(page.locator('[data-home-section="learning"] article')).toHaveCount(3);
  });

  test("320pxでも横にはみ出さず、同じ節の操作重複とDOMを予算内に保つ", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });

    const budgets = await page.evaluate(() => {
      const repeatedSectionActions = [
        ...document.querySelectorAll<HTMLElement>("[data-home-section]"),
      ].reduce((total, section) => {
        const counts = new Map<string, number>();
        for (const link of section.querySelectorAll<HTMLAnchorElement>("a[href]")) {
          const key = `${link.getAttribute("href")}|${link.textContent?.replace(/\s+/g, " ").trim()}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return (
          total +
          [...counts.values()].reduce(
            (duplicates, count) => duplicates + Math.max(0, count - 1),
            0,
          )
        );
      }, 0);
      return {
        overflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        screens: document.documentElement.scrollHeight / window.innerHeight,
        repeatedSectionActions,
        dom: document.querySelectorAll("*").length,
        normalWarningCards: document.querySelectorAll(
          '[data-home-section] [data-warning-card], [data-home-section] [role="alert"]',
        ).length,
        heatState: document
          .querySelector('[data-home-section="heat"] [data-heat-status]')
          ?.getAttribute("data-heat-status"),
      };
    });

    expect(budgets.overflow).toBe(0);
    expect(budgets.screens).toBeLessThanOrEqual(12);
    expect(budgets.repeatedSectionActions).toBe(0);
    expect(budgets.normalWarningCards).toBe(
      budgets.heatState === "degraded" || budgets.heatState === "unavailable"
        ? 1
        : 0,
    );
    expect(budgets.dom).toBeLessThanOrEqual(1_250);
  });

  test("アンカーは一意で、固定UIに隠れないoffsetを持つ", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    for (const id of [
      "home-heat",
      "home-chat",
      "home-updates",
      "home-chemical",
      "home-learning",
      "home-automation",
    ]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
      expect(
        await page.locator(`#${id}`).evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).scrollMarginTop),
        ),
      ).toBeGreaterThan(0);
    }
  });

  test("初期HTMLとinline RSCを圧縮予算内に保つ", async ({ request }) => {
    const response = await request.get("/");
    const html = await response.text();
    const rscBytes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
      .filter((match) => match[1]?.includes("self.__next_f.push"))
      .reduce((total, match) => total + Buffer.byteLength(match[1] ?? "", "utf8"), 0);

    expect(Buffer.byteLength(html, "utf8")).toBeLessThanOrEqual(330_000);
    expect(rscBytes).toBeLessThanOrEqual(190_000);
  });
});

test("事故カードは判断材料を先に示し、KYへ未確認内容を自動取込しない", async ({
  page,
}) => {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto("/", { waitUntil: "networkidle" });
  const accidentCard = page.locator('[data-home-update="accidents"]');
  await expect(accidentCard.getByRole("link", { name: /KYを作る/ })).toHaveCount(0);
  await expect(accidentCard.getByText(/報道内容はKYへ引き継ぎません/)).toHaveCount(0);
  await expect(accidentCard.getByRole("heading", { level: 3, name: "最新事故" })).toBeVisible();
  if (
    (await accidentCard.locator('[data-accident-origin="reported-unverified"]').count()) >
    0
  ) {
    const reportedAccidents = accidentCard.locator(
      '[data-accident-origin="reported-unverified"]',
    );
    for (let index = 0; index < (await reportedAccidents.count()); index += 1) {
      const reportedAccident = reportedAccidents.nth(index);
      await expect(reportedAccident.locator("time")).toHaveCount(1);
      await expect(reportedAccident.locator("[data-accident-source]")).toHaveText(
        /出典：\S/u,
      );
    }
  } else {
    await expect(accidentCard.getByRole("status")).toContainText(
      "取得できません",
    );
    await expect(accidentCard).not.toContainText("事故なし");
  }
  await expect(accidentCard.getByRole("link", { name: "関連事故を見る" })).toHaveCount(1);

  const link = page.getByRole("link", { name: /KY用紙.*作成・印刷/ }).first();
  const href = await link.getAttribute("href");

  expect(href).toBe("/ky/paper");
  expect(href).not.toContain("?");

  await link.click();
  await expect(page).toHaveURL(/\/ky\/paper$/);
  await expect(page.getByRole("heading", { level: 1, name: "KYを作る" })).toBeVisible();
  await expect(page.locator("[data-ky-handoff-banner]")).toHaveCount(0);
  await expect(page.getByText(/候補として読み込みました/)).toHaveCount(0);
});

test("不正な事故文脈queryではバナーも自動確定も行わない", async ({ page }) => {
  await page.goto(
    "/ky/paper?fromAccident=%E4%BD%9C%E6%A5%AD%E8%80%85A&accidentType=raw-text&workCategory=construction",
  );
  await expect(page.locator("[data-home-accident-context]")).toHaveCount(0);
  await expect(page.getByText(/候補として読み込みました/)).toHaveCount(0);
});

test("ホームの化学物質入力をURL・storage・request URLへ露出しない", async ({
  page,
}) => {
  const rawQuery = "toluene-test-raw";
  const requestUrls: string[] = [];
  const chemicalSearchRequests: Array<{ method: string; url: string }> = [];
  page.on("request", (request) => {
    requestUrls.push(request.url());
    if (request.url().includes("/api/chemical/search")) {
      chemicalSearchRequests.push({ method: request.method(), url: request.url() });
    }
  });
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto("/", { waitUntil: "networkidle" });

  const input = page.getByRole("combobox", { name: "化学物質を検索" });
  const chemicalSearchResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/chemical/search") &&
      response.request().method() === "POST",
  );
  await input.fill(rawQuery);
  await input.press("Enter");
  await expect(page).toHaveURL(/\/chemical-ra#chemical-ra-start$/);
  await expect(page.locator("#chemical-onebox-input")).toHaveValue(rawQuery);
  expect((await chemicalSearchResponse).status()).toBeLessThan(400);

  expect(page.url()).not.toContain(rawQuery);
  expect(requestUrls.some((url) => url.includes(rawQuery))).toBe(false);
  expect(chemicalSearchRequests.length).toBeGreaterThan(0);
  expect(
    chemicalSearchRequests.every(
      ({ method, url }) => method === "POST" && !new URL(url).search,
    ),
  ).toBe(true);
  expect(
    await page.evaluate((value) => {
      for (const storage of [localStorage, sessionStorage]) {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (`${key}:${key ? storage.getItem(key) : ""}`.includes(value)) {
            return true;
          }
        }
      }
      return false;
    }, rawQuery),
  ).toBe(false);
});
