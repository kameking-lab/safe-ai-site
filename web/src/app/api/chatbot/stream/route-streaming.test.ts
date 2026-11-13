// @vitest-environment node
// 実サービス・DBには接続せず、実際のRoute HandlerのSSEを逐次読む。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({
  text: "作業前に手すりと作業床の状態を確認してください。",
  finishReason: "STOP" as string | null,
  delays: [0, 0, 0],
  fail: false,
  calls: 0,
  settled: false,
  settlementDelay: 0,
  settlementFail: false,
  usage: undefined as unknown,
  order: [] as string[],
  signal: undefined as AbortSignal | undefined,
  waitForAbort: false,
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContentStream: async ({ config }: { config: { abortSignal: AbortSignal } }) => {
        provider.calls++;
        provider.signal = config.abortSignal;
        return {
          async *[Symbol.asyncIterator]() {
            const size = Math.ceil(provider.text.length / 3);
            for (let i = 0; i < 3; i++) {
              if (i === 1 && provider.waitForAbort) {
                await new Promise<void>((_, reject) => {
                  const abort = () => reject(new DOMException("Aborted", "AbortError"));
                  if (config.abortSignal.aborted) abort();
                  else config.abortSignal.addEventListener("abort", abort, { once: true });
                });
              }
              await new Promise((resolve) => setTimeout(resolve, provider.delays[i]));
              if (i === 1 && provider.fail) throw new Error("provider disconnected");
              provider.order.push(`chunk-${i}`);
              yield {
                text: provider.text.slice(i * size, (i + 1) * size),
                ...(i === 2 ? {
                  candidates: [{ finishReason: provider.finishReason }],
                  usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 300, thoughtsTokenCount: 50, totalTokenCount: 1250 },
                } : {}),
              };
            }
          },
        };
      },
    };
  },
}));

vi.mock("@/lib/mobile/usage", () => ({
  withUsage: async (request: Request, _feature: string, run: (request: Request) => Promise<Response>) => run(request),
  withProviderBudget: async (run: () => Promise<unknown>, _bound: unknown, readUsage?: () => unknown) => {
    provider.order.push("reserve");
    try { return await run(); }
    finally {
      await new Promise((resolve) => setTimeout(resolve, provider.settlementDelay));
      provider.usage = readUsage?.();
      if (provider.settlementFail) throw new Error("settlement storage failed");
      provider.settled = true;
      provider.order.push("settled");
    }
  },
}));

import { POST } from "./route";
import { __resetChatbotCacheForTests } from "@/lib/chatbot-cache";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";
import { resetAll } from "@/lib/external/circuit-breaker";
import type { ChatbotResponse } from "@/lib/chatbot-contract";

beforeEach(() => {
  Object.assign(provider, {
    text: "作業前に手すりと作業床の状態を確認してください。",
    finishReason: "STOP", delays: [0, 0, 0], fail: false,
    calls: 0, settled: false, settlementDelay: 0, settlementFail: false, usage: undefined, order: [],
    signal: undefined, waitForAbort: false,
  });
  vi.stubEnv("VERCEL_ENV", "development");
  vi.stubEnv("SAFE_AI_STAGING_MODE", "false");
  vi.stubEnv("LEGAL_CHAT_AI_ENABLED", "true");
  vi.stubEnv("GEMINI_API_KEY", "mock-only");
  vi.spyOn(console, "info").mockImplementation(() => {});
  __resetChatbotCacheForTests();
  __resetRateLimitForTests();
  resetAll();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

type Frame = { event: string; data: Record<string, unknown>; at: number };
async function readResponse(requestSignal?: AbortSignal, onFrame?: (frame: Frame) => void) {
  const start = performance.now();
  const response = await POST(new Request("http://localhost/api/chatbot/stream", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "足場の手すりの高さは？", privacyConfirmed: true }),
    signal: requestSignal,
  }));
  expect(response.status).toBe(200);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const frames: Frame[] = [];
  let buffer = "";
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    buffer += decoder.decode(item.value, { stream: true });
    let separator: number;
    while ((separator = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const event = raw.match(/^event: (.+)/m)?.[1];
      const data = raw.match(/^data: (.+)/m)?.[1];
      if (!event || !data) continue;
      const frame = { event, data: JSON.parse(data) as Record<string, unknown>, at: performance.now() - start };
      frames.push(frame);
      onFrame?.(frame);
    }
  }
  return { frames, total: performance.now() - start };
}
function meta(frames: Frame[]) {
  return frames.findLast((frame) => frame.event === "meta")?.data as ChatbotResponse | undefined;
}

