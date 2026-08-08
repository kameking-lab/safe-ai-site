import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
} from "@/lib/chat-history";

describe("chat history privacy boundary", () => {
  beforeEach(() => {
    clearChatHistory();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("keeps conversation text in the current tab memory only", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const messages = [
      { id: "u1", role: "user" as const, content: "足場の手すりは何センチ？" },
    ];

    saveChatHistory(messages);

    expect(loadChatHistory()).toEqual(messages);
    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("anzen_chatbot_active_session_v1")).toBeNull();
    expect(window.localStorage.getItem("chatbot_history_v2")).toBeNull();
  });

  it("removes legacy persisted conversation values when cleared", () => {
    window.localStorage.setItem("anzen_chatbot_active_session_v1", "legacy");
    window.localStorage.setItem("chatbot_history_v2", "legacy");

    clearChatHistory();

    expect(loadChatHistory()).toBeNull();
    expect(window.localStorage.getItem("anzen_chatbot_active_session_v1")).toBeNull();
    expect(window.localStorage.getItem("chatbot_history_v2")).toBeNull();
  });
});
