import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const providerState = vi.hoisted(() => ({
  mode: "success" as "success" | "timeout",
  calls: 0,
  requests: [] as unknown[],
}));

vi.mock("@/lib/chatbot-route-shared", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/chatbot-route-shared")
  >();
  return {
    ...original,
    GENERATIVE_LEGAL_ANSWERS_ENABLED: true,
  };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
        generateContent: async (request: unknown) => {
          providerState.calls += 1;
          providerState.requests.push(request);
          if (providerState.mode === "timeout") {
            throw new Error("provider timeout");
          }
          return {
            text: "安衛則第612条の2［1］",
          };
        },
        generateContentStream: async (request: unknown) => {
          providerState.calls += 1;
          providerState.requests.push(request);
          if (providerState.mode === "timeout") {
            throw new Error("provider timeout");
          }
          return {
            async *[Symbol.asyncIterator]() {
              yield { text: "安衛則第612条の2［1］" };
            },
          };
        },
      };
  },
}));

import { POST as postJson } from "./route";
import { POST as postStream } from "./stream/route";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";
import { resetAll as resetCircuitBreakers } from "@/lib/external/circuit-breaker";

type RoutePost = (request: Request) => Promise<Response>;
type AttachmentPayload = {
  answer: string;
  sources: Array<{ law: string; article: string }>;
  attachedNotices?: Array<{
    id: string;
    source: "A" | "B" | "C";
    evidenceRole: "related-material";
    sourceUrl: string;
    pdfUrl: string | null;
    locator: string | null;
    excerpt: string | null;
    independentlyCheckedAt: string | null;
  }>;
};

async function callRoute(
  post: RoutePost,
  mode: "json" | "sse",
): Promise<AttachmentPayload> {
  const response = await post(
    new Request("http://localhost/api/chatbot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "熱中症の報告体制は義務？",
        privacyConfirmed: true,
      }),
    }),
  );
  expect(response.status).toBe(200);
  const raw = await response.text();
  if (mode === "json") return JSON.parse(raw) as AttachmentPayload;
  const frames = [...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g)];
  const meta = frames.at(-1)?.[1];
  if (!meta) throw new Error(`SSE meta event missing: ${raw.slice(0, 240)}`);
  return JSON.parse(meta) as AttachmentPayload;
}

function expectRelatedHeatNotice(payload: AttachmentPayload) {
  expect(
    payload.sources.some(
      ({ law, article }) =>
        /労働安全衛生規則|安衛則/.test(law) && /第612条の2/.test(article),
    ),
  ).toBe(true);
  expect(payload.attachedNotices).toHaveLength(1);
  expect(payload.attachedNotices?.[0]).toMatchObject({
    id: "mhlw-notice-0014",
    source: "A",
    evidenceRole: "related-material",
    sourceUrl:
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
    pdfUrl: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
    locator: "PDF 2ページ 第3 1(1)イ",
    independentlyCheckedAt: "2026-08-02",
  });
  expect(payload.attachedNotices?.[0]?.excerpt).toContain(
    "湿球黒球温度（WBGT）が28度以上",
  );
}

const modes = [
  { label: "JSON", post: postJson, mode: "json" },
  { label: "SSE", post: postStream, mode: "sse" },
] as const;

describe.each([
  { label: "provider正常", providerMode: "success" },
  { label: "provider timeout", providerMode: "timeout" },
] as const)("chatbot verified notice attachment: $label", ({ providerMode }) => {
  beforeEach(() => {
    providerState.mode = providerMode;
    providerState.calls = 0;
    providerState.requests = [];
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("SAFE_AI_STAGING_MODE", "false");
    vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
    vi.stubEnv("GEMINI_API_KEY", "provider-route-test-key");
  });

  afterEach(() => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    resetCircuitBreakers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(modes)(
    "$label経路も確認済み通達を法令根拠とは別の関連資料として返す",
    async ({ post, mode }) => {
      if (providerMode === "timeout") {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
      }
      const payload = await callRoute(post, mode);

      expect(providerState.calls).toBe(1);
      expect(providerState.requests).toHaveLength(1);
      expect(providerState.requests[0]).toMatchObject({
        model: "gemini-3.6-flash",
        contents: expect.any(String),
        config: {
          systemInstruction: expect.any(String),
          abortSignal: expect.anything(),
        },
      });
      expect(JSON.stringify(providerState.requests[0])).not.toMatch(
        /"(?:temperature|topP|topK|top_p|top_k|candidateCount|candidate_count|thinkingBudget|thinking_budget)"\s*:/u,
      );
      expect(payload.answer).toContain("結論");
      expectRelatedHeatNotice(payload);
    },
  );
});
