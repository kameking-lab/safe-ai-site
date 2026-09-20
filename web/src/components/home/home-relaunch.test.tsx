import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeRelaunch } from "./home-relaunch";

describe("HomeRelaunch", () => {
  it("見出し階層と主要な1クリック導線をサーバー描画する", () => {
    render(<HomeRelaunch />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "小さな気づきが、大きな事故を防ぐ。",
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "仕事から選ぶ、9つの主機能",
      }),
    ).toBeDefined();

    const quickNav = screen.getByRole("navigation", {
      name: "すぐに使う主要機能",
    });
    expect(
      within(quickNav)
        .getByRole("link", { name: /安衛法AIを開く/ })
        .getAttribute("href"),
    ).toBe("/chatbot");
    expect(
      within(quickNav)
        .getByRole("link", { name: /化学物質RAを開く/ })
        .getAttribute("href"),
    ).toBe("/chemical-ra");
    expect(
      within(quickNav)
        .getByRole("link", { name: /安全技術を探す/ })
        .getAttribute("href"),
    ).toBe("/resources/netis-safety");
  });

  it("LCP画像、タップ領域、フォーカス、動きの低減を明示する", () => {
    render(<HomeRelaunch />);

    const mascot = screen.getByRole("img", {
      name: /案内する安全AIポータルのチワワ/,
    });
    expect(mascot.getAttribute("sizes")).toContain("max-width: 1023px");
    expect(mascot.getAttribute("loading")).not.toBe("lazy");

    const primaryLink = screen.getByRole("link", { name: /安衛法AIを開く/ });
    expect(primaryLink.className).toContain("min-h-14");
    expect(primaryLink.className).toContain("focus-visible:ring-4");
    expect(primaryLink.className).toContain(
      "motion-safe:hover:-translate-y-0.5",
    );

    const serviceLink = screen
      .getAllByRole("link", { name: /事故分析ダッシュボード/ })
      .find((link) => link.className.includes("hs-card"));
    expect(serviceLink).toBeDefined();
    expect(serviceLink?.className).toContain("hs-card");
    const componentCss = Array.from(document.querySelectorAll("style"))
      .map((style) => style.textContent ?? "")
      .join("\n");
    expect(componentCss).toContain(".hs-card:focus-visible");
    expect(componentCss).toContain(".hs-card:hover");
    expect(componentCss).toContain("@media(prefers-reduced-motion:reduce)");
    expect(
      within(
        screen.getByRole("navigation", { name: "9つの主機能へすぐ移動" }),
      ).getAllByRole("link"),
    ).toHaveLength(9);
  });

  it("優先機能を主機能一覧より前に配置できる", () => {
    render(
      <HomeRelaunch
        priorityContent={<div data-testid="priority-content">優先機能</div>}
      />,
    );

    const priority = screen.getByTestId("priority-content");
    const directory = screen.getByRole("heading", {
      name: "仕事から選ぶ、9つの主機能",
    });
    expect(
      priority.compareDocumentPosition(directory) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
