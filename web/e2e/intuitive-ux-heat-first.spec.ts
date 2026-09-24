import { expect, test, type Page } from "@playwright/test";

const DESKTOP_NAV = [
  ["今日の安全", "/risk"],
  ["熱中症対策", "/heat-illness-prevention"],
  ["KY用紙", "/ky/paper"],
  ["サイネージ", "/signage"],
  ["現場安全看板", "/materials/safety-images"],
  ["建設計算ツール", "/tools/construction-calculators"],
  ["安衛法AI", "/chatbot"],
  ["法令検索", "/law-search"],
  ["化学物質RA", "/chemical-ra"],
  ["法改正", "/laws"],
  ["国内の死亡事故速報", "/accident-news"],
  ["死亡事故DB", "/fatal-accidents"],
  ["事故分析", "/accidents-analytics"],
  ["5分ビジュアルKYT", "/training/visual-ky"],
  ["教育・資格", "/education-certification"],
  ["自動化相談", "/services/automation"],
  ["自由に使えるスライド", "/training/safety-seminars"],
  ["安全グッズ", "/goods"],
  ["安全AIとは", "/safety-ai"],
  ["サイト内検索", "/search"],
  ["全機能一覧", "/features"],
] as const;

const MOBILE_NAV = [
  ["ホーム", "/"],
  ["化学RA", "/chemical-ra"],
  ["法令AI", "/chatbot"],
  ["学ぶ", "/education-certification"],
  ["メニュー", "/features"],
] as const;

const MAIN_SERVICES = [
  ["安衛法AI", "/chatbot"],
  ["化学物質RA", "/chemical-ra"],
  ["国内の死亡事故速報", "/accident-news"],
  ["法改正速報", "/laws"],
  ["自動化相談", "/contact/automation-email"],
  ["安全グッズ", "/goods"],
  ["自由に使えるスライド", "/training/safety-seminars"],
  ["自由に使える画像集", "/materials/safety-images"],
  ["事故分析ダッシュボード", "/accidents-analytics"],
] as const;

async function expectMainServices(page: Page) {
  const services = page.getByRole("region", { name: "仕事から選ぶ、9つの主機能" });
  const cards = services.getByRole("listitem");
  await expect(cards).toHaveCount(MAIN_SERVICES.length);
  for (const [title, href] of MAIN_SERVICES) {
    const card = cards.filter({ has: page.getByRole("heading", { level: 3, name: title, exact: true }) });
    await expect(card).toHaveCount(1);
    // カード本体リンク（li > a）。下段の操作・noscript代替リンクはリンク外の兄弟要素
    await expect(card.locator(":scope > a")).toHaveAttribute("href", href);
    await expect(card.getByRole("img")).toHaveAccessibleName(/チワワ/);
  }
}

test("ホームはチワワの案内、9つの主機能、更新情報、カテゴリの順で使える", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /小さな気づきが、\s*大きな事故を防ぐ。/u,
    }),
  ).toBeVisible();
  await expect(page.locator("main h1")).toHaveCount(1);
  await expectMainServices(page);
  expect(await page.locator("main section[aria-labelledby]").evaluateAll((sections) =>
    sections.map((section) => section.getAttribute("aria-labelledby")),
  )).toEqual([
    "home-relaunch-title", "home-updates-title", "main-services-title",
    "home-automation-samples", "home-feature-directory", "home-automation-heading",
  ]);
  await expect(page.locator('[data-home-section="heat"]')).toHaveCount(0);
  await expect(page.locator('main [data-warning-card], main [role="alert"]')).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "サイト全体ナビゲーション", exact: true });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link")).toHaveCount(DESKTOP_NAV.length);
  for (const [label, href] of DESKTOP_NAV) {
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("href", href);
  }
  await expect(page.locator("[data-primary-navigation]")).toHaveCount(0);
  await expect(page.locator('[data-home-update="accidents"]').getByRole("link", { name: "事故速報をすべて見る" })).toHaveAttribute("href", "/accident-news");
  await expect(page.locator('[data-home-update="law-reform"]').getByRole("link", { name: "法改正一覧を見る" })).toHaveAttribute("href", "/laws");
  await expect(page.getByRole("region", { name: "カテゴリから探す" }).getByRole("link", { name: "KY用紙", exact: true })).toHaveAttribute("href", "/ky/paper");
});

