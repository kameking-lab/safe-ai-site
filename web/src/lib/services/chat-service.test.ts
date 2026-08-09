import { describe, expect, it, vi } from "vitest";
import {
  createApiChatService,
  createMockChatService,
} from "@/lib/services/chat-service";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import type { ChatApiRequest } from "@/lib/types/api";

describe("chat-service", () => {
  it("createInitialMessages returns one assistant message", () => {
    const service = createMockChatService();
    const messages = service.createInitialMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].content).toBe("選択中の法改正について質問できます。");
    expect(messages[0].content).not.toMatch(/RAG|Gemini/);
  });

  it("sendMessage returns reply in success result", async () => {
    const service = createMockChatService();
    const result = await service.sendMessage({
      revision: lawRevisionCores[0],
      question: "施行日はいつですか？",
      privacyConfirmed: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.content.length).toBeGreaterThan(0);
    }
  });

  it("表示用の自由文履歴をlegacy APIへ渡さず構造化contextだけを送る", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ reply: "回答" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const service = createApiChatService(fetchMock as unknown as typeof fetch);

    await service.sendMessage({
      revision: null,
      question: "作業主任者",
      privacyConfirmed: true,
      context: {
        topicDomain: "electrical",
        equipment: "電気設備",
      },
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(init.body)) as ChatApiRequest;
    expect(payload).not.toHaveProperty("history");
    expect(payload.context).toMatchObject({
      topicDomain: "electrical",
      equipment: "電気設備",
    });
    expect(payload.context).not.toHaveProperty("workType");
  });

  it("新契約の回答本文・条件・根拠・施行状態を表示用messageへ保持する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          reply: "結論\n回答\n\n根拠\n常時展開しない本文",
          directAnswer: "先に示す正本回答",
          assumptions: ["低圧設備を前提とします。"],
          importantConditions: ["盤を開けるか", "充電中か"],
          citations: [
            {
              lawShort: "安衛則",
              fullName: "労働安全衛生規則",
              articleNum: "第36条",
              articleTitle: "特別教育を必要とする業務",
              issuer: "厚生労働省",
              effectiveDate: "2026-08-09",
              searchHref: "/law-search?q=安衛則第36条",
              egovHref: "https://laws.e-gov.go.jp/law/347M50002000032",
            },
          ],
          confidence: "high",
          effectiveDateStatus: {
            asOf: "2026-08-09",
            status: "current",
            label: "2026年8月9日時点で施行中",
          },
          // 旧aliasが異なっていても正本フィールドを優先する。
          substantiveAnswer: "旧回答",
          conditions: ["旧条件"],
          clarificationQuestion: "最大荷重は？",
          quickReplies: [
            { label: "1トン未満", prompt: "1トン未満" },
            { label: "1トン以上", prompt: "1トン以上" },
          ],
          sources: [
            {
              law: "労働安全衛生規則",
              article: "第36条",
              text: "公式本文の該当箇所",
              url: "https://laws.e-gov.go.jp/law/347M50002000032",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const service = createApiChatService(fetchMock as unknown as typeof fetch);

    const result = await service.sendMessage({
      revision: null,
      question: "フォークリフトの資格は？",
      privacyConfirmed: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        content: "先に示す正本回答",
        directAnswer: "先に示す正本回答",
        assumptions: ["低圧設備を前提とします。"],
        importantConditions: ["盤を開けるか", "充電中か"],
        conditions: ["盤を開けるか", "充電中か"],
        confidence: "high",
        effectiveDateStatus: {
          asOf: "2026-08-09",
          status: "current",
        },
        clarificationQuestion: "最大荷重は？",
      });
      expect(result.data.citations).toHaveLength(1);
      expect(result.data.quickReplies).toHaveLength(2);
      expect(result.data.sources?.[0]).toMatchObject({
        article: "第36条",
      });
    }
  });

  it("旧aliasだけの応答も読み取り互換として表示できる", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          reply: "互換回答",
          substantiveAnswer: "旧本文",
          conditions: ["旧条件"],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const service = createApiChatService(fetchMock as unknown as typeof fetch);

    const result = await service.sendMessage({
      revision: null,
      question: "旧クライアント互換",
      privacyConfirmed: true,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        content: "旧本文",
        directAnswer: "旧本文",
        importantConditions: ["旧条件"],
      },
    });
  });
});
