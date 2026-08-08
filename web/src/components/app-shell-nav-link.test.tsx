import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppShellNavLink,
  isAppShellPathActive,
} from "./app-shell-nav-link";

let currentPathname = "/laws";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

function NavigationFixture() {
  return (
    <nav aria-label="テストナビ">
      <AppShellNavLink href="/laws">法改正</AppShellNavLink>
      <AppShellNavLink href="/chatbot">安衛法AI</AppShellNavLink>
      <AppShellNavLink href="/">ホーム</AppShellNavLink>
    </nav>
  );
}

describe("AppShellNavLink", () => {
  afterEach(() => {
    cleanup();
    currentPathname = "/laws";
  });

  it("初期pathnameと下位routeだけをactiveにする", () => {
    expect(isAppShellPathActive("/laws", "/laws")).toBe(true);
    expect(isAppShellPathActive("/laws/history", "/laws")).toBe(true);
    expect(isAppShellPathActive("/lawsearch", "/laws")).toBe(false);
    expect(isAppShellPathActive("/chatbot", "/")).toBe(false);

    render(<NavigationFixture />);
    expect(
      screen.getByRole("link", { name: "法改正" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "法改正" }).dataset.navActive,
    ).toBe("true");
    expect(
      screen.getByRole("link", { name: "安衛法AI" }).hasAttribute("aria-current"),
    ).toBe(false);
  });

  it("Next SPA遷移と戻る・進むでactiveを一意に更新する", () => {
    const { rerender } = render(<NavigationFixture />);

    currentPathname = "/chatbot";
    rerender(<NavigationFixture />);
    expect(
      screen.getByRole("link", { name: "安衛法AI" }).getAttribute("aria-current"),
    ).toBe("page");
    for (const link of screen.getAllByRole("link")) {
      if (link.getAttribute("data-nav-active") === "true") {
        expect(link.getAttribute("aria-current")).toBe("page");
      } else {
        expect(link.hasAttribute("aria-current")).toBe(false);
      }
    }
    expect(
      screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") === "page"),
    ).toHaveLength(1);

    currentPathname = "/laws";
    rerender(<NavigationFixture />);
    expect(
      screen.getByRole("link", { name: "法改正" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "安衛法AI" }).dataset.navActive,
    ).toBe("false");
  });
});
