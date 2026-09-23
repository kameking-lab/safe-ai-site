// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollPositionRestorer } from "./scroll-position-restorer";

let pathname = "/goods";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

describe("ScrollPositionRestorer", () => {
  beforeEach(() => {
    pathname = "/goods";
    window.history.replaceState({}, "", "/goods");
    window.sessionStorage.clear();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 640,
    });
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    };
    window.scrollTo = vi.fn();
  });

  it("stores route scroll and restores it after back navigation", () => {
    const view = render(<ScrollPositionRestorer />);
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(window.sessionStorage.getItem("anzen-ai:scroll:/goods")).toBe("640");

    window.sessionStorage.setItem(
      "anzen-ai:scroll:/materials/safety-images?lang=vi#library",
      "910",
    );
    window.history.replaceState(
      {},
      "",
      "/materials/safety-images?lang=vi#library",
    );
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 910, left: 0 });
    view.unmount();
  });

  it("keeps query and hash history entries separate", () => {
    render(<ScrollPositionRestorer />);
    window.sessionStorage.setItem("anzen-ai:scroll:/goods?category=helmet", "330");
    window.history.replaceState({}, "", "/goods?category=helmet");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 330, left: 0 });
    expect(window.sessionStorage.getItem("anzen-ai:scroll:/goods")).toBe("640");
  });
});
