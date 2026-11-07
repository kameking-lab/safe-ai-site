import { render as rtlRender, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { TransientQueryBridgeProvider } from "@/components/home-safety-cockpit/transient-query-bridge";
import { HomeRelaunch } from "./home-relaunch";
import { HomeMascotToolbox } from "./home-mascot-toolbox";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

function render(ui: ReactElement) {
  return rtlRender(<TransientQueryBridgeProvider>{ui}</TransientQueryBridgeProvider>);
}

function serviceItem(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { level: 3, name });
  const item = heading.closest("li");
  if (!item) throw new Error(`${name} card is missing`);
  return item;
}

const noNews: HomeLatestAccidentNews = {
  status: "unavailable",
  checkedAt: "2026-09-25T00:00:00.000Z",
  items: [],
  sourceLabel: "報道RSS",
  sourceUrl: "https://news.google.com/",
  message: "取得不可",
};

describe("HomeRelaunch", () => {
  it("見出し階層と主要な1クリック導線をサーバー描画する", () => {
    render(<HomeRelaunch mascotContent={<HomeMascotToolbox latestNews={noNews} />} />);

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

    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(hero).not.toBeNull();
    expect(hero?.querySelector("[data-mascot-toolbox]")).not.toBeNull();
    expect(within(hero!).getByRole("region", { name: "チワワと試す5機能" })).toBeDefined();
    expect(within(hero!).getByRole("link", { name: /安衛法AI/ }).getAttribute("href")).toBe("/chatbot");
    expect(within(hero!).getByRole("link", { name: /化学物質RA/ }).getAttribute("href")).toBe("/chemical-ra");
    expect(within(hero!).getByRole("link", { name: /安全技術を探す/ }).getAttribute("href")).toBe("/resources/netis-safety");
  });

  it("LCP画像、タップ領域、フォーカス、動きの低減を明示する", () => {
    render(<HomeRelaunch />);

    const desktopMascot = screen.getByRole("img", {
      name: "吹き出しと一緒に相談を案内する安全AIポータルのチワワ",
    });
    expect(desktopMascot.getAttribute("sizes")).toContain("max-width: 1023px");
    expect(desktopMascot.getAttribute("loading")).not.toBe("lazy");

    const primaryLink = screen.getByRole("link", { name: /安全技術を探す/ });
    expect(primaryLink.className).toContain("min-h-11");
    expect(primaryLink.className).toContain("focus-visible:ring-4");

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

  it("5機能をチワワの欄で試し、下段にフォームを重複させない", () => {
    render(<HomeRelaunch mascotContent={<HomeMascotToolbox latestNews={noNews} />} />);

    expect(screen.queryByRole("heading", { name: "5つの機能をすぐ使う" })).toBeNull();
    expect(document.querySelectorAll("[data-home-mascot-five-tools]")).toHaveLength(1);

    const cards = screen
      .getByRole("heading", { level: 2, name: "仕事から選ぶ、9つの主機能" })
      .closest("section")
      ?.querySelectorAll(":scope ul > li > a");
    expect(cards).toHaveLength(9);

    const chat = document.getElementById("mascot-chat")!;
    expect(chat.id).toBe("mascot-chat");
    expect(within(chat).getByRole("textbox", { name: "安衛法AIへの質問" })).toBeDefined();
    expect(within(chat).getByRole("button", { name: "質問する" })).toBeDefined();

    const chemical = document.getElementById("mascot-chemical")!;
    expect(chemical.id).toBe("mascot-chemical");
    expect(within(chemical).getByRole("combobox", { name: "化学物質を検索" })).toBeDefined();

    const accident = document.getElementById("mascot-accident")!;
    expect(within(accident).getByRole("link").getAttribute("href")).toBe("/accident-news");
    const laws = document.getElementById("mascot-laws")!;
    expect(within(laws).getByRole("link").getAttribute("href")).toContain("/laws#");

    const slides = document.getElementById("mascot-slides")!;
    expect(slides.id).toBe("mascot-slides");
    expect(
      within(slides)
        .getByRole("link", { name: /安全スライド/ })
        .getAttribute("href"),
    ).toBe("/training/safety-seminars/safety-management-basics-osh-law#seminar-player");

    const interactive = "a, button, input, textarea, select, [role='combobox']";
    for (const link of document.querySelectorAll<HTMLElement>(".hs-card")) {
      expect(link.querySelector(interactive)).toBeNull();
    }
    for (const control of document.querySelectorAll<HTMLElement>("[data-home-mascot-five-tools] :is(button, input, textarea)")) {
      expect(control.closest("a, button:not(:scope)")).toBeNull();
    }
    expect(document.querySelectorAll("#mascot-chat, #mascot-chemical, #mascot-slides")).toHaveLength(3);
    expect(document.querySelectorAll("[data-home-chat-quick-ask], [data-home-chemical-quick-search]")).toHaveLength(2);
    expect(serviceItem("安衛法AI").querySelector("form")).toBeNull();
    expect(serviceItem("化学物質RA").querySelector("form")).toBeNull();
  });
});
