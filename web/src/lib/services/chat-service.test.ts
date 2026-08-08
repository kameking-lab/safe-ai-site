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

  it("同一タブの直近user turnだけをlegacy APIへ渡す", async () => {
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
      history: [
        { id: "a1", role: "assistant", content: "回答本文" },
        { id: "u1", role: "user", content: "電気作業の資格は？" },
      ],
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(init.body)) as ChatApiRequest;
    expect(payload.history).toEqual([
      { role: "user", content: "電気作業の資格は？" },
    ]);
  });

  it("legacy APIの回答本文・根拠・確認候補を表示用messageへ保持する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          reply: "結論\n回答\n\n根拠\n常時展開しない本文",
          substantiveAnswer: "先に示す回答",
          conditions: ["条件1"],
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
        content: "先に示す回答",
        conditions: ["条件1"],
        clarificationQuestion: "最大荷重は？",
      });
      expect(result.data.quickReplies).toHaveLength(2);
      expect(result.data.sources?.[0]).toMatchObject({
        article: "第36条",
      });
    }
  });
});
