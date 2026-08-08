import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST, PUT } from "./route";

describe("/api/construction-calc deterministic explanation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends the pinned Flash model with the API key only in a header", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
    vi.stubEnv("GEMINI_API_KEY", "provider-test-key");
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
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(
      new Request("https://example.test/api/construction-calc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: "幅2メートルのコンクリート体積を確認したい",
          aiProviderConsent: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    );
    expect(url).not.toContain("provider-test-key");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-goog-api-key": "provider-test-key",
    });
    expect(String(init.body)).not.toMatch(
      /"(?:temperature|topP|topK|top_p|top_k|candidateCount|candidate_count|thinkingBudget|thinking_budget)"\s*:/u,
    );
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
