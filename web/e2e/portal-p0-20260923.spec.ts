import { expect, test, type Locator, type Page } from "@playwright/test";

const toolPaths = ["/ky/paper", "/chatbot", "/chemical-ra", "/training/safety-seminars", "/materials/safety-images", "/construction-calc"];
const tools = (page: Page) => page.locator('#tools a[data-lp-tool]');
const toolLink = (page: Page, href: string) => page.locator(`#tools a[data-lp-tool][href="${href}"]`);
const overflowX = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function minimumTarget(control: Locator) {
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function keyboardReach(page: Page, target: Locator) {
  for (let step = 0; step < 12; step += 1) {
    if (await target.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

async function restoreToolPosition(page: Page, href: string, beforeY: number) {
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - beforeY), { timeout: 10_000 }).toBeLessThanOrEqual(200);
  await expect(toolLink(page, href)).toBeInViewport();
}

async function assertPrivateInput(page: Page, input: string, requestedUrls: string[]) {
  expect(decodeURIComponent(page.url())).not.toContain(input);
  expect(requestedUrls.every((url) => !decodeURIComponent(url).includes(input))).toBe(true);
  // Synthetic test text only: inspect storage for leakage, without retaining its contents.
  const leaked = await page.evaluate((needle) => [localStorage, sessionStorage].some((storage) =>
    Array.from({ length: storage.length }, (_, index) => storage.getItem(storage.key(index)!)).some((value) => value?.includes(needle))), input);
  expect(leaked).toBe(false);
}

test.beforeEach(async ({ page, baseURL }) => {
  // All functional requests in this fixture use local mock responses; no paid AI, telemetry or external service calls.
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (request.method() !== "GET" && request.method() !== "HEAD") return route.abort();
    return route.continue();
  });
});

test("LPの6機能から専用入力画面と全機能を利用でき、JavaScriptなしでも入口とdetailsが使える", async ({ page, browser, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#mascot-tools")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "今日の仕事に、すぐ使える。" })).toBeVisible();
  await expect(tools(page)).toHaveCount(6);
  expect(await tools(page).evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(toolPaths);
  await expect(tools(page).locator("a, button, input, textarea")).toHaveCount(0);
  for (let index = 0; index < 6; index += 1) await minimumTarget(tools(page).nth(index));
  await toolLink(page, "/chatbot").click();
  await expect(page.locator("[data-chatbot-composer] textarea")).toBeVisible();
  await expect(page.locator('[data-chatbot-composer] button[type="submit"]')).toBeVisible();
  await page.goBack();
  await toolLink(page, "/chemical-ra").click();
  await expect(page.getByRole("combobox", { name: "物質名・CAS番号・SDS記載名" })).toBeVisible();
  await page.goBack();
  await page.locator('#tools a[href="/features"]').click();
  await expect(page.getByRole("heading", { name: "目的と運用状態から機能を選ぶ" })).toBeVisible();
  const directory = page.locator('section[aria-labelledby="feature-list-heading"]');
  await expect(directory.locator('a[href="/accident-news"]')).toHaveCount(1);
  await expect(directory.locator('a[href="/laws"]')).toHaveCount(1);
  await expect.poll(() => directory.locator("li").count()).toBeGreaterThanOrEqual(9);
  expect(await overflowX(page)).toBeLessThanOrEqual(1);

  const noScript = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const plain = await noScript.newPage();
    await plain.route("**/*", (route) => new URL(route.request().url()).origin === new URL(baseURL!).origin && route.request().method() === "GET" ? route.continue() : route.abort());
    await plain.goto("/");
    await expect(tools(plain)).toHaveCount(6);
    await toolLink(plain, "/chatbot").click();
    await expect(plain.locator("#chatbot-no-script-message")).toBeVisible();
    await minimumTarget(plain.getByRole("button", { name: "送信", exact: true }));
    await plain.goto("/chemical-ra");
    await expect(plain.getByRole("navigation", { name: "JavaScriptなしの化学物質確認" })).toBeVisible();
    await plain.goto("/training/safety-seminars/safety-management-basics-osh-law");
    const summary = plain.locator("details > summary").filter({ hasText: /^1\. / }).first();
    await expect(summary).toBeVisible();
    await minimumTarget(summary);
    await summary.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(summary).toBeInViewport();
    await summary.click();
    await expect(summary.locator("..")).toHaveAttribute("open", "");
  } finally {
    await noScript.close();
  }
});

for (const width of [320, 360, 390]) {
  test(`${width}px幅で6機能カードと専用入力が横にはみ出さない`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    for (let index = 0; index < 6; index += 1) {
      const card = tools(page).nth(index);
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      await minimumTarget(card);
      expect(await overflowX(page)).toBeLessThanOrEqual(1);
    }
    await toolLink(page, "/chatbot").click();
    await expect(page.locator("[data-chatbot-composer] textarea")).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(1);
    await page.goBack();
    await toolLink(page, "/chemical-ra").click();
    await expect(page.locator("#chemical-onebox-input")).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(1);
  });
}

