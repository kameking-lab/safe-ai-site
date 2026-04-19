import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

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

    // 先頭カードの「AIで要約」をクリック（クリックで自動的にAI要約タブへ切り替わる）
    await revisionList.locator("li").first().getByRole("button", { name: "AIで要約" }).click();
    await expect(page.getByText("3行要約")).toBeVisible();
    await expect(page.getByText("現場でやること")).toBeVisible();
    await expect(page.getByText("対象業種")).toBeVisible();
    await page.waitForTimeout(700);

    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();

    // 質問文がチャット履歴に表示されること
    await expect(page.getByText("施行日はいつですか")).toBeVisible();
  });

  test("正常系: 今日の現場リスクカードが表示される @smoke", async ({ page }) => {
    await page.goto("/risk");
    await expect(page.getByRole("heading", { name: "今日の現場リスク" }).first()).toBeVisible();
    await expect(page.getByText("地域:")).toBeVisible();
    await expect(page.getByText("主な注意点")).toBeVisible();
    await expect(page.getByText("推奨アクション")).toBeVisible();
  });

  test("正常系: source 未設定レコード混在でも一覧表示が壊れない @smoke", async ({ page }) => {
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

    await page.goto(`/laws?ingestSource=real&realSourcePayload=${payload}`);
    await page.getByRole("button", { name: "法改正一覧" }).click();

    await expect(page.getByText("sourceなしレコード")).toBeVisible();
    await expect(page.getByText("sourceありレコード")).toBeVisible();
    await expect(page.getByText("出典: 検証用発出元")).toBeVisible();
    await expect(page.getByRole("link", { name: "厚生労働省" })).toBeVisible();
  });

  test("正常系: real ingest official-db payload でも一覧表示が壊れない @smoke", async ({ page }) => {
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

    await page.goto(
      `/laws?ingestSource=real&realSourceFormat=official-db&realSourcePayload=${officialPayload}`
    );
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("公式DB形式の法改正")).toBeVisible();
    await expect(page.getByRole("link", { name: "e-Gov法令検索" })).toBeVisible();
  });

  test("失敗系: 一覧API 5xx でエラー通知表示 @failure", async ({ page }) => {
    await page.goto("/laws?forceRevisionsError=5xx");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("一覧の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("法改正一覧APIが一時的に利用できません。")).toBeVisible();
    await page.waitForTimeout(500);
    const retryButtonCount = await page.getByRole("button", { name: "一覧を再取得" }).count();
    expect(retryButtonCount).toBeGreaterThan(0);
  });

  test("失敗系: 一覧API timeout でエラー通知表示 @failure", async ({ page }) => {
    await page.goto("/laws?forceRevisionsError=timeout");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("一覧の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("法改正一覧の取得がタイムアウトしました。再試行してください。")).toBeVisible();
    await expect(page.getByRole("button", { name: "一覧を再取得" })).toBeVisible();
  });

  test("失敗系: 一覧API validation で再試行なし表示 @failure", async ({ page }) => {
    await page.goto("/laws?forceRevisionsError=validation");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByText("一覧の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("法改正一覧APIの入力検証エラーです。")).toBeVisible();
    await expect(page.getByText("このエラーは再試行対象外です。")).toBeVisible();
    await expect(page.getByRole("button", { name: "一覧を再取得" })).toHaveCount(0);
  });

  test("失敗系: real ingest 失敗時に fallback reason header が返る @failure", async ({ page }) => {
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/revisions"));
    await page.goto("/laws?ingestSource=real&realSourceUrl=https%3A%2F%2Fevil.com%2Frevisions.json");
    const response = await responsePromise;
    const fallbackReason = response.headers()["x-revisions-ingest-fallback-reason"];
    expect(fallbackReason).toBe("endpoint_not_allowed");
    await page.getByRole("button", { name: "法改正一覧" }).click();
    await expect(page.getByRole("heading", { name: "法改正一覧" }).first()).toBeVisible();
  });

  test("失敗系: 要約API 5xx で ErrorNotice と再試行表示 @failure", async ({ page }) => {
    await page.goto("/laws?forceSummaryError=5xx");
    await page.getByRole("button", { name: "AI要約" }).click();
    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await expect(page.getByText("要約の取得に失敗しました")).toBeVisible();
    await expect(page.getByText("要約APIが一時的に利用できません。")).toBeVisible();
    await expect(page.getByRole("button", { name: "要約を再取得" })).toBeVisible();
  });

  test("失敗系: 要約API timeout で ErrorNotice 表示 @failure", async ({ page }) => {
    await page.goto("/laws?forceSummaryError=timeout");
    await page.getByRole("button", { name: "AI要約" }).click();
    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await expect(page.getByText("要約API応答がタイムアウトしました。")).toBeVisible({ timeout: 12000 });
    await expect(page.getByRole("button", { name: "要約を再取得" })).toBeVisible();
  });

  test("失敗系: 要約API validation で再試行なし表示 @failure", async ({ page }) => {
    await page.goto("/laws?forceSummaryError=validation");
    await page.getByRole("button", { name: "AI要約" }).click();
    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await expect(page.getByText("要約APIの入力検証エラーです。")).toBeVisible();
    await expect(page.getByText("このエラーは再試行対象外です。")).toBeVisible();
    await expect(page.getByRole("button", { name: "要約を再取得" })).toHaveCount(0);
  });

  test("失敗系: チャットAPI validation で再試行なし表示 @failure", async ({ page }) => {
    await page.goto("/laws?forceChatError=validation");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャットの入力形式が不正です。")).toBeVisible();
    await expect(page.getByText("このエラーは再試行対象外です。")).toBeVisible();
  });

  test("失敗系: チャットAPI 5xx で再試行表示 @failure", async ({ page }) => {
    await page.goto("/laws?forceChatError=5xx");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャットAPIが一時的に利用できません。")).toBeVisible();
    await expect(page.getByRole("button", { name: "同じ質問を再送" })).toBeVisible();
  });

  test("失敗系: チャットAPI timeout で再試行表示 @failure", async ({ page }) => {
    await page.goto("/laws?forceChatError=timeout");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャット応答がタイムアウトしました。再試行してください。")).toBeVisible({
      timeout: 12000,
    });
    await expect(page.getByRole("button", { name: "同じ質問を再送" })).toBeVisible();
  });

  test("回復系: 要約API 5xx から再試行で回復 @recovery", async ({ page }) => {
    await page.goto("/laws?forceSummaryError=5xx");
    await page.getByRole("button", { name: "AI要約" }).click();
    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await expect(page.getByText("要約の取得に失敗しました")).toBeVisible();

    await page.goto("/laws");
    await page.getByRole("button", { name: "AI要約" }).click();
    await page.getByRole("button", { name: "AIで要約" }).first().click();
    await expect(page.getByText("3行要約")).toBeVisible();
  });

  test("回復系: チャットAPI 5xx から再送で回復 @recovery", async ({ page }) => {
    await page.goto("/laws?forceChatError=5xx");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("チャットAPIが一時的に利用できません。")).toBeVisible();

    await page.goto("/laws");
    await page.getByRole("button", { name: "質問チャット" }).click();
    await page.getByRole("button", { name: "質問する" }).first().click();
    await page.getByLabel("質問入力").fill("施行日はいつですか");
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.getByText("に関するダミー回答です。")).toBeVisible();
  });
});
