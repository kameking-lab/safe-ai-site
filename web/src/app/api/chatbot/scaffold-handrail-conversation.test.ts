import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";
import type { ChatbotResponse } from "@/lib/chatbot-contract";

async function ask(message: string, context?: ChatbotResponse["context"]) {
  const result = await POST(new Request("http://localhost/api/chatbot", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context, privacyConfirmed: true }),
  }));
  expect(result.status).toBe(200);
  return await result.json() as ChatbotResponse;
}
beforeEach(() => { __resetChatbotCacheForTests(); __resetRateLimitForTests(); });
describe("scaffold handrail clarification across the public context boundary", () => {
  it("keeps the handrail intent after the user selects frame scaffolding, without raw history", async () => {
    const first = await ask("足場の手すりは？");
    expect(first.context).toBeDefined();
    const second = await ask("わく組足場です", first.context);
    const visible = [second.directAnswer, ...second.importantConditions].join(" ");
    expect(visible).toMatch(/手すりわく|交さ筋かい/);
    expect(second.clarificationQuestion ?? "").not.toMatch(/わく組足場.*わく組以外.*開口部/);
    expect(second.sources.some(source => /563/.test(source.article) && /mhlw\.go\.jp|e-gov\.go\.jp/.test(source.url ?? ""))).toBe(true);
    expect(second.source_type).toBe("rag");
  });
});
