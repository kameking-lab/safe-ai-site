import { expect, test } from "@playwright/test";

test.describe("AI emergency/privacy network boundary", () => {
  test("emergency input reaches no chatbot API, history, analytics, or transfer CTA", async ({ page }) => {
    const chatbotRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/chatbot(?:\/stream)?$/.test(new URL(request.url()).pathname)) {
        chatbotRequests.push(request.url());
      }
    });
    await page.goto("/chatbot");
    await page.getByLabel("質問入力").fill("反応がありません");
    await page.getByRole("button", { name: "送信" }).click();

    const alert = page.locator('[role="alert"][data-safety-kind="emergency"]');
    await expect(alert).toContainText("119");
    expect(chatbotRequests).toEqual([]);
    await expect(page.getByText("反応がありません", { exact: true })).toHaveCount(0);
    await expect(page.locator('a[href^="/ky?q="]')).toHaveCount(0);
    const stored = await page.evaluate(() => JSON.stringify(Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index)!;
        return [key, localStorage.getItem(key)];
      }),
    )));
    expect(stored).not.toContain("反応がありません");
  });

  test("actual-value PII is blocked before browser network and local persistence", async ({ page }) => {
    let chatbotRequestCount = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/chatbot")) chatbotRequestCount += 1;
    });
    await page.goto("/chatbot");
    const marker = "山田 太郎 worker@example.com";
    await page.getByLabel("質問入力").fill(marker);
    await page.getByRole("button", { name: "送信" }).click();
    await expect(page.locator('[role="alert"][data-safety-kind="privacy"]')).toBeVisible();
    expect(chatbotRequestCount).toBe(0);
    const stored = await page.evaluate(() => Array.from(
      { length: localStorage.length },
      (_, index) => localStorage.getItem(localStorage.key(index)!),
    ).join("\n"));
    expect(stored).not.toContain(marker);
  });
});
