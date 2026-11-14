import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatThinking, useChatMascot } from "./chat-thinking";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("chat mascot lifecycle", () => {
  it("starts immediately, researches at 2s, and shows idea for 1.2s from first text only", () => {
    const { result } = renderHook(useChatMascot);
    act(() => result.current.start("one"));
    expect(result.current.feedback?.phase).toBe("thinking");
    act(() => vi.advanceTimersByTime(1_999));
    expect(result.current.feedback?.phase).toBe("thinking");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.feedback?.phase).toBe("researching");
    act(() => result.current.answer("one"));
    expect(result.current.feedback?.phase).toBe("idea");
    act(() => vi.advanceTimersByTime(800));
    act(() => result.current.answer("one"));
    act(() => vi.advanceTimersByTime(399));
    expect(result.current.feedback?.phase).toBe("idea");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.feedback).toBeNull();
    act(() => result.current.answer("one"));
    expect(result.current.feedback).toBeNull();
  });

  it("skips research for fast answers and clears timers on cancel, failure, clear or replacement", () => {
    const { result, unmount } = renderHook(useChatMascot);
    act(() => result.current.start("fast"));
    act(() => vi.advanceTimersByTime(50));
    act(() => result.current.answer("fast"));
    expect(result.current.feedback?.phase).toBe("idea");
    act(() => result.current.cancel("fast"));
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.feedback).toBeNull();
    act(() => result.current.start("new"));
    act(() => result.current.answer("fast"));
    act(() => result.current.cancel("fast"));
    expect(result.current.feedback).toEqual({ id: "new", phase: "thinking" });
    act(() => result.current.cancel());
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.start("unmount"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["thinking", "researching", "idea"] as const)("provides still and animated formats for %s", phase => {
    const { container } = render(<ChatThinking phase={phase} />);
    expect([...container.querySelectorAll("source")].map(source => [source.media, source.srcset, source.type])).toEqual([
      ["(prefers-reduced-motion: reduce)", `/mascot/chat-${phase}-still.webp`, "image/webp"],
      ["(prefers-reduced-motion: reduce)", `/mascot/chat-${phase}-still.png`, "image/png"],
      ["", `/mascot/chat-${phase}.webp`, "image/webp"],
    ]);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(`/mascot/chat-${phase}.gif`);
  });
});
