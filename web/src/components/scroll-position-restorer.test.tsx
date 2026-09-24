// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollPositionRestorer } from "./scroll-position-restorer";
import { preserveNavigationScroll } from "@/lib/preserve-navigation-scroll";

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

  it("preserves the home section across a Next client link and return", () => {
    pathname = "/";
    window.history.replaceState({}, "", "/");
    const view = render(<ScrollPositionRestorer />);
    const link = document.createElement("a");
    link.href = "/goods";
    document.body.append(link);
    act(() => link.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 })));
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(window.sessionStorage.getItem("anzen-ai:scroll:/")).toBe("640");

    pathname = "/goods";
    window.history.replaceState({}, "", "/goods");
    view.rerender(<ScrollPositionRestorer />);
    const homeLink = document.createElement("a");
    homeLink.href = "/";
    document.body.append(homeLink);
    act(() => homeLink.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 })));
    pathname = "/";
    window.history.replaceState({}, "", "/");
    view.rerender(<ScrollPositionRestorer />);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 640, left: 0 });
    link.remove();
    homeLink.remove();
    view.unmount();
  });

  it.each(["/chatbot", "/chemical-ra#chemical-ra-start"])(
    "preserves the home input position across a form navigation to %s",
    (destination) => {
      pathname = "/";
      window.history.replaceState({}, "", "/");
      const view = render(<ScrollPositionRestorer />);
      act(() => preserveNavigationScroll());
      Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
      act(() => window.dispatchEvent(new Event("scroll")));
      expect(window.sessionStorage.getItem("anzen-ai:scroll:/")).toBe("640");
      pathname = destination.split("#")[0]!;
      window.history.replaceState({}, "", destination);
      view.rerender(<ScrollPositionRestorer />);
      window.history.replaceState({}, "", "/");
      act(() => window.dispatchEvent(new PopStateEvent("popstate")));
      pathname = "/";
      view.rerender(<ScrollPositionRestorer />);
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 640, left: 0 });
      view.unmount();
    },
  );
});
