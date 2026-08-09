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
  attachedLeaflets?: Array<{
    id: string;
    title: string;
    category: string;
  }>;
};

async function callRoute(
  post: RoutePost,
  mode: "json" | "sse",
  message = "熱中症の報告体制は義務？",
): Promise<AttachmentPayload> {
  const response = await post(
    new Request("http://localhost/api/chatbot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message,
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

describe("electrical leaflet relevance at the actual route boundary", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
  });

  afterEach(() => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    resetCircuitBreakers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(modes)(
    "$label AI OFF応答は電気と無関係な教材をroute payloadへ含めない",
    async ({ post, mode }) => {
      const response = await post(
        new Request("http://localhost/api/chatbot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: "電気作業の特別教育について教えて",
            privacyConfirmed: true,
          }),
        }),
      );
      expect(response.status).toBe(200);
      const raw = await response.text();
      const payload =
        mode === "json"
          ? (JSON.parse(raw) as AttachmentPayload)
          : (() => {
              const frames = [
                ...raw.matchAll(/event: meta\ndata: ([^\n]+)\n\n/g),
              ];
              const meta = frames.at(-1)?.[1];
              if (!meta) {
                throw new Error(`SSE meta event missing: ${raw.slice(0, 240)}`);
              }
              return JSON.parse(meta) as AttachmentPayload;
            })();

      expect(payload.attachedLeaflets ?? []).toEqual([]);
      expect(JSON.stringify(payload.attachedLeaflets ?? [])).not.toMatch(
        /フルハーネス|墜落制止用器具|外国人/u,
      );
    },
  );
});

describe("cross-domain leaflet relevance at the actual route boundary", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
  });

  afterEach(() => {
    __resetChatbotCacheForTests();
    __resetRateLimitForTests();
    resetCircuitBreakers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const domainCases = [
    {
      label: "酸欠",
      message: "酸欠作業の資格は？",
      allowed: /(?:酸素欠乏|酸欠|硫化水素)/u,
    },
    {
      label: "有機溶剤",
      message: "有機溶剤作業主任者は必要？",
      allowed: /(?:有機溶剤|有機則|トルエン|キシレン)/u,
    },
    {
      label: "石綿",
      message: "石綿の事前調査について教えて",
      allowed: /(?:石綿|アスベスト)/u,
    },
    {
      label: "熱中症",
      message: "熱中症の報告体制は義務？",
      allowed: /(?:熱中症|暑熱|WBGT)/iu,
    },
    {
      label: "足場",
      message: "足場の手すりと作業床の条件は？",
      allowed: /(?:足場|手すり先行)/u,
    },
    {
      label: "フルハーネス",
      message: "フルハーネスの特別教育について教えて",
      allowed: /(?:フルハーネス|墜落制止用器具|安全帯|胴ベルト)/u,
    },
  ] as const;

  it.each(modes)(
    "$label AI OFF応答は全domainで同じ概念の資料だけを返しunknownは0件にする",
    async ({ post, mode }) => {
      for (const domain of domainCases) {
        __resetChatbotCacheForTests();
        __resetRateLimitForTests();
        const payload = await callRoute(post, mode, domain.message);
        for (const leaflet of payload.attachedLeaflets ?? []) {
          expect(leaflet.title, `${domain.label}: ${leaflet.title}`).toMatch(
            domain.allowed,
          );
        }
        expect(JSON.stringify(payload.attachedLeaflets ?? [])).not.toMatch(
          /外国人労働者|外国人建設就労者/u,
        );
      }

      __resetChatbotCacheForTests();
      __resetRateLimitForTests();
      const unknown = await callRoute(
        post,
        mode,
        "これについて一般的に教えて",
      );
      expect(unknown.attachedLeaflets ?? []).toEqual([]);
    },
  );
});
