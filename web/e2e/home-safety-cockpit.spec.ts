import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

function findProductionHomePickerChunk(): string | null {
  if (process.env.PLAYWRIGHT_SERVER_MODE !== "production") return null;
  const chunksRoot = join(process.cwd(), ".next", "static", "chunks");
  const pending = [chunksRoot];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
        continue;
      }
      if (
        entry.name.endsWith(".js") &&
        readFileSync(entryPath, "utf8").includes('"data-home-area-picker"')
      ) {
        return `/_next/static/chunks/${relative(chunksRoot, entryPath).replaceAll("\\", "/")}`;
      }
    }
  }
  throw new Error("production home-area-picker chunk was not found");
}

const productionHomePickerChunk = findProductionHomePickerChunk();

async function revealAreaSource(page: Page) {
  const picker = page.locator("details[data-home-area-picker]");
  await expect(picker).toBeVisible();
  if (!(await picker.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await picker.locator(":scope > summary").click();
  }
  await expect(picker).toHaveAttribute("open", "");
  return picker;
}

test.describe("効果先行ホーム", () => {
  test("hydration前の地域入力を回収し、入力済みの候補を表示する", async ({
    page,
  }) => {
    let releaseScripts: () => void = () => {};
    const scriptGate = new Promise<void>((resolve) => {
      releaseScripts = resolve;
    });
    await page.route("**/*", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const shouldHold = productionHomePickerChunk
        ? pathname === productionHomePickerChunk
        : pathname.startsWith("/_next/static/chunks/");
      if (shouldHold) await scriptGate;
      await route.continue();
    });

    try {
      await page.goto("/", { waitUntil: "commit" });
      const picker = page.locator("details[data-home-area-picker]");
      await expect(picker).toBeAttached({ timeout: 30_000 });
      await picker.locator(":scope > summary").click();
      const input = picker.getByLabel("都道府県・市区町村・主要都市");
      await input.fill("横浜 港北");
      await expect(picker).toHaveAttribute(
        "data-home-area-picker-hydrated",
        "false",
      );

      releaseScripts();
      await expect(picker).toHaveAttribute(
        "data-home-area-picker-hydrated",
        "true",
        { timeout: 30_000 },
      );
      await expect(input).toHaveValue("横浜 港北");
      await expect(picker.getByRole("option")).toHaveCount(1, {
        timeout: 15_000,
      });
    } finally {
      releaseScripts();
    }
  });

  test("desktop first view shows the current heat value first and keeps every task in its own section", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setExtraHTTPHeaders({
      "x-vercel-ip-country": "JP",
      "x-vercel-ip-country-region": "13",
    });
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "今日の熱中症リスク",
      }),
    ).toBeVisible();
    await expect(page.locator("[data-wbgt-kind]")).toBeVisible();
    await expect(page.locator("[data-home-heat-slide-deck]")).toBeVisible();
    await expect(
      page.locator("[data-home-chemical-quick-search]"),
    ).toHaveCount(1);
    await expect(page.locator("[data-home-chat-quick-ask]")).toHaveCount(1);
    await expect(
      page
        .locator('[data-home-section="heat"]')
        .getByAltText("麦わら帽子をかぶった安全AIポータルのチワワ"),
    ).toHaveCount(0);

    const order = await page
      .locator("[data-home-section]")
      .evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("data-home-section")),
      );
    expect(order).toEqual([
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
    await expect(
      page.locator('[data-home-section="heat"] [data-warning-card]'),
    ).toHaveCount(
      heatState === "degraded" || heatState === "unavailable" ? 1 : 0,
    );
    await expect(page.locator('[data-home-section="heat"] [data-primary-action]')).toHaveCount(1);
    const heatText = await page.locator('[data-home-section="heat"]').innerText();
    expect(heatText).not.toContain("化学物質を検索");
    expect(heatText).not.toContain("安衛法AIへの質問");
    expect(heatText).not.toContain("自動化相談");
  });

  test("320px keeps WBGT before the operable slide deck without overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.setExtraHTTPHeaders({
      "x-vercel-ip-country": "JP",
      "x-vercel-ip-country-region": "13",
    });
    await page.goto("/");

    await expect(page.locator("[data-wbgt-kind]")).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);

    const deck = page.getByRole("region", {
      name: "熱中症を防ぐ現場ブリーフィング",
    });
    const order = await page.evaluate(() => {
      const status = document.querySelector("[data-heat-status]");
      const slides = document.querySelector("[data-home-heat-slide-deck]");
      if (!status || !slides) return null;
      return (
        status.getBoundingClientRect().top <
        slides.getBoundingClientRect().top
      );
    });
    expect(order).toBe(true);
    await deck.scrollIntoViewIfNeeded();
    await expect(page.locator("[data-home-heat-slide]")).toHaveCount(3);
    await expect(page.locator("[data-home-heat-slide]:not([hidden])")).toHaveCount(1);
    const next = page.getByRole("button", { name: "次のスライド" });
    await next.click();
    await expect(page.getByText("2 / 3", { exact: true })).toBeVisible();
    await next.click();
    await expect(page.getByText("3 / 3", { exact: true })).toBeVisible();
    await expect(next).toBeDisabled();
    await deck.press("Home");
    await expect(page.getByText("1 / 3", { exact: true })).toBeVisible();
    await deck.press("End");
    await expect(page.getByText("3 / 3", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "熱中症スライドの進捗" }),
    ).toHaveAttribute("aria-valuenow", "3");
  });

  test("unique and ambiguous areas follow the canonical allowlist boundary", async ({
    page,
  }) => {
    await page.goto("/");
    const picker = await revealAreaSource(page);
    const input = picker.getByLabel("都道府県・市区町村・主要都市");

    await input.fill("中央区");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/$/);
    expect(await page.getByRole("option").count()).toBeGreaterThan(1);
    expect(
      await page.evaluate(() =>
        localStorage.getItem("safe-ai:coarse-area-id:v1"),
      ),
    ).toBeNull();

    await input.fill("とうきょう");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-area-id="tokyo-shinjuku"]')).toBeVisible();
    expect(
      await page.evaluate(() =>
        localStorage.getItem("safe-ai:coarse-area-id:v1"),
      ),
    ).toBe("tokyo-shinjuku");
    await expect(input).toHaveValue("東京都 新宿区");

    await picker.getByRole("link", { name: "詳しい観測情報" }).click();
    await expect(page).toHaveURL(/\/risk\?area=tokyo-shinjuku$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.anzen-ai-portal.jp/risk",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex.*follow.*noarchive/,
    );
    await page.goBack();
    const restoredPicker = await revealAreaSource(page);
    await expect(restoredPicker).toHaveAttribute(
      "data-selected-area-id",
      "tokyo-shinjuku",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    const reloadedPicker = await revealAreaSource(page);
    await expect(
      reloadedPicker.getByText("前回選択した地域（粗い区域）"),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("risk remains unselected and a prompt-state location is requested only after the explicit button", async ({
    page,
  }) => {
    let weatherRequests = 0;
    await page.route("**/api/weather-risk*", async (route) => {
      weatherRequests += 1;
      await route.continue();
    });
    await page.goto("/risk");
    const riskInput = page.getByLabel("現場の地域を検索");
    await expect(riskInput).toBeVisible();
    await expect(riskInput).toHaveValue("");
    await expect(page.locator("main [role=alert]")).toHaveCount(0);
    expect(weatherRequests).toBe(0);

    await page.addInitScript(() => {
      (window as Window & { __geoCalls?: number }).__geoCalls = 0;
      Object.defineProperty(navigator, "permissions", {
        configurable: true,
        value: {
          query: async () => ({ state: "prompt" }),
        },
      });
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (
            _success: PositionCallback,
            error: PositionErrorCallback,
          ) => {
            const target = window as Window & { __geoCalls?: number };
            target.__geoCalls = (target.__geoCalls ?? 0) + 1;
            error({
              code: 1,
              message: "denied",
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            });
          },
        },
      });
    });
    await page.goto("/");
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(
        () => (window as Window & { __geoCalls?: number }).__geoCalls,
      ),
    ).toBe(0);
    await revealAreaSource(page);
    await page.getByRole("button", { name: "現在地を更新" }).click();
    await expect(
      page.getByText(/位置情報は許可されていません/),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as Window & { __geoCalls?: number }).__geoCalls,
      ),
    ).toBe(1);
  });

  test("a previously granted location resolves in-browser and stores only a coarse area ID", async ({
    page,
  }) => {
    const outboundPayloads: string[] = [];
    page.on("request", (request) => {
      outboundPayloads.push(`${request.url()}\n${request.postData() ?? ""}`);
    });
    await page.addInitScript(() => {
      (window as Window & { __geoCalls?: number }).__geoCalls = 0;
      Object.defineProperty(navigator, "permissions", {
        configurable: true,
        value: { query: async () => ({ state: "granted" }) },
      });
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (success: PositionCallback) => {
            const target = window as Window & { __geoCalls?: number };
            target.__geoCalls = (target.__geoCalls ?? 0) + 1;
            success({
              coords: {
                latitude: 35.68,
                longitude: 139.76,
                accuracy: 10_000,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON: () => ({}),
              },
              timestamp: Date.now(),
              toJSON: () => ({}),
            });
          },
        },
      });
    });
    await page.goto("/");
    const picker = await revealAreaSource(page);
    await expect(
      picker.getByRole("status"),
    ).toHaveText("東京都 新宿区へ変更しました。");
    await expect(
      page.locator('[data-area-id="tokyo-shinjuku"]'),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as Window & { __geoCalls?: number }).__geoCalls,
      ),
    ).toBe(1);
    expect(
      await page.evaluate(() =>
        localStorage.getItem("safe-ai:coarse-area-id:v1"),
      ),
    ).toBe("tokyo-shinjuku");
    expect(
      await page.evaluate(() => JSON.stringify(localStorage)),
    ).not.toContain("35.68");
    expect(outboundPayloads.join("\n")).not.toContain("35.68");
    expect(outboundPayloads.join("\n")).not.toContain("139.76");
  });

  test("previous, IP-coarse, and national fallbacks remain explicitly labelled", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("safe-ai:coarse-area-id:v1", "osaka-osaka");
    });
    await page.reload();
    let picker = await revealAreaSource(page);
    await expect(
      picker.getByText("前回選択した地域（粗い区域）"),
    ).toBeVisible();
    await expect(page.locator('[data-area-id="osaka-osaka"]')).toBeVisible();

    await page.setExtraHTTPHeaders({
      "x-vercel-ip-country": "JP",
      "x-vercel-ip-country-region": "13",
    });
    await page.reload();
    await expect(page.locator('[data-area-id="osaka-osaka"]')).toBeVisible();
    picker = await revealAreaSource(page);
    await expect(
      picker.getByText("前回選択した地域（粗い区域）"),
    ).toBeVisible();

    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
    await page.setExtraHTTPHeaders({
      "x-vercel-ip-country": "JP",
      "x-vercel-ip-country-region": "27",
    });
    await page.reload();
    picker = await revealAreaSource(page);
    await expect(
      picker.getByText("粗い地域（接続情報・ずれあり）"),
    ).toBeVisible();

    await page.setExtraHTTPHeaders({
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
    });
    await page.reload();
    await expect(page.getByText("全国の状況", { exact: true })).toBeVisible();
    picker = await revealAreaSource(page);
    await expect(
      picker.getByText("全国の状況（地域は未特定）"),
    ).toBeVisible();
    await expect(page.locator('[data-home-section="heat"] [data-area-id]')).toHaveCount(0);
    await expect(page.locator('[data-home-section="heat"]')).not.toContainText("警報なし");
  });

  test("completed chemical suggestions are reused and exact identity is server-confirmed once", async ({
    page,
  }) => {
    let queryRequests = 0;
    await page.on("request", (request) => {
      if (
        request.url().includes("/api/chemical/search") &&
        request.method() === "POST"
      ) {
        const body = request.postDataJSON() as {
          query?: string;
          selection?: unknown;
        };
        if (body.query) queryRequests += 1;
      }
    });
    await page.goto("/");
    const input = page.getByRole("combobox", {
      name: "化学物質を検索",
    });
    await input.fill("108-88-3");
    await expect(page.getByText(/1件/).last()).toBeVisible();
    await input.press("Enter");
    await expect(page).toHaveURL(/\/chemical-ra#chemical-ra-start$/);
    await expect(page.locator("#chemical-onebox-input")).toHaveValue("108-88-3");
    await page.waitForTimeout(400);
    expect(queryRequests).toBe(1);
  });

  test("chemical ambiguity gets no CAS and chat handoff leaves no raw URL or storage", async ({
    page,
  }) => {
    let queryRequests = 0;
    const requestUrls: string[] = [];
    page.on("request", (request) => {
      requestUrls.push(request.url());
      if (
        request.url().includes("/api/chemical/search") &&
        request.method() === "POST"
      ) {
        const body = request.postDataJSON() as { query?: string };
        if (body.query) queryRequests += 1;
      }
    });
    await page.goto("/");
    const chemical = page.getByRole("combobox", {
      name: "化学物質を検索",
    });
    await chemical.fill("キシレン");
    await chemical.press("Enter");
    await expect(page).toHaveURL(/\/chemical-ra#chemical-ra-start$/);
    const chemicalUrl = new URL(page.url());
    expect(chemicalUrl.searchParams.has("cas")).toBe(false);
    expect(chemicalUrl.searchParams.has("name")).toBe(false);
    await expect(page.locator("#chemical-onebox-input")).toHaveValue(
      "キシレン",
    );
    const destinationSearch = page
      .locator("#chemical-onebox-input")
      .locator("xpath=../..");
    await expect(destinationSearch.getByRole("option").nth(1)).toBeVisible();
    await expect(
      destinationSearch.getByText(/複数候補があります/),
    ).toBeVisible();
    await page.locator("#chemical-onebox-input").press("Enter");
    await expect(
      destinationSearch.getByText("この物質候補を確認してください"),
    ).toHaveCount(0);
    expect(queryRequests).toBe(1);

    await page.goto("/");
    await page.setViewportSize({ width: 390, height: 844 });
    const chat = page.getByLabel("安衛法AIへの質問");

    await chat.fill("作業員が倒れて呼吸がありません");
    await chat.press("Enter");
    await expect(page.locator("[data-home-chat-emergency]")).toContainText(
      "119",
    );
    await expect(page).toHaveURL(/\/$/);

    await chat.fill("連絡先はtest@example.comです");
    await chat.press("Enter");
    await expect(page.locator("[data-home-chat-privacy]")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    const safeQuestion = "足場の手すり高さは？";
    const displayedQuestion = safeQuestion.normalize("NFKC");
    const chatbotResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/chatbot/stream") &&
        response.request().method() === "POST",
    );
    await chat.fill(safeQuestion);
    await chat.press("Enter");
    await expect(page).toHaveURL(/\/chatbot$/);
    expect((await chatbotResponse).status()).toBe(200);
    for (const privateValue of [safeQuestion, displayedQuestion]) {
      expect(page.url()).not.toContain(privateValue);
      expect(page.url()).not.toContain(encodeURIComponent(privateValue));
    }
    expect(
      await page.evaluate((questions) => {
        const values = [];
        for (const storage of [localStorage, sessionStorage]) {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            values.push(`${key}:${key ? storage.getItem(key) : ""}`);
          }
        }
        return values.some((value) =>
          questions.some((question) => value.includes(question)),
        );
      }, [safeQuestion, displayedQuestion]),
    ).toBe(false);
    await expect(
      page.locator('article[aria-label="あなたの質問"]', {
        hasText: displayedQuestion,
      }),
    ).toBeVisible({ timeout: 20_000 });
    const answer = page.locator('article[aria-label="安衛法AIの回答"]').last();
    await expect(answer).toContainText(/\S/u, { timeout: 20_000 });
    const visibleAnswer = (await answer.locator("p").first().innerText()).trim();
    expect(visibleAnswer.length).toBeGreaterThan(0);
    expect(visibleAnswer.length).toBeLessThanOrEqual(601);
    await expect(answer.locator("details[open]")).toHaveCount(0);
    expect(
      await answer.locator("[data-chatbot-answer-actions] button").count(),
    ).toBeLessThanOrEqual(3);
    expect(
      requestUrls.some(
        (url) =>
          [safeQuestion, displayedQuestion].some(
            (question) =>
              url.includes(question) ||
              url.includes(encodeURIComponent(question)),
          ),
      ),
    ).toBe(false);
    await expect(page.getByText("確認が必要な事項", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/応答を完了できません/)).toHaveCount(0);
  });

  test("featured reform and learning previews land on the concrete verified content", async ({
    page,
  }) => {
    await page.goto("/");
    const reform = page.locator('[data-home-update="law-reform"]');
    await expect(
      reform.getByRole("link", { name: "改正内容を確認" }),
    ).toHaveAttribute("href", "/laws#mhlw-ordinance-86-2026");
    await reform.getByRole("link", { name: "改正内容を確認" }).click();
    await expect(page).toHaveURL(/\/laws#mhlw-ordinance-86-2026$/);
    await expect(
      page
        .locator("#mhlw-ordinance-86-2026")
        .getByText("2026-08-01", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("#mhlw-ordinance-86-2026").getByText("今やること"),
    ).toBeVisible();

    await page.goto("/");
    const learning = page.locator('[data-home-section="learning"]');
    await expect(
      learning.getByRole("link", { name: "5分学習を始める" }),
    ).toHaveAttribute("href", "/heat-illness-prevention/elearning");
    await expect(learning.locator("article")).toHaveCount(3);
    await expect(
      learning.getByRole("link", { name: "問題に挑戦" }),
    ).toHaveAttribute("href", /\/training\/visual-ky\//);
  });

  test("chemical PII is blocked before API, URL and browser storage", async ({
    page,
  }) => {
    let queryRequests = 0;
    const requestUrls: string[] = [];
    page.on("request", (request) => {
      requestUrls.push(request.url());
      if (
        request.url().includes("/api/chemical/search") &&
        request.method() === "POST" &&
        request.postDataJSON()?.query
      ) {
        queryRequests += 1;
      }
    });
    await page.goto("/");
    const input = page.getByRole("combobox", {
      name: "化学物質を検索",
    });
    await input.fill("audit.person@example.invalid");
    await input.press("Enter");
    await expect(
      page.locator('[data-home-chemical-quick-search] [role="alert"]'),
    ).toContainText("個人情報・健康情報");
    await expect(page).toHaveURL(/\/$/);
    expect(queryRequests).toBe(0);

    expect(page.url()).not.toContain("audit.person@example.invalid");
    expect(
      requestUrls.some((url) => url.includes("audit.person@example.invalid")),
    ).toBe(false);
    expect(
      await page.evaluate((marker) => {
        for (const storage of [localStorage, sessionStorage]) {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            if (`${key}:${key ? storage.getItem(key) : ""}`.includes(marker)) {
              return true;
            }
          }
        }
        return false;
      }, "audit.person@example.invalid"),
    ).toBe(false);
  });
});
