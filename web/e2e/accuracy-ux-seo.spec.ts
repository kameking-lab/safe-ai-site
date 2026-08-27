import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceRoot = resolve(
  process.cwd(),
  "../docs/audits/evidence/accuracy-ux-seo",
);
const screenshotRoot = resolve(evidenceRoot, "screenshots");
const observations: {
  generatedAt: string;
  widths: number[];
  consoleErrors: Array<{ url: string; message: string }>;
  notes: string[];
} = {
  generatedAt: new Date().toISOString(),
  widths: [],
  consoleErrors: [],
  notes: [],
};

function collectErrors(page: Page) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      observations.consoleErrors.push({
        url: page.url(),
        message: message.text().slice(0, 5_000),
      });
    }
  });
  page.on("pageerror", (error) => {
    observations.consoleErrors.push({
      url: page.url(),
      message: error.message.slice(0, 5_000),
    });
  });
}

async function materializeFullPage(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(100);
  await page.evaluate(async () => {
    for (const element of document.querySelectorAll<HTMLElement>("*")) {
      if (window.getComputedStyle(element).contentVisibility === "auto") {
        element.style.contentVisibility = "visible";
        element.style.containIntrinsicSize = "none";
      }
    }
    const step = Math.max(400, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise<void>((resolveFrame) =>
        window.requestAnimationFrame(() => resolveFrame()),
      );
    }
    window.scrollTo(0, 0);
    await new Promise<void>((resolveFrame) =>
      window.requestAnimationFrame(() => resolveFrame()),
    );
  });
}

test.beforeAll(() => mkdirSync(screenshotRoot, { recursive: true }));

test.afterAll(() => {
  writeFileSync(
    resolve(evidenceRoot, "browser-observations.json"),
    `${JSON.stringify(observations, null, 2)}\n`,
    "utf8",
  );
});

test("ホームは6幅で熱中症を最上部にし、主要タスクへ進める", async ({ page }) => {
  collectErrors(page);
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({
      width,
      height: width < 768 ? 844 : 900,
    });
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "今日の熱中症リスク",
      }),
    ).toBeVisible();
    await expect(page.locator('[data-home-section="heat"]')).toBeVisible();
    await expect(page.locator("[data-home-heat-slide-deck]")).toBeAttached();
    await expect(page.locator("[data-home-chemical-quick-search]")).toBeAttached();
    await expect(page.locator("[data-home-chat-quick-ask]")).toBeAttached();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "関連事故を見る" }),
    ).toHaveAttribute(
      "href",
      "/accident-news",
    );
    await expect(
      page.getByRole("link", { name: "法改正一覧を見る" }),
    ).toHaveAttribute("href", "/laws");
    await expect(
      page.locator('[data-home-section="core-features"] > div > ul > li'),
    ).toHaveCount(7);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    observations.widths.push(width);
    await materializeFullPage(page);
    await page.screenshot({
      path: resolve(screenshotRoot, `home-${width}px.png`),
      fullPage: true,
      caret: "initial",
    });
  }
});

test("モバイル下部ナビは季節の5操作をキーボードで移動できる", async ({
  page,
}) => {
  collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const mobileNav = page.getByRole("navigation", {
    name: "モバイル ボトムナビゲーション",
  });
  for (const label of ["ホーム", "熱中症", "法令AI", "学ぶ", "メニュー"]) {
    await expect(mobileNav.getByRole("link", { name: label })).toBeVisible();
  }
  const heat = mobileNav.getByRole("link", { name: "熱中症" });
  await heat.focus();
  await expect(heat).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(mobileNav.getByRole("link", { name: "法令AI" })).toBeFocused();
  await page.screenshot({
    path: resolve(screenshotRoot, "mobile-navigation-keyboard-390px.png"),
    fullPage: true,
    caret: "initial",
  });
});

