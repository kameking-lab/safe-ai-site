import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({
  clientOptions: [] as unknown[],
  requests: [] as unknown[],
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (request: unknown) => {
        provider.requests.push(request);
        return {
          text: JSON.stringify({
            hazards: [
              {
                hazard: "開口部から墜落する",
                reduction: "手すりと立入禁止措置を確認する",
                likelihood: 2,
                severity: 3,
              },
            ],
          }),
        };
      },
    };

    constructor(options: unknown) {
      provider.clientOptions.push(options);
    }
  },
}));

import { generateHazardsWithGemini } from "@/lib/ky/gemini-suggest";

describe("KY Gemini provider request", () => {
  beforeEach(() => {
    provider.clientOptions = [];
    provider.requests = [];
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
    vi.stubEnv("GEMINI_API_KEY", "provider-test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses Gemini 3.6 Flash with a timeout and no removed parameters", async () => {
    const result = await generateHazardsWithGemini("開口部付近の作業", []);

    expect(result).toHaveLength(1);
    expect(provider.clientOptions).toEqual([
      {
        apiKey: "provider-test-key",
        httpOptions: { timeout: 12_000 },
      },
    ]);
    expect(provider.requests).toHaveLength(1);
    expect(provider.requests[0]).toMatchObject({
      model: "gemini-3.6-flash",
      contents: expect.any(String),
      config: {
        systemInstruction: expect.any(String),
        abortSignal: expect.anything(),
      },
    });
    expect(JSON.stringify(provider.requests[0])).not.toMatch(
      /"(?:temperature|topP|topK|top_p|top_k|candidateCount|candidate_count|thinkingBudget|thinking_budget)"\s*:/u,
    );
  });
});
