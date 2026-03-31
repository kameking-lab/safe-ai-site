import { describe, expect, it, vi } from "vitest";
import { createApiRevisionService } from "@/lib/services/revision-service";
import { createApiSummaryService } from "@/lib/services/summary-service";
import { createApiChatService } from "@/lib/services/chat-service";

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("live services", () => {
  it("revision-service: live mode 5xx を UNAVAILABLE として扱う", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({}, 503));
    const service = createApiRevisionService(fetchMock as unknown as typeof fetch);

    const result = await service.getLawRevisions();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAVAILABLE");
      expect(result.error.retryable).toBe(true);
    }
  });

  it("summary-service: live mode 成功レスポンスを返す", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        data: {
          revisionId: "lr-001",
          summary: {
            threeLineSummary: ["a", "b", "c"],
            workplaceActions: ["x"],
            targetIndustries: ["y"],
          },
        },
      })
    );
    const service = createApiSummaryService(fetchMock as unknown as typeof fetch);

    const result = await service.getSummaryByRevisionId({ revisionId: "lr-001" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.revisionId).toBe("lr-001");
    }
  });

  it("summary-service: live mode validationエラーを受け取る", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          ok: false,
          error: {
            code: "VALIDATION",
            message: "revisionId は必須です。",
            retryable: false,
          },
        },
        400
      )
    );
    const service = createApiSummaryService(fetchMock as unknown as typeof fetch);

    const result = await service.getSummaryByRevisionId({ revisionId: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION");
      expect(result.error.retryable).toBe(false);
    }
  });

  it("chat-service: live mode タイムアウトを NETWORK として扱う", async () => {
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        })
    );
    const service = createApiChatService(fetchMock as unknown as typeof fetch);

    const result = await service.sendMessage({
      revision: null,
      question: "いつからですか？",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK");
      expect(result.error.retryable).toBe(true);
    }
  });

  it("chat-service: live mode validationエラーを受け取る", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          error: {
            code: "VALIDATION",
            message: "質問文を入力してください。",
            retryable: false,
          },
        },
        400
      )
    );
    const service = createApiChatService(fetchMock as unknown as typeof fetch);

    const result = await service.sendMessage({
      revision: null,
      question: "   ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION");
      expect(result.error.retryable).toBe(false);
    }
  });
});
