import { expect, test } from "@playwright/test";

test("安衛法AIはブラウザー同一originから根拠回答を正常送信する", async ({
  page,
}) => {
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": "198.51.100.61",
  });
  await page.goto("/chatbot");
  await page
    .getByLabel("質問入力")
    .fill("酸素欠乏症等防止規則第11条と第12条の違いを確認したい");
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/chatbot/stream" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "送信" }).click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/event-stream");
  expect(response.headers()["x-ai-used"]).toBe("false");

  const stream = await response.text();
  expect(stream).toContain("event: meta");
  expect(stream).toContain('"source_type":"rag"');
  expect(stream).toContain("第11条");
  expect(stream).toContain("第12条");
  const answer = page.getByRole("article", { name: "安衛法AIの回答" });
  await expect(answer).toBeVisible();
  await expect(answer).toContainText(/第11条|第12条/);
  const sources = answer.locator("[data-chatbot-source-details]");
  await expect(sources).toBeVisible();
  expect(await sources.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
});
