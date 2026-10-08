import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { legalAnswerBasisNow, legalAnswerAsOf } from "@/lib/legal-answer-temporal";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";

afterEach(() => { vi.unstubAllEnvs(); __resetChatbotCacheForTests(); __resetRateLimitForTests(); });
describe("current October basis does not promote unverified electrical sources", () => {
  it("uses the real October anchor and refuses a current guarantee from older electrical evidence", async () => {
    vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
    expect(legalAnswerAsOf(legalAnswerBasisNow())).toBe("2026-10-08");
    const response = await POST(new Request("http://localhost/api/chatbot", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "電気の作業主任者が必要な工事は何？", context: {}, lawCategory: "all", privacyConfirmed: true }),
    }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.effectiveDateStatus).toMatchObject({ asOf: "2026-10-08", status: "unknown" });
    expect(payload.sources.some((source: { lawShort: string }) => source.lawShort.includes("電"))).toBe(true);
  });
});
