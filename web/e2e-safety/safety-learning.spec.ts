import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const COURSE_PATH = "/e-learning/safety/first-class-health-officer";
const LEGACY_PROGRESS_KEY = "safe-ai:elearning-progress-v1";
const LEGACY_PROGRESS_VALUE = JSON.stringify({ minutes: 30, completed: 4 });

function captureRuntimeFailures(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", (error: Error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  return failures;
}

test("wrong answers stay on the question, retry works, and only correct answers advance", async ({ page }) => {
  const runtimeFailures = captureRuntimeFailures(page);
  const runtimeApiRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") || /(?:gemini|genai|openai)/i.test(url.hostname)) {
      runtimeApiRequests.push(request.url());
    }
  });

  await page.goto(COURSE_PATH, { waitUntil: "networkidle" });
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [LEGACY_PROGRESS_KEY, LEGACY_PROGRESS_VALUE],
  );
  const storageBefore = await page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)));

  await expect(page.getByRole("heading", { level: 1, name: "第一種衛生管理者" })).toBeVisible();
  await expect(page.getByText("1問目／4問", { exact: true })).toBeVisible();

  await page.keyboard.press("2");
  await page.keyboard.press("Enter");
  const incorrectHeading = page.getByRole("heading", { level: 3, name: "不正解" });
  await expect(incorrectHeading).toBeVisible();
  await expect(incorrectHeading).toBeFocused();
  await expect(page.getByRole("button", { name: "次へ" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "もう一度選ぶ" })).toBeVisible();

  await page.keyboard.press("Enter");
  const firstChoice = page.getByRole("radio").first();
  await expect(firstChoice).toBeFocused();
  await page.keyboard.press("1");
  await page.keyboard.press("Enter");
  const correctHeading = page.getByRole("heading", { level: 3, name: "正解" });
  await expect(correctHeading).toBeVisible();
  await expect(correctHeading).toBeFocused();
  await expect(page.getByRole("button", { name: "次へ" })).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.getByText("2問目／4問", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /製造業の事業場/ })).toBeFocused();

  const storageAfter = await page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)));
  expect(storageAfter).toEqual(storageBefore);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), LEGACY_PROGRESS_KEY)).toBe(LEGACY_PROGRESS_VALUE);
  expect(runtimeApiRequests).toEqual([]);
  expect(runtimeFailures).toEqual([]);
});

test("course UI has no accessibility violations or mobile overflow in dark/reduced-motion modes", async ({ page, browserName }) => {
  const runtimeFailures = captureRuntimeFailures(page);
  await page.emulateMedia({
    colorScheme: "dark",
    reducedMotion: "reduce",
    ...(browserName === "chromium" ? { forcedColors: "active" as const } : {}),
  });
  await page.goto(COURSE_PATH, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 2, name: /常時73人/ })).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .include("#question-player")
    .analyze();
  expect(accessibility.violations).toEqual([]);

  const geometry = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(runtimeFailures).toEqual([]);
});

test("visited safety routes remain usable through the service worker while offline", async ({ page, context, browserName }, testInfo) => {
  test.skip(browserName !== "chromium" || testInfo.project.name === "mobile-390", "one functional SW run is sufficient; interaction runs cover every browser project");
  const runtimeFailures = captureRuntimeFailures(page);

  await page.goto("/e-learning/safety", { waitUntil: "networkidle" });
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });
  await page.reload({ waitUntil: "networkidle" });

  const courseLink = page.getByRole("link", { name: "第一種衛生管理者の問題演習を始める" });
  await expect(courseLink).toHaveAttribute("href", COURSE_PATH);
  await Promise.all([
    page.waitForURL(`**${COURSE_PATH}`),
    courseLink.click(),
  ]);
  await expect(page.getByRole("heading", { level: 2, name: /常時73人/ })).toBeVisible();

  const cachedPaths = await page.evaluate(async () => {
    const cache = await caches.open("anzen-ai-v7");
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  expect(cachedPaths).toEqual(expect.arrayContaining(["/e-learning/safety", COURSE_PATH]));

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 2, name: /常時73人/ })).toBeVisible();
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 3, name: "正解" })).toBeVisible();

    await Promise.all([
      page.waitForURL("**/e-learning/safety"),
      page.getByRole("link", { name: "安全資格一覧へ戻る" }).click(),
    ]);
    await expect(page.getByRole("heading", { level: 1, name: "安全資格Eラーニング" })).toBeVisible();

    await Promise.all([
      page.waitForURL(`**${COURSE_PATH}`),
      page.getByRole("link", { name: "第一種衛生管理者の問題演習を始める" }).click(),
    ]);
    await expect(page.getByRole("heading", { level: 2, name: /常時73人/ })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
  expect(runtimeFailures).toEqual([]);
});
