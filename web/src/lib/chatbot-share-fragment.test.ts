import { describe, expect, it } from "vitest";
import {
  buildChatbotFragmentShareUrl,
  decodeChatbotShareFragment,
  encodeChatbotShareFragment,
  type SharedChatMessage,
} from "./chatbot-share-fragment";

describe("chatbot URL sharing privacy boundary", () => {
  const messages: SharedChatMessage[] = [
    { r: "u", c: "田中さんの現場で足場の手すりは何センチ？" },
    { r: "a", c: "回答", s: [{ l: "労働安全衛生規則", a: "第563条" }] },
  ];

  it("never places a question or answer in a URL or fragment", () => {
    expect(encodeChatbotShareFragment(messages)).toBeNull();
    expect(
      buildChatbotFragmentShareUrl(
        "https://www.anzen-ai-portal.jp",
        messages,
      ),
    ).toBeNull();
  });

  it("does not decode legacy or malformed conversation fragments", () => {
    expect(decodeChatbotShareFragment("#v1=legacy-payload")).toBeNull();
    expect(decodeChatbotShareFragment("#v1=not-valid-base64!")).toBeNull();
  });
});
