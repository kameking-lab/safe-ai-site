import { expect, test } from "@playwright/test";

test.describe("AI privacy network boundary", () => {
  // Owner decision 2026-11-07: no 110/119 interception; emergency wording is sent like any question.
  test("emergency wording is not intercepted and shows no 110/119 notice", async ({ page }) => {
    const chatbotRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/chatbot(?:\/stream)?$/.test(new URL(request.url()).pathname)) {
        chatbotRequests.push(request.url());
      }
    });
    await page.goto("/chatbot");
    await page.getByLabel("質問入力").fill("反応がありません");
    await page.getByRole("button", { name: "送信" }).click();
    await expect.poll(() => chatbotRequests.length).toBeGreaterThan(0);
    await expect(page.locator('[role="alert"][data-safety-kind="emergency"]')).toHaveCount(0);
    await expect(page.getByText(/110番|119番/)).toHaveCount(0);
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
