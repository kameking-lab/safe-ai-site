import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAutomationSamples } from "@/config/feature-portfolio";
import { AutomationExamplesContent } from "./automation-examples-content";

describe("AutomationExamplesContent", () => {
  beforeEach(() => {
    vi.stubEnv(
      "AUTOMATION_CONSULT_RECIPIENTS",
      "primary@gmail.com,audit@outlook.com",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it("主力機能と区別したSafety Labs・自動化サンプルとして表示する", () => {
    render(<AutomationExamplesContent />);

    expect(
      screen.getByRole("heading", { level: 1, name: "安全業務の自動化サンプル" }),
    ).toBeDefined();
    expect(screen.getByText("Safety Labs")).toBeDefined();
    expect(screen.getByText("自動化サンプル")).toBeDefined();
    expect(
      screen.getByText(/正式な主力機能や導入済みシステムではありません/),
    ).toBeDefined();
  });

  it("各サンプルに利用可否・必要設定・データ扱いと実在ルートへのリンクを表示する", () => {
    const { container } = render(<AutomationExamplesContent />);

    for (const feature of getAutomationSamples()) {
      const heading = screen.getByRole("heading", {
        level: 3,
        name: feature.label,
      });
      const card = heading.closest("article");
      expect(card, `${feature.id} のカードがない`).not.toBeNull();
      const scoped = within(card!);
      expect(scoped.getByText("できること")).toBeDefined();
      expect(scoped.getByText("できないこと")).toBeDefined();
      expect(scoped.getByText("必要な外部設定")).toBeDefined();
      expect(scoped.getByText("データの扱い")).toBeDefined();
      expect(
        scoped.getByRole("link", {
          name: `${feature.automationSample?.maturityLabel}を試す`,
        }).getAttribute("href"),
      ).toBe(feature.route);
    }

    expect(container.querySelectorAll("article").length).toBe(
      getAutomationSamples().length,
    );
  });

  it("メール相談受付中と明示し、Webフォームと混同しない", () => {
    const { container } = render(<AutomationExamplesContent />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "メール相談受付中",
      }),
    ).toBeDefined();
    expect(screen.getByText(/お使いのメールアプリから相談できます/)).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "メールで相談する" })
        .getAttribute("href"),
    ).toBe("/contact/automation-email");
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByText("今すぐ相談")).toBeNull();
    expect(screen.queryByText("Webフォーム受付中")).toBeNull();
  });

  it("操作リンクは44px相当の最小高さとキーボードフォーカス表示を持つ", () => {
    render(<AutomationExamplesContent />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("min-h-11");
      expect(link.className).toMatch(/focus-visible:ring-(?:2|4)/);
    }
  });
});