test("6機能から専用入力とスライドへキーボードだけで到達できる", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await tools(page).first().focus();
  for (let index = 0; index < 6; index += 1) {
    await expect(tools(page).nth(index)).toBeFocused();
    if (index < 5) await page.keyboard.press("Tab");
  }
  await toolLink(page, "/chatbot").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/chatbot$/);
  const question = page.locator("[data-chatbot-composer] textarea");
  await question.focus();
  await page.keyboard.type("フルハーネスの特別教育は必要？");
  await expect(question).toHaveValue("フルハーネスの特別教育は必要？");
  await keyboardReach(page, page.locator('[data-chatbot-composer] button[type="submit"]'));
  await page.goBack();
  await toolLink(page, "/chemical-ra").focus();
  await page.keyboard.press("Enter");
  const query = page.locator("#chemical-onebox-input");
  await query.focus();
  await page.keyboard.type("トルエン");
  await expect(query).toHaveValue("トルエン");
  await page.goBack();
  await toolLink(page, "/training/safety-seminars").focus();
  await page.keyboard.press("Enter");
  const slides = page.locator('a[href="/training/safety-seminars/safety-management-basics-osh-law"]');
  await expect(slides).toBeVisible();
  await slides.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/safety-management-basics-osh-law$/);
  await expect(page.locator("#seminar-player")).toBeVisible();
});

test("主機能カードから戻ると選択位置へ戻る", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const href = "/construction-calc";
  await toolLink(page, href).scrollIntoViewIfNeeded();
  const beforeY = await page.evaluate(() => window.scrollY);
  expect(beforeY).toBeGreaterThan(400);
  await toolLink(page, href).click();
  await expect(page).toHaveURL(/\/construction-calc$/);
  await page.goBack();
  await restoreToolPosition(page, href, beforeY);
});

test("スライドの専用ページから戻っても選択位置へ戻る", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const href = "/training/safety-seminars";
  await toolLink(page, href).scrollIntoViewIfNeeded();
  const beforeY = await page.evaluate(() => window.scrollY);
  await toolLink(page, href).click();
  await page.locator('a[href="/training/safety-seminars/safety-management-basics-osh-law"]').click();
  await expect(page.locator("#seminar-player")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/training\/safety-seminars$/);
  await page.goBack();
  await restoreToolPosition(page, href, beforeY);
});

test("専用画面で質問を保持して送信し、URL・storageへ漏らさず入口位置へ戻る", async ({ page }) => {
  test.setTimeout(60_000);
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  const text = "フルハーネスの特別教育は必要？";
  let sentQuestion: unknown;
  await page.route("**/api/chatbot/stream", async (route) => {
    sentQuestion = route.request().postDataJSON().message;
    const answer = "結論\n作業条件と公式資料を確認してください。";
    await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream; charset=utf-8" }, body: `event: text\ndata: ${JSON.stringify({ chunk: answer })}\n\nevent: meta\ndata: ${JSON.stringify({ answer, sources: [], source_type: "rag", confidence: "low", requiresHumanReview: true })}\n\n` });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await toolLink(page, "/chatbot").scrollIntoViewIfNeeded();
  const beforeY = await page.evaluate(() => window.scrollY);
  await toolLink(page, "/chatbot").click();
  const question = page.locator("[data-chatbot-composer] textarea");
  await question.fill(text);
  await expect(question).toHaveValue(text);
  await assertPrivateInput(page, text, requestedUrls);
  const submit = page.locator('[data-chatbot-composer] button[type="submit"]');
  await minimumTarget(submit);
  await submit.click();
  await expect(page.getByRole("article", { name: "あなたの質問" })).toContainText(text);
  await expect(page.locator("[data-chatbot-answer]")).toContainText("作業条件と公式資料");
  expect(sentQuestion).toBe(text);
  await assertPrivateInput(page, text, requestedUrls);
  await page.goBack();
  await restoreToolPosition(page, "/chatbot", beforeY);
  await assertPrivateInput(page, text, requestedUrls);
});

test("専用画面で化学物質の入力を検索後も保持し、URL・storageへ漏らさず入口位置へ戻る", async ({ page }) => {
  test.setTimeout(60_000);
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  let requestedName: unknown;
  await page.route("**/api/chemical/search", (route) => route.fulfill({ json: { ok: true, items: [] } }));
  await page.route("**/api/chemical/legal-profile", (route) => route.fulfill({ json: { resolved: false } }));
  await page.route("**/api/chemical-ra", async (route) => {
    requestedName = route.request().postDataJSON().chemicalName;
    await route.fulfill({ json: { chemicalName: "トルエン", casNumber: "108-88-3", flashPoint: "4℃", exposureLimit: "50ppm", ghsHazards: [], ppeRecommendations: [], safetyMeasures: [], emergencyMeasures: [], regulatoryNotes: [], relatedHazards: [], assessmentStatus: "unavailable", assessmentNotice: "公式SDSと専門家による最終確認が必要です。", aiStatus: "disabled_for_safety" } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await toolLink(page, "/chemical-ra").scrollIntoViewIfNeeded();
  const beforeY = await page.evaluate(() => window.scrollY);
  await toolLink(page, "/chemical-ra").click();
  const query = page.locator("#chemical-onebox-input");
  await query.fill("トルエン");
  await expect(query).toHaveValue("トルエン");
  await expect(page.getByText(/いずれにも見つかりません/)).toBeVisible();
  await query.press("Enter");
  await expect.poll(() => requestedName).toBe("トルエン");
  await expect(query).toHaveValue("トルエン");
  await expect(page.getByRole("heading", { name: "トルエン CAS: 108-88-3" })).toBeVisible();
  await expect(page.getByText("判定値未算出", { exact: true })).toBeVisible();
  await assertPrivateInput(page, "トルエン", requestedUrls);
  await page.goBack();
  await restoreToolPosition(page, "/chemical-ra", beforeY);
  await assertPrivateInput(page, "トルエン", requestedUrls);
});
