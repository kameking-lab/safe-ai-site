import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { legalAnswerBasisNow, legalAnswerAsOf } from "@/lib/legal-answer-temporal";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";

afterEach(() => { vi.unstubAllEnvs(); __resetChatbotCacheForTests(); __resetRateLimitForTests(); });
vi.mock("@/data/laws/egov-verified-corpus.generated", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/data/laws/egov-verified-corpus.generated")>();
  return { ...original, verifiedLawArticles: original.verifiedLawArticles.map((article) => ({
    ...article, sourceRevisionId: "unverified-test-revision",
  })) };
});

describe("current October basis does not promote unverified electrical sources", () => {
  it("holds the main answer when a source revision does not match the independent ledger", async () => {
    vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
    expect(legalAnswerAsOf(legalAnswerBasisNow())).toBe("2026-10-12");
    const response = await POST(new Request("http://localhost/api/chatbot", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "電気の作業主任者が必要な工事は何？", context: {}, lawCategory: "all", privacyConfirmed: true }),
    }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.effectiveDateStatus).toMatchObject({ asOf: "2026-10-12", status: "unknown" });
    expect(payload.substantiveAnswer).toContain("根拠の現行版を確認できない");
    expect(payload.sources.some((source: { applicationStatus: string }) => source.applicationStatus === "unknown")).toBe(true);
  });
});
