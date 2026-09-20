import { expect, test } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

async function warmKyPaperRoute(page: Page) {
  // A cold App Router chunk can trigger a dev-only Fast Refresh that cancels
  // the first client transition. Production serves precompiled chunks.
  await page.goto("/ky/paper", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "KYを作る" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
}

test.describe("9つの主機能を案内するホームの圧縮予算", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.setExtraHTTPHeaders({
      "x-vercel-ip-country": "JP",
      "x-vercel-ip-country-region": "13",
    });
  });

  test("主要導線と9機能を先に配置し、事故・法改正の根拠表示を保つ", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /小さな気づきが、\s*大きな事故を防ぐ。/u,
      }),
    ).toBeVisible();
    const quickNav = page.getByRole("navigation", { name: "すぐに使う主要機能" });
    await expect(quickNav.getByRole("link")).toHaveCount(3);
    const services = page.getByRole("region", { name: "仕事から選ぶ、9つの主機能" });
    await expect(services.getByRole("listitem")).toHaveCount(9);
    await expect(services.getByRole("listitem").getByRole("link")).toHaveCount(9);
    await expect(page.locator('[data-home-section="heat"]')).toHaveCount(0);
    await expect(page.locator('[data-home-section="quality"]')).toHaveCount(0);
    await expect(page.locator('main [data-warning-card], main [role="alert"]')).toHaveCount(0);

    const metrics = await page.evaluate(({ viewportHeight }) => {
      const top = (selector: string) =>
        document.querySelector(selector)?.getBoundingClientRect().top ??
        Number.POSITIVE_INFINITY;
      const height = (selector: string) =>
        document.querySelector(selector)?.getBoundingClientRect().height ??
        Number.POSITIVE_INFINITY;
      return {
        screens: document.documentElement.scrollHeight / viewportHeight,
        heroHeight: height('section[aria-labelledby="home-relaunch-title"]'),
        quickNavScreen: top('nav[aria-label="すぐに使う主要機能"]') / viewportHeight,
        servicesTop: top('section[aria-labelledby="main-services-title"]'),
        updatesTop: top('[data-home-section="updates"]'),
        directoryTop: top('section[aria-labelledby="home-feature-directory"]'),
        mainDom: document.querySelector("main")?.querySelectorAll("*").length ?? 0,
      };
    }, { viewportHeight: MOBILE_VIEWPORT.height });

    expect(metrics.screens).toBeLessThanOrEqual(13);
    expect(metrics.heroHeight).toBeLessThanOrEqual(1_200);
    expect(metrics.quickNavScreen).toBeLessThanOrEqual(1);
    expect(metrics.servicesTop).toBeLessThan(metrics.updatesTop);
    expect(metrics.updatesTop).toBeLessThan(metrics.directoryTop);
    expect(metrics.mainDom).toBeLessThanOrEqual(900);

    await expect(page.locator('[data-accident-origin="official"]')).toHaveCount(1);
    expect(
      await page.locator('[data-accident-origin="reported-unverified"]').count(),
    ).toBeLessThanOrEqual(2);
    await expect(page.locator('[data-home-update="accidents"]')).not.toContainText(
      "事故なし",
    );
    await expect(page.locator("[data-law-source-state]")).toHaveCount(3);
    await expect(page.locator('section[aria-labelledby="home-feature-directory"] article')).toHaveCount(8);
  });

  test("320pxでも横にはみ出さず、同じ節の操作重複とDOMを予算内に保つ", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });

    const budgets = await page.evaluate(() => {
      const repeatedSectionActions = [
        ...document.querySelectorAll<HTMLElement>("main section[aria-labelledby]"),
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
          'main [data-warning-card], main [role="alert"]',
        ).length,
      };
    });

    expect(budgets.overflow).toBe(0);
    expect(budgets.screens).toBeLessThanOrEqual(13);
    expect(budgets.repeatedSectionActions).toBe(0);
    expect(budgets.normalWarningCards).toBe(0);
    expect(budgets.dom).toBeLessThanOrEqual(1_250);
  });

  test("見出し参照は一意で、更新・相談のアンカーは固定UI用offsetを持つ", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    for (const id of ["home-relaunch-title", "main-services-title", "home-feature-directory"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
      await expect(page.locator(`section[aria-labelledby="${id}"]`)).toHaveCount(1);
    }
    for (const id of [
      "home-updates",
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
    expect(response.status()).toBe(200);
    const html = await response.text();
    const rscBytes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
      .filter((match) => match[1]?.includes("self.__next_f.push"))
      .reduce((total, match) => total + Buffer.byteLength(match[1] ?? "", "utf8"), 0);

    expect(Buffer.byteLength(html, "utf8")).toBeLessThanOrEqual(350_000);
    expect(rscBytes).toBeLessThanOrEqual(190_000);
  });
});

test("事故カードは判断材料を先に示し、KYへ未確認内容を自動取込しない", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await warmKyPaperRoute(page);
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

  const link = page.getByRole("region", { name: "カテゴリから探す" }).getByRole("link", { name: "KY用紙", exact: true });
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

test("ホームから開いた化学物質RAの入力をURL・storage・request URLへ露出しない", async ({
  page,
}) => {
  test.setTimeout(60_000);
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
  const chemicalLink = page.getByRole("navigation", { name: "すぐに使う主要機能" })
    .getByRole("link", { name: "化学物質RAを開く" });
  await expect(chemicalLink).toHaveAttribute("href", "/chemical-ra");
  await chemicalLink.click();
  await expect(page).toHaveURL(/\/chemical-ra$/);

  const input = page.getByRole("combobox", { name: "物質名・CAS番号・SDS記載名" });
  const chemicalSearchResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/chemical/search") &&
      response.request().method() === "POST",
  );
  await input.fill(rawQuery);
  await expect(page.locator("#chemical-onebox-input")).toHaveValue(rawQuery);
  const searchResponse = await chemicalSearchResponse;
  expect(searchResponse.status()).toBeLessThan(400);
  expect(searchResponse.request().postDataJSON()).toMatchObject({ query: rawQuery });
  // Keep the raw input in place while debounced follow-up requests settle.
  await page.waitForLoadState("networkidle");
  await expect(input).toHaveValue(rawQuery);

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
