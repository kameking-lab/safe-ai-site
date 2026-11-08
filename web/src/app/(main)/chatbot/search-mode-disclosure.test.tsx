import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LEGAL_GENERATION_ENABLED, LEGAL_SEARCH_MODE_SUMMARY } from "@/lib/chatbot-generation-policy";
import { ChatbotBody } from "./ChatbotBody";
import ChatbotEvalPage from "../about/chatbot-eval/page";

vi.mock("./ChatbotClientBridge", () => ({ ChatbotClientBridge: () => <textarea aria-label="作業を質問" /> }));

// 2026-11-09 オーナー判断: 法令AIは生成AIで回答する（根拠が無いときも一般的な助言＋根拠未確認の1行）。
describe("法令AIの公開説明（生成回答あり）", () => {
  it("質問入力と短い説明だけを出し、生成停止中の長い注意書きは出さない", () => {
    render(<ChatbotBody />);
    expect(LEGAL_GENERATION_ENABLED).toBe(true);
    expect(screen.getByRole("textbox", { name: "作業を質問" })).toBeTruthy();
    expect(screen.getByText(LEGAL_SEARCH_MODE_SUMMARY)).toBeTruthy();
    expect(screen.queryByText(/質問と履歴を外部生成AIへ送信せず/)).toBeNull();
  });

  it("評価ページは生成回答の機械チェックを現在の方式として表示する", () => {
    render(<ChatbotEvalPage />);
    expect(screen.queryByText(/現在の提供方式：/)).toBeNull();
    const heading = screen.getByRole("heading", { name: "生成回答の自作機械チェック（限定セット）" });
    expect(heading.closest("details")).toBeNull();
  });
});
