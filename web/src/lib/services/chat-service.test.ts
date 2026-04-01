import { describe, expect, it } from "vitest";
import { createMockChatService } from "@/lib/services/chat-service";
import { lawRevisionCores } from "@/data/mock/law-revisions";

describe("chat-service", () => {
  it("createInitialMessages returns one assistant message", () => {
    const service = createMockChatService();
    const messages = service.createInitialMessages();

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("assistant");
  });

  it("sendMessage returns reply in success result", async () => {
    const service = createMockChatService();
    const result = await service.sendMessage({
      revision: lawRevisionCores[0],
      question: "施行日はいつですか？",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.content.length).toBeGreaterThan(0);
    }
  });
});
