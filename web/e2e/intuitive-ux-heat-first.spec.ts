import { expect, test } from "@playwright/test";

const DESKTOP_NAV = [
  ["今日の安全", "/risk"],
  ["熱中症対策", "/heat-illness-prevention"],
  ["KY用紙", "/ky/paper"],
  ["サイネージ", "/signage"],
  ["安衛法AI", "/chatbot"],
  ["法令検索", "/law-search"],
  ["化学物質RA", "/chemical-ra"],
  ["法改正", "/laws"],
  ["労災事故", "/accident-news"],
  ["5分ビジュアルKYT", "/training/visual-ky"],
  ["教育・資格", "/education-certification"],
  ["自動化相談", "/services/automation"],
  ["安全AIとは", "/safety-ai"],
  ["サイト内検索", "/search"],
  ["全機能一覧", "/features"],
] as const;

const MOBILE_NAV = ["ホーム", "熱中症", "法令AI", "学ぶ", "メニュー"] as const;

test("ホームは熱中症の現在値、直接入力、事故、法改正、学習、実務、相談の順で使える", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setExtraHTTPHeaders({
    "x-vercel-ip-country": "JP",
    "x-vercel-ip-country-region": "13",
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "今日の熱中症リスク",
    }),
  ).toBeVisible();
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
  await expect(page.locator('[data-home-section="quality"]')).toHaveCount(0);
  const heatState = await page
    .locator('[data-home-section="heat"] [data-heat-status]')
    .getAttribute("data-heat-status");
  await expect(page.locator('[data-home-section] [data-warning-card]')).toHaveCount(
    heatState === "degraded" || heatState === "unavailable" ? 1 : 0,
  );
  const heatText = await page.locator('[data-home-section="heat"]').innerText();
  expect(heatText).not.toContain("化学物質を検索");
  expect(heatText).not.toContain("安衛法AIへの質問");
  await expect(page.locator('[data-home-section="chat"] textarea')).toBeAttached();
  await expect(page.locator('[data-home-section="chemical"] input')).toBeAttached();

  const nav = page.getByRole("navigation", {
    name: "サイト全体ナビゲーション",
  });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link")).toHaveCount(DESKTOP_NAV.length);
  for (const [label, href] of DESKTOP_NAV) {
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("href", href);
  }
  await expect(page.locator("[data-primary-navigation]")).toHaveCount(0);

  await expect(
    page
      .locator('[data-home-section="heat"] details[data-home-area-picker]')
      .locator('a[href="/risk?area=tokyo-shinjuku"]'),
  ).toHaveAttribute("href", "/risk?area=tokyo-shinjuku");
  await expect(
    page.locator('[data-home-update="accidents"]').getByRole("link", {
      name: "関連事故を見る",
    }),
  ).toHaveAttribute("href", "/accident-news");
  await expect(
    page.locator('[data-home-update="law-reform"]').getByRole("link", {
      name: "法改正一覧を見る",
    }),
  ).toHaveAttribute("href", "/laws");
  await expect(
    page.locator('[data-home-section="learning"]').getByRole("link", {
      name: "問題に挑戦",
    }),
  ).toHaveAttribute("href", /\/training\/visual-ky\//);
  await expect(
    page.locator('[data-home-section="core-features"]').getByRole("link", {
      name: /KY用紙/,
    }),
  ).toHaveAttribute("href", "/ky/paper");
});

test("モバイルは結果と直接入力を保ち、Safety Labs・全機能を正規URLで区別する", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-home-section="heat"]')).toBeVisible();
  await expect(page.locator('[data-home-section="updates"] article')).toHaveCount(2);
  await expect(page.locator('[data-home-update="accidents"]')).toHaveCount(1);
  await expect(page.locator('[data-home-update="law-reform"]')).toHaveCount(1);
  await expect(page.locator('[data-home-section="chat"] textarea')).toHaveCount(1);
  await expect(page.locator('[data-home-section="chemical"] input')).toHaveCount(1);
  await expect(
    page.locator('[data-home-section="core-features"] > div > ul > li'),
  ).toHaveCount(6);
  await expect(
    page.locator(
      '[data-feature-tier="3"][data-feature-role="automation-sample"]',
    ),
  ).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: "サンプルをすべて見る" }),
  ).toHaveAttribute("href", "/automation-examples");
  await expect(page.getByRole("link", { name: "すべての機能" })).toHaveAttribute(
    "href",
    "/features",
  );

  const mobileNav = page.getByRole("navigation", {
    name: "モバイル ボトムナビゲーション",
  });
  await expect(mobileNav.getByRole("link")).toHaveCount(5);
  for (const label of MOBILE_NAV) {
    await expect(mobileNav.getByRole("link", { name: label })).toHaveCount(1);
  }

  const heat = page.locator('[data-home-section="heat"]');
  const chat = page.locator('[data-home-section="chat"]');
  const chemical = page.locator('[data-home-section="chemical"]');
  const coreFeatures = page.locator(
    'section[aria-labelledby="home-core-features"]',
  );
  const [heatBox, chatBox, chemicalBox, coreFeaturesBox] = await Promise.all([
    heat.boundingBox(),
    chat.boundingBox(),
    chemical.boundingBox(),
    coreFeatures.boundingBox(),
  ]);
  expect(heatBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(chatBox?.y ?? 0);
  expect(chatBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(
    chemicalBox?.y ?? 0,
  );
  expect(chemicalBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(
    coreFeaturesBox?.y ?? 0,
  );
  await expect(
    heat.getByText("地域・観測情報", { exact: true }),
  ).toBeVisible();

  const menuButton = page.getByRole("button", { name: "メニューを開閉" });
  await menuButton.click();
  const menu = page.getByRole("region", {
    name: "モバイルサイトメニュー。Escキーで閉じます",
  });
  await expect(menu).toBeVisible();
  const menuLinkMetrics = await menu.getByRole("link").evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute("href"),
      height: link.getBoundingClientRect().height,
    })),
  );
  expect(menuLinkMetrics.every(({ height }) => height >= 44)).toBe(true);
  const mobilePrimaryHrefs = await mobileNav
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(
    menuLinkMetrics
      .map(({ href }) => href)
      .filter((href) => mobilePrimaryHrefs.includes(href)),
  ).toEqual([]);
  const menuHrefs = menuLinkMetrics.map(({ href }) => href);
  expect(menuLinkMetrics).toHaveLength(12);
  expect([...mobilePrimaryHrefs, ...menuHrefs]).toEqual(
    expect.arrayContaining(["/risk", "/heat-illness-prevention"]),
  );
  expect(new Set(menuLinkMetrics.map(({ href }) => href)).size).toBe(
    menuLinkMetrics.length,
  );
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(menuButton).toBeFocused();
});

