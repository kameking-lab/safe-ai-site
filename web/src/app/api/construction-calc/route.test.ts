import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSnapshot, recordFailure, resetAll } from "@/lib/external/circuit-breaker";
import { __resetDevelopmentSharedStateForTests } from "@/lib/security/shared-state";
import { GET, POST, PUT } from "./route";

const ledger = vi.hoisted(() => ({
  month: vi.fn(),
  update: vi.fn(),
  reserve: vi.fn(),
  settle: vi.fn(),
}));
vi.mock("@/lib/prisma", () => {
  const tx = {
    $executeRaw: vi.fn(),
    mobileBudgetMonth: { upsert: ledger.month, update: ledger.update },
    mobileProviderReservation: { create: ledger.reserve, updateMany: ledger.settle },
  };
  return { prisma: { $transaction: (work: (db: typeof tx) => unknown) => work(tx) } };
});

function calculate() {
  return POST(new Request("https://example.test/api/construction-calc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: "幅2メートルの生コンクリートの打設量を確認したい",
      aiProviderConsent: true,
    }),
  }));
}

describe("/api/construction-calc deterministic explanation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAll();
    __resetDevelopmentSharedStateForTests();
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("SAFE_AI_STAGING_MODE", "false");
    vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
    vi.stubEnv("GEMINI_API_KEY", "provider-test-key");
    vi.stubEnv("MOBILE_LEDGER_ENABLED", "true");
    vi.stubEnv("MOBILE_AI_PRICED_MODEL", "gemini-3.8-flash");
    vi.stubEnv("MOBILE_AI_INPUT_JPY_PER_MILLION", "100");
    vi.stubEnv("MOBILE_AI_OUTPUT_JPY_PER_MILLION", "500");
    vi.stubEnv("MOBILE_AI_COST_MARGIN", "1.25");
    ledger.month.mockResolvedValue({ committedYen: 0, reservedYen: 0 });
    ledger.reserve.mockResolvedValue({ id: "test-reservation" });
    ledger.settle.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reserves before calling the bounded Flash model and settles measured usage", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      slug: "concrete-volume",
                      values: { width: 2 },
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 36 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const response = await calculate();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: "ai" });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(ledger.reserve).toHaveBeenCalledBefore(fetchSpy);
    expect(fetchSpy).toHaveBeenCalledBefore(ledger.settle);
    expect(ledger.update).toHaveBeenLastCalledWith({
      where: { month: expect.stringMatching(/^\d{4}-\d{2}$/) },
      data: { reservedYen: { decrement: expect.any(Number) }, committedYen: { increment: 1 } },
    });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
    );
    expect(url).not.toContain("provider-test-key");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-goog-api-key": "provider-test-key",
    });
    expect(String(init.body)).not.toMatch(
      /"(?:temperature|topP|topK|top_p|top_k|candidateCount|candidate_count|thinkingBudget|thinking_budget)"\s*:/u,
    );
    expect(JSON.parse(String(init.body))).toMatchObject({
      generationConfig: {
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: "LOW" },
        responseMimeType: "application/json",
      },
    });
  });

  it.each(["budget denied", "ledger unavailable", "ledger disabled"])(
    "keeps keyword routing with zero provider calls when the %s",
    async (condition) => {
      if (condition === "budget denied") ledger.month.mockResolvedValue({ committedYen: 45_000, reservedYen: 0 });
      if (condition === "ledger unavailable") ledger.month.mockRejectedValue(new Error("fixture ledger unavailable"));
      if (condition === "ledger disabled") vi.stubEnv("MOBILE_LEDGER_ENABLED", "false");
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const response = await calculate();

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ source: "fallback", matched: { slug: "concrete-volume" } });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(ledger.reserve).not.toHaveBeenCalled();
      expect(ledger.settle).not.toHaveBeenCalled();
      expect(getSnapshot("gemini")?.consecutiveFailures).toBe(0);
    },
  );

  it("does not use a reservation when the Gemini circuit is open", async () => {
    for (let attempt = 0; attempt < 5; attempt++) recordFailure("gemini", new Error("fixture provider failure"));
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await (await calculate()).json()).toMatchObject({ source: "fallback" });
    expect(ledger.month).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects URL-serialized calculator inputs", async () => {
    const marker = "CONFIDENTIAL-SITE-MARKER";
    const response = await GET(
      new Request(
        `https://example.test/api/construction-calc?slug=concrete-volume&width=${marker}`,
      ),
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(JSON.stringify(await response.json())).not.toContain(marker);
  });

  it("formats only the verified deterministic result from a request body", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await PUT(
      new Request("https://example.test/api/construction-calc", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: "concrete-volume",
          values: { width: 2, length: 3, thickness: 0.2 },
        }),
      }),
    );
    const body = (await response.json()) as {
      explanation: string;
      source: string;
      disclaimer: string;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("X-AI-Used")).toBe("false");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.source).toBe("deterministic");
    expect(body.explanation).toContain("【計算の流れ】");
    expect(body.explanation).toContain(
      "新しい法的判断や安全判断を追加していません",
    );
    expect(body.disclaimer).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
