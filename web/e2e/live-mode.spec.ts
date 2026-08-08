import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function openFirstRevisionActions(page: Page) {
  const details = page
    .getByRole("region", { name: "法改正一覧" })
    .locator("li")
    .first()
    .locator("[data-law-revision-actions]");
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator("summary").click();
  }
}

async function mockApiFailure(
  page: Page,
  path: "/api/revisions" | "/api/summaries" | "/api/chat",
  status: number,
  message: string,
  retryable: boolean,
) {
  await page.route(`**${path}**`, (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: status >= 500 ? "UNAVAILABLE" : "VALIDATION",
          message,
          retryable,
        },
      }),
    }),
  );
}

test.describe("live mode", () => {
  test.beforeEach(async ({ page }) => {
    // オンボーディングモーダルが UI をブロックしないよう、初回訪問済みとしてマーク
    await page.addInitScript(() => {
      localStorage.setItem("anzen-onboarding-v1-seen", "1");
    });
  });

  test("正常系: 一覧表示→要約表示→チャット送信 @smoke", async ({ page }) => {
    await page.goto("/laws");

    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByRole("heading", { name: "法改正一覧" }).first()).toBeVisible();
    // 法改正カードリストに1件以上表示されること（tab navのulと区別するためregionでスコープ）
    const revisionList = page.getByRole("region", { name: "法改正一覧" });
    await expect(revisionList.locator("li").first()).toBeVisible();

    // 先頭カードの収録要点を開く（生成AIの出力とは表示しない）
    await openFirstRevisionActions(page);
    await revisionList.locator("li").first().getByRole("button", { name: "収録要点を見る" }).click();
    await expect(page.getByRole("heading", { name: "3行要約" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "現場でやること" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "対象業種", exact: true })).toBeVisible();
    await page.waitForTimeout(700);

    await page.getByRole("button", { name: "質問チャット" }).click();
    await expect(page.getByText("個人情報は入力しない", { exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "質問入力", exact: true }).fill("施行日はいつですか");
    const chatbotResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/chat" &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "送信" }).click();
    const chatbotResponse = await chatbotResponsePromise;
    expect(chatbotResponse.status()).toBe(200);
    expect(chatbotResponse.headers()["content-type"]).toContain("application/json");
    expect(chatbotResponse.headers()["x-ai-used"]).toBe("false");
    const chatbotPayload = (await chatbotResponse.json()) as { reply?: unknown };
    expect(typeof chatbotPayload.reply).toBe("string");
    expect((chatbotPayload.reply as string).trim().length).toBeGreaterThan(0);

    // 質問文がチャット履歴に表示されること
    await expect(page.getByText("施行日はいつですか")).toBeVisible();
  });

  test("正常系: 今日の安全で公式警報・予報・KY導線を確認できる @smoke", async ({ page }) => {
    const now = new Date().toISOString();
    const todayJst = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    await page.route("**/api/weather-risk?area=tokyo-shinjuku", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          snapshot: {
            regionName: "東京都 新宿区",
            date: todayJst,
            overview: "晴れ",
            temperatureCelsius: 30,
            windSpeedMs: 4,
            precipitationMm: 0,
            alerts: [],
          },
          provider: "open-meteo",
          fetchedAt: now,
          officialWarning: {
            status: "live",
            warnings: [],
            headline: null,
            fetchedAt: now,
            reportAt: now,
            sourceUrl: "https://www.jma.go.jp/bosai/warning/",
          },
          current: {
            temperatureCelsius: 30,
            relativeHumidityPercent: 60,
            targetAt: now,
          },
        }),
      }),
    );
    await page.route("**/api/wbgt?area=tokyo-shinjuku", (route) =>
      route.fulfill({
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
            valueCelsius: 28.5,
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
            targetDate: todayJst,
            reportAt: now,
          },
          retrievedAt: now,
          degraded: false,
          provider: "環境省 熱中症予防情報サイト",
          sourceUrl: "https://www.wbgt.env.go.jp/",
          dataServiceUrl: "https://www.wbgt.env.go.jp/data_service.php",
        }),
      }),
    );
    await page.goto("/risk?area=tokyo-shinjuku");
    await expect(page.getByRole("heading", { name: "今日の安全を確認" })).toBeVisible();
    await expect(page.getByLabel("現場の地域")).toBeVisible();
    await expect(page.getByText(/予報提供元: Open-Meteo/)).toBeVisible();
    await expect(
      page.getByText(/取得成功・選択地域に発表中の警報等なし/),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "この条件でKYを作る" })).toBeVisible();
  });

  test("安全系: URL の任意 ingest payload を無視し、検証済み収録データだけを返す @smoke", async ({ page }) => {
    const payload = encodeURIComponent(
      JSON.stringify([
        {
          id: "real-mixed-001",
          title: "sourceなしレコード",
          published_at: "2026-02-01",
          summary: "source未設定でも一覧表示できることを確認する。",
          kind: "notice",
          category: "通達",
          issuer: "検証用発出元",
        },
        {
          id: "real-mixed-002",
          title: "sourceありレコード",
          published_at: "2026-02-02",
          summary: "sourceありの通常表示も維持する。",
          kind: "ordinance",
          category: "省令",
          issuer: "検証用発出元",
          source: {
            url: "https://www.mhlw.go.jp/",
            label: "厚生労働省",
          },
        },
      ])
    );

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/revisions"),
    );
    await page.goto(`/laws?ingestSource=real&realSourcePayload=${payload}`);
    const response = await responsePromise;

    expect(response.headers()["x-revisions-ingest-source"]).toBe("egov-structured");
    expect(response.headers()["x-revisions-verification-state"]).toBe(
      "machine-validated-human-review-pending",
    );
    await page.getByRole("button", { name: "法改正一覧" }).click();

    await expect(page.getByText("sourceなしレコード")).toHaveCount(0);
    await expect(page.getByText("sourceありレコード")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "法改正一覧" }).first()).toBeVisible();
  });

  test("安全系: URL の official-db payload を収録データへ混入させない @smoke", async ({ page }) => {
    const officialPayload = encodeURIComponent(
      JSON.stringify([
        {
          lawId: "official-001",
          lawTitle: "公式DB形式の法改正",
          promulgatedAt: "2026-06-01",
          summary: "公式DB形式を ingest mapper で吸収して表示する。",
          sourceUrl: "https://elaws.e-gov.go.jp/",
          sourceLabel: "e-Gov法令検索",
          sourceIssuer: "デジタル庁",
        },
      ])
    );

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/revisions"),
    );
    await page.goto(
      `/laws?ingestSource=real&realSourceFormat=official-db&realSourcePayload=${officialPayload}`
    );
    const response = await responsePromise;

    expect(response.headers()["x-revisions-ingest-source"]).toBe("egov-structured");
    expect(response.headers()["x-revisions-verification-state"]).toBe(
      "machine-validated-human-review-pending",
    );
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("公式DB形式の法改正")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "法改正一覧" }).first()).toBeVisible();
  });

  test("失敗系: 一覧API 5xx でエラー通知表示 @failure", async ({ page }) => {
    await mockApiFailure(page, "/api/revisions", 503, "法改正一覧APIが一時的に利用できません。", true);
    await page.goto("/laws");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("一覧の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("法改正一覧APIが一時的に利用できません。")).toBeVisible();
    await page.waitForTimeout(500);
    const retryButtonCount = await page.getByRole("button", { name: "一覧を再取得" }).count();
    expect(retryButtonCount).toBeGreaterThan(0);
  });

  test("失敗系: 一覧API timeout でエラー通知表示 @failure", async ({ page }) => {
    await mockApiFailure(page, "/api/revisions", 504, "法改正一覧の取得がタイムアウトしました。再試行してください。", true);
    await page.goto("/laws");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("一覧の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("法改正一覧の取得がタイムアウトしました。再試行してください。")).toBeVisible();
    await expect(page.getByRole("button", { name: "一覧を再取得" })).toBeVisible();
  });

  test("失敗系: 一覧API validation で再試行なし表示 @failure", async ({ page }) => {
    await mockApiFailure(page, "/api/revisions", 400, "法改正一覧APIの入力検証エラーです。", false);
    await page.goto("/laws");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("一覧の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("法改正一覧APIの入力検証エラーです。")).toBeVisible();
    await expect(page.getByText("このエラーは再試行対象外です。")).toBeVisible();
    await expect(page.getByRole("button", { name: "一覧を再取得" })).toHaveCount(0);
  });

  test("安全系: URL 指定の外部 ingest endpoint を参照しない @failure", async ({ page }) => {
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/revisions"));
    await page.goto("/laws?ingestSource=real&realSourceUrl=https%3A%2F%2Fevil.com%2Frevisions.json");
    const response = await responsePromise;
    expect(response.headers()["x-revisions-ingest-source"]).toBe("egov-structured");
    expect(response.headers()["x-revisions-verification-state"]).toBe(
      "machine-validated-human-review-pending",
    );
    expect(response.headers()["x-revisions-ingest-fallback-reason"]).toBeUndefined();
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByRole("heading", { name: "法改正一覧" }).first()).toBeVisible();
  });

  test("失敗系: 要約API 5xx で ErrorNotice と再試行表示 @failure", async ({ page }) => {
    await mockApiFailure(page, "/api/summaries", 503, "要約APIが一時的に利用できません。", true);
    await page.goto("/laws");
    await page.getByRole("button", { name: "収録要点", exact: true }).click();
    await openFirstRevisionActions(page);
    await page.getByRole("button", { name: "収録要点を見る" }).first().click();
    await expect(page.getByText("要約の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("要約APIが一時的に利用できません。")).toBeVisible();
    await expect(page.getByRole("button", { name: "要約を再取得" })).toBeVisible();
  });

  test("失敗系: 要約API timeout で ErrorNotice 表示 @failure", async ({ page }) => {
    await mockApiFailure(page, "/api/summaries", 504, "要約API応答がタイムアウトしました。", true);
    await page.goto("/laws");
    await page.getByRole("button", { name: "収録要点", exact: true }).click();
    await openFirstRevisionActions(page);
    await page.getByRole("button", { name: "収録要点を見る" }).first().click();
    await expect(page.getByText("要約API応答がタイムアウトしました。")).toBeVisible({ timeout: 12000 });
    await expect(page.getByRole("button", { name: "要約を再取得" })).toBeVisible();
  });

  test("失敗系: 要約API validation で再試行なし表示 @failure", async ({ page }) => {
    await mockApiFailure(page, "/api/summaries", 400, "要約APIの入力検証エラーです。", false);
    await page.goto("/laws");
    await page.getByRole("button", { name: "収録要点", exact: true }).click();
    await openFirstRevisionActions(page);
    await page.getByRole("button", { name: "収録要点を見る" }).first().click();
    await expect(page.getByText("要約APIの入力検証エラーです。")).toBeVisible();
    await expect(page.getByText("このエラーは再試行対象外です。")).toBeVisible();
    await expect(page.getByRole("button", { name: "要約を再取得" })).toHaveCount(0);
  });

  test("失敗系: チャットAPI validation で再試行なし表示 @failure", async ({ page }) => {
    await mockApiFailure(page, "/api/chat", 400, "チャットの入力形式が不正です。", false);
    await page.goto("/laws");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await openFirstRevisionActions(page);
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByRole("textbox", { name: "質問入力", exact: true }).fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャットの入力形式が不正です。")).toBeVisible();
    await expect(page.getByText("このエラーは再試行対象外です。")).toBeVisible();
  });

  test("失敗系: チャットAPI 5xx で再試行表示 @failure", async ({ page }) => {
    await mockApiFailure(page, "/api/chat", 503, "チャットAPIが一時的に利用できません。", true);
    await page.goto("/laws");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await openFirstRevisionActions(page);
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByRole("textbox", { name: "質問入力", exact: true }).fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャットAPIが一時的に利用できません。")).toBeVisible();
    await expect(page.getByRole("button", { name: "同じ質問を再送" })).toBeVisible();
  });

  test("失敗系: チャットAPI timeout で再試行表示 @failure", async ({ page }) => {
    await mockApiFailure(page, "/api/chat", 504, "チャット応答がタイムアウトしました。再試行してください。", true);
    await page.goto("/laws");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await openFirstRevisionActions(page);
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByRole("textbox", { name: "質問入力", exact: true }).fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャット応答がタイムアウトしました。再試行してください。")).toBeVisible({
      timeout: 12000,
    });
    await expect(page.getByRole("button", { name: "同じ質問を再送" })).toBeVisible();
  });

  test("回復系: 要約API 5xx から再試行で回復 @recovery", async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/summaries**", (route) => {
      attempts += 1;
      if (attempts === 1) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "UNAVAILABLE",
              message: "要約APIが一時的に利用できません。",
              retryable: true,
            },
          }),
        });
      }
      return route.continue();
    });
    await page.goto("/laws");
    await page.getByRole("button", { name: "収録要点", exact: true }).click();
    await expect(page.getByText("要約の取得に失敗しました")).toBeVisible();

    await page.getByRole("button", { name: "要約を再取得" }).click();
    await expect(page.getByText("3行要約")).toBeVisible();
    expect(attempts).toBe(2);
  });

  test("回復系: チャットAPI 5xx から再送で回復 @recovery", async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/chat**", (route) => {
      attempts += 1;
      if (attempts === 1) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "UNAVAILABLE",
              message: "チャットAPIが一時的に利用できません。",
              retryable: true,
            },
          }),
        });
      }
      return route.continue();
    });
    await page.goto("/laws");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await openFirstRevisionActions(page);
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByRole("textbox", { name: "質問入力", exact: true }).fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャットAPIが一時的に利用できません。")).toBeVisible();

    await page.getByRole("button", { name: "同じ質問を再送" }).click();
    // 施行日はいつですかという質問文がチャット履歴に表示されること（送信成功確認）
    await expect(page.getByText("施行日はいつですか").last()).toBeVisible();
    expect(attempts).toBe(2);
  });
});