test("JavaScript無効でも実情報・通常リンク・Safety LabsをSSR HTMLに保持する", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
  });
  const page = await context.newPage();
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  await expect(
    page
      .getByRole("navigation", { name: "JavaScriptなしで利用できる機能" })
      .getByRole("link", { name: "WBGT・現場リスク" }),
  ).toHaveAttribute("href", "/risk");
  await expect(
    page
      .getByRole("navigation", { name: "JavaScriptなしで利用できる機能" })
      .getByRole("link", { name: "熱中症スライド" }),
  ).toHaveAttribute("href", "/heat-illness-prevention/slides");
  const noScriptNavigation = page.getByRole("navigation", {
    name: "JavaScriptなしで利用できる機能",
  });
  expect(
    await noScriptNavigation.getByRole("link").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    ),
  ).toEqual(["/risk", "/heat-illness-prevention/slides"]);
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
  const accidentCard = page.locator('[data-home-update="accidents"]');
  const reportedAccidents = accidentCard.locator(
    '[data-accident-origin="reported-unverified"]',
  );
  if ((await reportedAccidents.count()) > 0) {
    await expect(reportedAccidents.first()).toBeVisible();
  } else {
    await expect(accidentCard.getByRole("status")).toContainText(
      "取得できません",
    );
    await expect(accidentCard).not.toContainText("事故なし");
  }
  await expect(
    page.getByText(/産業医が辞任・解任・退任したとき/).first(),
  ).toBeVisible();
  await expect(
    page
      .locator("[data-home-chemical-quick-search]")
      .getByRole("link", { name: "化学物質RAを開く" }),
  ).toHaveAttribute("href", "/chemical-ra");
  await expect(
    page
      .locator("[data-home-chat-quick-ask]")
      .getByRole("link", { name: "安衛法AIで質問する" }),
  ).toHaveAttribute("href", "/chatbot");
  await expect(page.locator('[data-feature-tier="3"]')).toHaveCount(3);
  await expect(
    page
      .locator('section[aria-labelledby="home-automation-samples"]')
      .getByRole("link", { name: "サンプルをすべて見る" }),
  ).toHaveAttribute("href", "/automation-examples");
  await expect(
    page
      .locator('[data-home-section="core-features"]')
      .getByRole("link", { name: "すべての機能" }),
  ).toHaveAttribute("href", "/features");
  await context.close();
});

test("主要作業ページは入力・現在値を先に示し、通常時の警告壁と操作乱立を出さない", async ({
  page,
}) => {
  const routes = [
    ["/heat-illness-prevention", "[data-primary-action]"],
    ["/ky/paper", "#ky-work-description"],
    ["/chemical-ra", "#chemical-onebox-input"],
    ["/law-search", '[aria-label="法令フリーワード検索"]'],
    ["/accidents", '[aria-label="事故事例キーワード検索"]'],
  ] as const;
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, targetSelector] of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1"), route).toHaveCount(1);
    const target = page.locator(targetSelector).first();
    await expect(target, route).toBeVisible();
    await expect(page.locator("main [role=alert]"), route).toHaveCount(0);
    const nextActions = page.locator(
      'main section[aria-labelledby="contextual-next-actions"] a[href]',
    );
    expect(await nextActions.count(), route).toBeLessThanOrEqual(3);
  }
});

test("旗艦ツールは1つのH1と主入力・主操作を初期画面内に示し、400%相当幅でも操作できる", async ({
  page,
}) => {
  const routes = [
    ["/risk", 'form[data-official-area-resolver] input[role="combobox"]'],
    ["/ky/paper", "#ky-work-description"],
    ["/chemical-ra", "#chemical-onebox-input"],
    ["/chatbot", '[aria-label="質問入力"]'],
    ["/law-search", '[aria-label="法令フリーワード検索"]'],
    ["/accidents", '[aria-label="事故事例キーワード検索"]'],
    ["/education-certification/finder", "[data-primary-action]"],
  ] as const;
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, targetSelector] of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1")).toHaveCount(1);
    const primary = page.locator(targetSelector).first();
    await expect(primary, route).toBeVisible();
    if (route === "/risk") {
      await expect(primary).toHaveAccessibleName("現場の地域を検索");
    }
    await primary.focus();
    await expect(primary, route).toBeFocused();
    const box = await primary.boundingBox();
    expect(box, route).not.toBeNull();
    expect(box?.y ?? 844, route).toBeGreaterThanOrEqual(0);
    expect((box?.y ?? 844) + (box?.height ?? 0), route).toBeLessThanOrEqual(844);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/chatbot", { waitUntil: "domcontentloaded" });
  const composer = page.getByLabel("質問入力");
  await expect(composer).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
});
