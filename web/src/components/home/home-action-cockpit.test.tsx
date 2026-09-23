import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransientQueryBridgeProvider } from "@/components/home-safety-cockpit/transient-query-bridge";
import { HomeActionCockpit } from "./home-action-cockpit";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("HomeActionCockpit", () => {
  it("トップから質問・化学物質検索・公開教材へ直接進める", () => {
    render(
      <TransientQueryBridgeProvider>
        <HomeActionCockpit />
      </TransientQueryBridgeProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "労働安全衛生法AI" }),
    ).toBeDefined();
    expect(
      screen.getByRole("textbox", { name: "安衛法AIへの質問" }),
    ).toBeDefined();
    expect(
      screen.getByRole("combobox", { name: "化学物質を検索" }),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: /スライドを見る/ }).getAttribute("href"),
    ).toBe("/training/safety-seminars/safety-management-basics-osh-law#seminar-player");
    const fiveTools = screen.getByRole("navigation", { name: "チワワと試す5機能" });
    expect(within(fiveTools).getAllByRole("link")).toHaveLength(5);
    expect(within(fiveTools).getByRole("link", { name: "死亡事故速報" }).getAttribute("href")).toBe("/accident-news");
    expect(within(fiveTools).getByRole("link", { name: "法改正" }).getAttribute("href")).toBe("/laws");
  });
});