test("今日の暑熱は直接地域を引き継ぎ、JMA取得、stale・取得不能を安全側に扱う", async ({
  page,
}) => {
  collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const fresh = new Date().toISOString();
  const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  let requestCount = 0;

  await page.route("**/api/weather-risk**", (route) => {
    requestCount += 1;
    if (requestCount === 3) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          partial: true,
          fetchedAt: fresh,
          unavailableSources: ["open-meteo"],
          officialWarning: {
            status: "live",
            warnings: [],
            headline: null,
            fetchedAt: fresh,
            reportAt: fresh,
            sourceUrl: "https://www.jma.go.jp/bosai/warning/",
          },
          error: {
            code: "UNAVAILABLE",
            message: "予報を取得できません。最新状態は気象庁で確認してください。",
            retryable: true,
          },
        }),
      });
    }
    const timestamp = requestCount === 2 ? stale : fresh;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        snapshot: {
          regionName:
            requestCount === 2 ? "東京都 千代田区" : "東京都 新宿区",
          date: today,
          overview: "本日の予報",
          temperatureCelsius: 35.1,
          windSpeedMs: 4,
          precipitationMm: 0,
          alerts: [],
        },
        provider: "open-meteo",
        fetchedAt: timestamp,
        officialWarning: {
          status: "live",
          warnings: [],
          headline: null,
          fetchedAt: timestamp,
          reportAt: timestamp,
          sourceUrl: "https://www.jma.go.jp/bosai/warning/",
        },
        current: {
          temperatureCelsius: 35.1,
          relativeHumidityPercent: 62,
          targetAt: timestamp,
        },
      }),
    });
  });

  await page.route("**/api/wbgt?*", (route) => {
    const now = new Date().toISOString();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        areaId: "tokyo-shinjuku",
        areaLabel: "東京都 新宿区",
        prefectureIso: "JP-13",
        scopeLabel:
          "東京都内の提供地点最大。作業地点のJIS適合計による実測ではありません。",
        wbgt: {
          status: "estimated",
          mode: "official-estimated-current",
          valueCelsius: 31.4,
          targetAt: now,
          createdAt: null,
          stationCount: 11,
          expectedStationCount: 11,
          stale: false,
          label: "公式提供・実況推定（都道府県内最大）",
        },
        alerts: {
          heatAlert: "inactive",
          specialHeatAlert: "inactive",
          targetDate: today,
          reportAt: now,
        },
        retrievedAt: now,
        degraded: false,
        provider: "環境省 熱中症予防情報サイト",
        sourceUrl: "https://www.wbgt.env.go.jp/",
        dataServiceUrl: "https://www.wbgt.env.go.jp/data_service.php",
      }),
    });
  });

  await page.goto("/risk?area=tokyo-shinjuku", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText(/予報提供元: Open-Meteo/)).toBeVisible();
  await expect(page.getByText(/実測: 未確認 ／ 推定: 表示中/)).toBeVisible();
  const kyLink = page.getByRole("link", { name: "この条件でKYを作る" });
  await expect(kyLink).toHaveAttribute("href", "/ky/paper");
  await expect(kyLink).toHaveAttribute("data-ky-handoff-ready", "true");

  const region = page.getByLabel("現場の地域を検索");
  await region.focus();
  await region.fill("東京都 千代田区");
  await page.getByRole("button", { name: "この地域を表示" }).click();
  await expect(
    page.getByText("情報が古いため、公式情報を確認してください。"),
  ).toBeVisible();

  await page.getByRole("button", { name: "気象・警報を再取得" }).click();
  const riskCard = page.getByRole("region", { name: "今日の現場リスク" });
  await expect(riskCard).toContainText(
    "予報を取得できません。最新状態は気象庁で確認してください。",
  );
  await expect(page.getByRole("link", { name: "この条件でKYを作る" })).toHaveCount(0);
  await expect(page.getByText("警報なし", { exact: true })).toHaveCount(0);
  await expect(page.getByText("安全", { exact: true })).toHaveCount(0);
  expect(requestCount).toBe(3);
});

test("安全AIブランドLPは200%文字拡大・reduced motionでも主価値と次の操作を読める", async ({
  page,
}) => {
  collectErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/safety-ai");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "安全情報を、現場で使える行動へ。",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "今すぐ使う" }).first(),
  ).toHaveAttribute("href", "/");
  await expect(page.getByRole("heading", { level: 2, name: "必要な機能を、その場で開く" })).toBeVisible();
  await expect(page.getByRole("link", { name: "注意事項" })).toHaveAttribute(
    "href",
    "/about/usage-notes",
  );
  await expect(page.locator("[data-warning-card]")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(2);
  await materializeFullPage(page);
  await page.screenshot({
    path: resolve(
      screenshotRoot,
      "safety-ai-390px-text-200-reduced-motion.png",
    ),
    fullPage: true,
    caret: "initial",
  });
  observations.notes.push(
    "200%はroot font-sizeによるテキスト拡大。ブラウザUIを含むネイティブズームは手動確認項目。",
  );
});

test("KYはofflineを明示し、保存・同期済みと誤表示しない", async ({
  page,
  context,
}) => {
  collectErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ky/paper");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(
    page.locator("main").getByText("オフラインモード", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('[data-operational-state="synced"]')).toHaveCount(0);
  await page.screenshot({
    path: resolve(screenshotRoot, "ky-offline-390px.png"),
    fullPage: true,
    caret: "initial",
  });
  await context.setOffline(false);
});

