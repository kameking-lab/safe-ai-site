import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LEGAL_GENERATION_ENABLED, LEGAL_SEARCH_MODE_SUMMARY } from "@/lib/chatbot-generation-policy";
import { ChatbotBody } from "./ChatbotBody";
import ChatbotEvalPage from "../about/chatbot-eval/page";
import genqualitySnapshot from "@/data/chatbot-genquality-latest.json";

vi.mock("./ChatbotClientBridge", () => ({ ChatbotClientBridge: () => <textarea aria-label="作業を質問" /> }));

describe("法令検索・定型回答の公開説明", () => {
  it("質問入力を残し、短い提供方式から根拠確認の説明を開ける", () => {
    render(<ChatbotBody />);
    expect(LEGAL_GENERATION_ENABLED).toBe(false);
    expect(screen.getByRole("textbox", { name: "作業を質問" })).toBeTruthy();
    expect(screen.getByText(LEGAL_SEARCH_MODE_SUMMARY)).toBeTruthy();
    const summary = screen.getByText("回答の仕組み・評価方法");
    const detail = summary.closest("details")!;
    expect(detail.closest("section")).toBeNull();
    expect(detail.open).toBe(false);
    fireEvent.click(summary);
    expect(detail.open).toBe(true);
    expect(detail.textContent).toContain("質問と履歴を外部生成AIへ送信せず");
    expect(screen.getByRole("link", { name: "評価方法と確認範囲" }).getAttribute("href")).toBe("/about/chatbot-eval");
  });

  it("現在の提供方式と測定日時を表示し、過去の生成回答率は閉じた参考記録に保持する", () => {
    render(<ChatbotEvalPage />);
    expect(screen.getByText(/現在の提供方式：/).textContent).toContain(LEGAL_SEARCH_MODE_SUMMARY);
    expect(screen.getByText(/現在の本番回答を再測定した値ではありません/)).toBeTruthy();
    const history = screen.getByText(/過去の生成回答チェック（/).closest("details")!;
    expect(history.open).toBe(false);
    expect(history.textContent).toContain(genqualitySnapshot.date);
    expect(screen.getByRole("heading", { name: "生成回答の自作機械チェック（限定セット）" }).closest("details")).toBe(history);
    fireEvent.click(history.querySelector("summary")!);
    expect(history.open).toBe(true);
    expect(screen.getByRole("heading", { name: "生成回答の自作機械チェック（限定セット）" })).toBeTruthy();
    expect(history.textContent).toContain("現在の検索・定型回答の正確さや安全性を示しません");
  });
});
