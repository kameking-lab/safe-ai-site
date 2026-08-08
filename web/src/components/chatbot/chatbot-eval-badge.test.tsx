import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatbotEvalBadge } from "./chatbot-eval-badge";

describe("ChatbotEvalBadge", () => {
  it("品質情報を専用ページへの1リンクに集約する", () => {
    render(<ChatbotEvalBadge />);
    expect(
      screen.getByRole("link", { name: "品質と出典" }).getAttribute("href"),
    ).toBe("/about/chatbot-eval");
  });

  it("評価数値や方式説明を会話画面向け部品へ載せない", () => {
    const { container } = render(<ChatbotEvalBadge />);
    const text = container.textContent ?? "";
    for (const hidden of ["問中", "機械評価", "第三者検証", "採点", "eval"]) {
      expect(text).not.toContain(hidden);
    }
  });

  it("表示操作は1件だけにする", () => {
    render(<ChatbotEvalBadge />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("誇大表現を含まない", () => {
    const { container } = render(<ChatbotEvalBadge />);
    const text = container.textContent ?? "";
    for (const banned of ["日本一", "最高", "完璧", "唯一無二", "業界No"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("英語表示も専用ページへの1リンクにする", () => {
    render(<ChatbotEvalBadge isEn />);
    expect(
      screen
        .getByRole("link", { name: "Quality and sources" })
        .getAttribute("href"),
    ).toBe("/about/chatbot-eval");
  });
});
