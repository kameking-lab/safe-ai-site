import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetTransientChatNavigationForTests,
  beginTransientChatNavigation,
  consumeTransientChatNavigation,
} from "./transient-chat-navigation";

afterEach(() => {
  __resetTransientChatNavigationForTests();
  vi.restoreAllMocks();
});

describe("transient chatbot navigation capability", () => {
  it("contains no user data and can be consumed only once", () => {
    beginTransientChatNavigation();
    expect(consumeTransientChatNavigation()).toBe(true);
    expect(consumeTransientChatNavigation()).toBe(false);
  });

  it("fails closed after its short lifetime", () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(1_000).mockReturnValue(16_001);
    beginTransientChatNavigation();
    expect(consumeTransientChatNavigation()).toBe(false);
  });
});