test("モバイルは9機能とSafety Labsを区別し、重複のないメニューをキーボードで閉じられる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expectMainServices(page);
  await expect(page.locator('[data-home-section="updates"] article')).toHaveCount(2);
  await expect(page.locator('[data-feature-tier="3"][data-feature-role="automation-sample"]')).toHaveCount(3);
  await expect(page.getByRole("link", { name: "サンプルをすべて見る" })).toHaveAttribute("href", "/automation-examples");
  await expect(page.getByRole("link", { name: "すべての機能", exact: true })).toHaveAttribute("href", "/features");
  const mobileNav = page.getByRole("navigation", { name: "モバイル ボトムナビゲーション" });
  await expect(mobileNav.getByRole("link")).toHaveCount(MOBILE_NAV.length);
  for (const [label, href] of MOBILE_NAV) {
    const link = mobileNav.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
  }
  await expect(mobileNav.getByRole("link", { name: "熱中症", exact: true })).toHaveCount(0);
  const sections = [
    page.getByRole("region", {
      name: /小さな気づきが、\s*大きな事故を防ぐ。/u,
    }),
    page.locator('[data-home-section="updates"]'),
    page.getByRole("region", { name: "仕事から選ぶ、9つの主機能" }),
    page.getByRole("region", { name: "カテゴリから探す" }),
  ];
  const boxes = await Promise.all(sections.map((section) => section.boundingBox()));
  for (let index = 0; index < boxes.length - 1; index += 1) {
    expect(boxes[index]).not.toBeNull();
    expect(boxes[index + 1]).not.toBeNull();
    expect(boxes[index]!.y + boxes[index]!.height).toBeLessThanOrEqual(boxes[index + 1]!.y);
  }
  const menuButton = page.getByRole("button", { name: "メニューを開閉" });
  await menuButton.click();
  const menu = page.getByRole("region", { name: "モバイルサイトメニュー。Escキーで閉じます" });
  await expect(menu).toBeVisible();
  const menuLinkMetrics = await menu.getByRole("link").evaluateAll((links) =>
    links.map((link) => ({ href: link.getAttribute("href"), height: link.getBoundingClientRect().height })),
  );
  expect(menuLinkMetrics.every(({ height }) => height >= 44)).toBe(true);
  const mobilePrimaryHrefs = await mobileNav.getByRole("link").evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  );
  expect(menuLinkMetrics.map(({ href }) => href).filter((href) => mobilePrimaryHrefs.includes(href))).toEqual([]);
  const menuHrefs = menuLinkMetrics.map(({ href }) => href);
  // Header search has its own mobile entrypoint.
  const expectedMenuHrefs = [
    "/notifications",
    "/account",
    ...DESKTOP_NAV.map(([, href]) => href).filter((href) =>
      !mobilePrimaryHrefs.includes(href) && href !== "/search",
    ),
  ];
  expect(menuHrefs).toEqual(expectedMenuHrefs);
  expect(new Set(menuHrefs).size).toBe(menuHrefs.length);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(menuButton).toBeFocused();
});

test("JavaScript無効でも9機能・事故の確認状態・通常リンクをSSR HTMLに保持する", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 }, locale: "ja-JP" });
  try {
    const page = await context.newPage();
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    const noScriptNavigation = page.getByRole("navigation", { name: "JavaScriptなしで利用できる機能" });
    await expect(noScriptNavigation).toBeVisible();
    expect(await noScriptNavigation.getByRole("link").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    )).toEqual(["/chatbot", "/chemical-ra", "/accident-news", "/laws"]);
    await expectMainServices(page);
    const accidentCard = page.locator('[data-home-update="accidents"]');
    const reportedAccidents = accidentCard.locator('[data-accident-origin="reported-unverified"]');
    if ((await reportedAccidents.count()) > 0) {
      await expect(reportedAccidents.first()).toBeVisible();
      await expect(reportedAccidents.first().locator("time")).toHaveAttribute("datetime", /\d{4}-\d{2}-\d{2}/);
      await expect(reportedAccidents.first().locator("[data-accident-source]")).toHaveText(/出典：\S/u);
    } else {
      await expect(accidentCard.getByRole("status")).toContainText("取得できません");
      await expect(accidentCard).not.toContainText("事故なし");
    }
    await expect(page.getByText(/産業医が辞任・解任・退任したとき/).first()).toBeVisible();
    const quickNav = page.getByRole("navigation", { name: "すぐに使う主要機能" });
    await expect(quickNav.getByRole("link", { name: "化学物質RAを開く" })).toHaveAttribute("href", "/chemical-ra");
    await expect(quickNav.getByRole("link", { name: "安衛法AIを開く" })).toHaveAttribute("href", "/chatbot");
    await expect(page.locator('[data-feature-tier="3"]')).toHaveCount(3);
    await expect(page.locator('section[aria-labelledby="home-automation-samples"]').getByRole("link", { name: "サンプルをすべて見る" })).toHaveAttribute("href", "/automation-examples");
    await expect(page.getByRole("region", { name: "仕事から選ぶ、9つの主機能" }).getByRole("link", { name: "すべての機能", exact: true })).toHaveAttribute("href", "/features");
    const directory = page.getByRole("region", { name: "カテゴリから探す" });
    const details = directory.locator("details").first();
    await details.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(details.getByRole("link", { name: "通知設定" })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("主要作業ページは入力・現在値を先に示し、通常時の警告壁と操作乱立を出さない", async ({ page }) => {
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
    await expect(page.locator(targetSelector).first(), route).toBeVisible();
    await expect(page.locator("main [role=alert]"), route).toHaveCount(0);
    const nextActions = page.locator('main section[aria-labelledby="contextual-next-actions"] a[href]');
    expect(await nextActions.count(), route).toBeLessThanOrEqual(3);
  }
});

test("旗艦ツールは1つのH1と主入力・主操作を初期画面内に示し、400%相当幅でも操作できる", async ({ page }) => {
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
    if (route === "/risk") await expect(primary).toHaveAccessibleName("現場の地域を検索");
    await primary.focus();
    await expect(primary, route).toBeFocused();
    const box = await primary.boundingBox();
    expect(box, route).not.toBeNull();
    expect(box?.y ?? 844, route).toBeGreaterThanOrEqual(0);
    expect((box?.y ?? 844) + (box?.height ?? 0), route).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/chatbot", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("質問入力")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
