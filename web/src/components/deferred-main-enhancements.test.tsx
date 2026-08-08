import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeferredMainEnhancements } from "./deferred-main-enhancements";

let currentPathname = "/about";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function DeferredTestDouble() {
      return <div data-testid="deferred-enhancement" />;
    },
}));

describe("DeferredMainEnhancements offline boundary", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    currentPathname = "/about";
  });

  it("does not request deferred chunks while offline and resumes on online", () => {
    vi.useFakeTimers();
    const online = vi.spyOn(window.navigator, "onLine", "get");
    online.mockReturnValue(false);

    render(<DeferredMainEnhancements />);
    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.queryAllByTestId("deferred-enhancement")).toHaveLength(0);

    online.mockReturnValue(true);
    fireEvent(window, new Event("online"));
    expect(screen.getAllByTestId("deferred-enhancement")).toHaveLength(2);
  });

  it("chatbotと主力作業画面では遅延後も固定UIをmountしない", () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);

    for (const pathname of [
      "/chatbot",
      "/chemical-ra",
      "/ky/paper",
      "/law-search",
      "/risk",
      "/services/automation",
      "/signage",
      "/training/visual-ky/example",
    ]) {
      currentPathname = pathname;
      const view = render(<DeferredMainEnhancements />);
      act(() => vi.advanceTimersByTime(30_000));
      expect(
        screen.queryAllByTestId("deferred-enhancement"),
        pathname,
      ).toHaveLength(0);
      view.unmount();
    }
  });
});
