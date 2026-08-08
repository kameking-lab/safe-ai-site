import { test, expect } from "@playwright/test";

test.describe("Copilot 公開境界 @smoke", () => {
  test("チャットは1本の会話だけを表示し、隔離機能へ誘導しない", async ({
    page,
  }) => {
    const res = await page.goto("/chatbot");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("region", { name: "安衛法AIとの会話" })).toBeVisible();
    await expect(page.locator("[data-chatbot-composer]")).toBeVisible();
    expect(await page.locator("[data-chatbot-question-chip]").count()).toBeLessThanOrEqual(3);
    await expect(page.getByRole("navigation", { name: /Copilot/ })).toHaveCount(0);
    await expect(page.getByText("2. 事故傾向を確認")).toHaveCount(0);
    await expect(page.getByText("3. 年次計画を作成")).toHaveCount(0);
    await expect(page.getByText("現在公開中の確認手順だけを表示しています")).toHaveCount(0);
  });

  test("事故レポート入口は隔離された事故DBへ転送する", async ({
    request,
  }) => {
    const response = await request.get("/accidents-reports", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/accidents");
  });

  test("事故レポート業種詳細も公開機能として露出しない", async ({
    request,
  }) => {
    const response = await request.get("/accidents-reports/construction", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/accidents");
  });

  test("年次計画生成は品質説明へfail-closedする", async ({
    request,
  }) => {
    const response = await request.get(
      "/strategy/plan-generator?industry=construction",
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/about/quality#");
  });
});