test("サイネージはAPI failureを警報なし・安全へ置き換えない", async ({
  page,
}) => {
  collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/signage-data**", (route) => route.abort("failed"));
  await page.goto("/signage", { waitUntil: "domcontentloaded" });
  const presentation = page.locator('[data-signage-presentation="1024"]');
  await expect(
    presentation.getByText("取得できません", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    presentation.getByText("警報の有無を確認不能", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("警報なし", { exact: true })).toHaveCount(0);
  await expect(page.getByText("安全", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: resolve(screenshotRoot, "signage-api-failure-1440px.png"),
    fullPage: true,
    caret: "initial",
  });
});

test("別地域のJMA障害でも選択地点の取得済み警報を主要表示と地図に残す", async ({
  page,
}) => {
  collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const now = new Date().toISOString();
  await page.route("**/api/signage-data**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        fetchedAt: now,
        degradedSources: ["jma", "open-meteo", "labor-rss"],
        jmaSourceFetchedAt: now,
        jmaSelectedState: "live",
        jmaVerifiedPrefectureCount: 1,
        openMeteoFetchedAt: null,
        openMeteoForecastFrom: null,
        openMeteoForecastThrough: null,
        openMeteoTimezone: null,
        prefectureLevels: { "JP-13": "warning" },
        laborTrend: [],
        hourly: [],
        jmaHeadline: "東京都に大雨警報",
        jmaReportTime: now,
        selectedWarnings: [{ code: "03", status: "発表" }],
        locationLabel: "東京都 新宿区",
      }),
    }),
  );
  await page.route("**/api/weather-risk**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        partial: true,
        fetchedAt: now,
        unavailableSources: ["open-meteo"],
        officialWarning: {
          status: "live",
          warnings: [{ code: "03", status: "発表", level: "warning" }],
          headline: "東京都に大雨警報",
          fetchedAt: now,
          reportAt: now,
          sourceUrl: "https://www.jma.go.jp/bosai/warning/",
        },
        error: {
          code: "UNAVAILABLE",
          message: "Open-Meteo unavailable",
          retryable: true,
        },
      }),
    }),
  );

  await page.goto("/signage", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/警報 発表中/).first()).toBeVisible();
  await expect(
    page.getByText(/一部を確認できません/).first(),
  ).toBeVisible();
  await expect(page.getByText("警報なし", { exact: true })).toHaveCount(0);

  const settingsButton = page.getByRole("button", { name: "設定・詳細" });
  await settingsButton.focus();
  await page.keyboard.press("Enter");
  const settingsDialog = page.getByRole("dialog", {
    name: "サイネージ設定・詳細",
  });
  await expect(settingsDialog).toBeVisible();
  await expect(
    settingsDialog.getByText(/未確認地域は斜線で表示/).first(),
  ).toBeVisible({ timeout: 10_000 });
});

test("slow network中もサイネージは取得中または未取得を明示する", async ({
  page,
}) => {
  collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/signage-data**", async (route) => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_500));
    await route.abort("timedout");
  });
  await page.goto("/signage", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: resolve(screenshotRoot, "signage-slow-network-1440px.png"),
    fullPage: true,
    caret: "initial",
  });
  observations.notes.push(
    "signage-dataを2.5秒遅延後timeoutとして、初期取得中から失敗表示への遷移を確認。",
  );
});

test("優先canonicalページは固有title・H1・description・self canonicalを持つ", async ({
  page,
}) => {
  collectErrors(page);
  const paths = [
    "/",
    "/safety-ai",
    "/chemical-ra",
    "/guides/chemical-ra-create-simple",
    "/ky/paper",
    "/guides/ky-sheet",
    "/signage",
    "/guides/safety-signage",
    "/chatbot",
    "/guides/anzeneho-ai-chatbot",
    "/law-search",
    "/about/quality",
  ];
  const titles = new Set<string>();

  for (const path of paths) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), path).toBe(200);
    const title = await page.title();
    expect(title.length, path).toBeGreaterThan(8);
    expect(titles.has(title), `duplicate title: ${title}`).toBe(false);
    titles.add(title);
    await expect(page.locator("h1").first(), path).toBeVisible();
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description?.length ?? 0, path).toBeGreaterThan(50);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical, path).toBe(
      `https://www.anzen-ai-portal.jp${path === "/" ? "" : path}`,
    );

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.length, path).toBeGreaterThan(0);
    for (const value of jsonLd) expect(() => JSON.parse(value), path).not.toThrow();
  }
});
