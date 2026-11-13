import { expect, test } from "@playwright/test";
import { consentToChatbot } from "./support/chatbot-consent";

test.describe("AI privacy network boundary", () => {
  test("send authorizes one request without extra opt-in, including after reload", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/chatbot/stream", async (route) => {
      requests += 1;
      const answer = "作業条件を確認してください。";
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream; charset=utf-8",
        body: `event: text\ndata: ${JSON.stringify({ chunk: answer })}\n\nevent: meta\ndata: ${JSON.stringify({ answer, sources: [], source_type: "rag", confidence: "low", requiresHumanReview: true })}\n\n`,
      });
    });
    await page.goto("/chatbot");
    const input = page.getByLabel("質問入力");
    const submit = page.getByRole("button", { name: "送信", exact: true });
    await consentToChatbot(page);
    await input.fill("足場の手すりは？");
    expect(requests).toBe(0);
    await expect(input).toHaveValue("足場の手すりは？");
    await submit.click();
    await expect.poll(() => requests).toBe(1);
    await expect(page.getByRole("article", { name: "安衛法AIの回答" })).toContainText("作業条件を確認");
    await page.getByRole("button", { name: "新しい相談" }).click();
    await input.fill("足場の種類は？");
    await submit.click();
    await expect.poll(() => requests).toBe(2);
    await page.reload();
    await consentToChatbot(page);
    await input.fill("足場の高さは？");
    expect(requests).toBe(2);
    await submit.click();
    await expect.poll(() => requests).toBe(3);
    await expect(page.getByRole("dialog", { name: "AIへの送信確認" })).toHaveCount(0);
  });

  // Owner decision 2026-11-07: no 110/119 interception; emergency wording is sent like any question.
  test("emergency wording is not intercepted and shows no 110/119 notice", async ({ page }) => {
    const chatbotRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/chatbot(?:\/stream)?$/.test(new URL(request.url()).pathname)) {
        chatbotRequests.push(request.url());
      }
    });
    await page.goto("/chatbot");
    await consentToChatbot(page);
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
    await consentToChatbot(page);
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