describe("法令チャットの逐次送信", () => {
  it("模擬応答の初文字と全体時間を測る", async () => {
    provider.delays = [40, 100, 100];
    provider.settlementDelay = 60;
    let sawFirstText = false;
    const result = await readResponse(undefined, (frame) => {
      if (frame.event === "text" && !sawFirstText) {
        sawFirstText = true;
        expect(provider.order).not.toContain("chunk-2");
        expect(provider.settled).toBe(false);
      }
    });
    const first = result.frames.find((frame) => frame.event === "text")!;
    process.stdout.write(JSON.stringify({ benchmark: "anz-stream", firstTextMs: +first.at.toFixed(1), totalMs: +result.total.toFixed(1) }) + "\n");
    expect(meta(result.frames)?.answer).toContain("手すりと作業床");
    expect(provider.settled).toBe(true);
    expect(first.data.provisional).toBe(true);
    expect(sawFirstText).toBe(true);
    expect(result.total - first.at).toBeGreaterThan(150);
    expect(provider.order.indexOf("settled")).toBeGreaterThan(provider.order.indexOf("chunk-2"));
  });

  it("本文を3回送り、出典は費用精算後の最終metaだけで確定する", async () => {
    const { frames } = await readResponse(undefined, (frame) => {
      if (frame.event === "text") expect(provider.settled).toBe(false);
      if (frame.event === "meta") expect(provider.settled).toBe(true);
    });
    const texts = frames.filter((frame) => frame.event === "text");
    expect(texts).toHaveLength(3);
    expect(texts.map((frame) => frame.data.chunk).join("")).toBe(provider.text);
    expect(texts.every((frame) => frame.data.provisional === true && !frame.data.sources && !frame.data.citations)).toBe(true);
    expect(frames.at(-1)?.event).toBe("meta");
    expect(meta(frames)?.sources.length).toBeGreaterThan(0);
    expect(provider.usage).toEqual({ promptTokenCount: 900, candidatesTokenCount: 300, thoughtsTokenCount: 50, totalTokenCount: 1250 });
    expect(provider.calls).toBe(1);
  });

  it.each(["MAX_TOKENS", "SAFETY", "RECITATION", null])("終了理由=%sの暫定本文を収録条文へ置き換える", async (reason) => {
    provider.text = "この暫定本文は確定回答に残してはいけません。";
    provider.finishReason = reason;
    const { frames } = await readResponse();
    expect(frames.some((frame) => frame.event === "text" && frame.data.provisional)).toBe(true);
    expect(meta(frames)?.answer).not.toContain("この暫定本文");
    expect(meta(frames)?.scopeWarnings?.join(" ")).toContain(reason ?? "終了理由未取得");
    expect(meta(frames)?.confidence).toBe("low");
    expect(provider.settled).toBe(true);
  });

  it("架空条文を含む暫定本文を置き換え、確定出典にも残さない", async () => {
    provider.text = "安衛則第99999条でこの架空条件が定められています。";
    const { frames } = await readResponse();
    const payload = meta(frames)!;
    expect(payload.answer).not.toContain("第99999条");
    expect(payload.citations.some((citation) => citation.articleNum.includes("99999"))).toBe(false);
    expect(payload.sources.some((source) => source.article.includes("99999"))).toBe(false);
    expect(payload.scopeWarnings?.join(" ")).toContain("99999");
    expect(payload.confidence).toBe("low");
  });

  it("本文受信途中の通信断も最終metaで安全な案内へ置き換える", async () => {
    provider.text = "この途中の生成本文は利用できません。";
    provider.fail = true;
    const { frames } = await readResponse();
    expect(frames.filter((frame) => frame.event === "text")).toHaveLength(1);
    expect(meta(frames)?.answer).not.toContain("この途中の生成");
    expect(meta(frames)?.scopeWarnings?.join(" ")).toContain("接続に失敗");
    expect(provider.settled).toBe(true);
    expect(provider.calls).toBe(1);
  });

  it("収録範囲外の引用を警告付き・低信頼度で返し、出典として確定しない", async () => {
    provider.text = "この作業に関しては労基法第37条も確認してください。";
    const { frames } = await readResponse();
    const payload = meta(frames)!;
    expect(payload.confidence).toBe("low");
    expect(payload.scopeWarnings?.join(" ")).toContain("第37条");
    expect(payload.answer).not.toContain("労基法第37条");
    expect(payload.directAnswer).not.toContain("労基法第37条");
    expect(payload.substantiveAnswer).not.toContain("労基法第37条");
    expect(payload.citations.some((citation) => citation.lawShort === "労基法" && citation.articleNum === "第37条")).toBe(false);
    expect(payload.sources.some((source) => source.lawShort === "労基法" && source.article.includes("第37条"))).toBe(false);
  });

  it("精算の失敗を待たず成功回答として確定しない", async () => {
    provider.settlementFail = true;
    const { frames } = await readResponse();
    expect(meta(frames)?.answer).not.toContain(provider.text);
    expect(meta(frames)?.confidence).toBe("low");
    expect(meta(frames)?.scopeWarnings?.join(" ")).toContain("接続に失敗");
  });

  it("空本文でも空の成功回答を返さず条文案内へ戻す", async () => {
    provider.text = "";
    const { frames } = await readResponse();
    expect(meta(frames)?.answer.trim().length).toBeGreaterThan(0);
    expect(meta(frames)?.confidence).toBe("low");
    expect(frames.filter((frame) => frame.event === "text")).toHaveLength(1);
  });

  it("リクエスト中断後は確定回答を送らず、費用処理をawaitして閉じる", async () => {
    const abort = new AbortController();
    const { frames } = await readResponse(abort.signal, (frame) => {
      if (frame.event === "text") abort.abort();
    });
    expect(meta(frames)).toBeUndefined();
    expect(provider.settled).toBe(true);
    expect(provider.calls).toBe(1);
  });

  it("受信Readerのcancelでも逐次受信を打ち切り費用処理を完了する", async () => {
    provider.delays = [0, 20, 20];
    const response = await POST(new Request("http://localhost/api/chatbot/stream", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "足場の手すりの高さは？", privacyConfirmed: true }),
    }));
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error("本文より前に終了しました");
      if (decoder.decode(chunk.value).includes("event: text")) break;
    }
    await reader.cancel();
    await vi.waitFor(() => expect(provider.settled).toBe(true));
    expect(provider.order).not.toContain("chunk-2");
    expect(provider.calls).toBe(1);
  });

  it("最終チャンク後の費用精算待ちで中断しても確定metaを送らない", async () => {
    provider.settlementDelay = 40;
    const abort = new AbortController();
    let textCount = 0;
    const { frames } = await readResponse(abort.signal, (frame) => {
      if (frame.event === "text" && ++textCount === 3) abort.abort();
    });
    expect(provider.settled).toBe(true);
    expect(meta(frames)).toBeUndefined();
  });

  it("Readerのcancelは次のチャンクを待たず生成を中断し、費用精算まで待つ", async () => {
    provider.waitForAbort = true;
    provider.settlementDelay = 40;
    const response = await POST(new Request("http://localhost/api/chatbot/stream", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "足場の手すりの高さは？", privacyConfirmed: true }),
    }));
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error("本文より前に終了しました");
      if (decoder.decode(chunk.value).includes("event: text")) break;
    }
    try {
      await reader.cancel();
      expect(provider.signal?.aborted).toBe(true);
      expect(provider.settled).toBe(true);
      expect(provider.order).not.toContain("chunk-1");
    } finally {
      // 修正前の再現テストでも待ち続けるモックを残さない。
      provider.signal?.dispatchEvent(new Event("abort"));
    }
  });

  it("確定済みキャッシュを再生するときはGeminiを再度呼ばない", async () => {
    const first = await readResponse();
    const second = await readResponse();
    expect(meta(second.frames)?.answer).toBe(meta(first.frames)?.answer);
    expect(provider.calls).toBe(1);
    expect(second.frames.filter((frame) => frame.event === "text").every((frame) => !frame.data.provisional)).toBe(true);
  });
});
