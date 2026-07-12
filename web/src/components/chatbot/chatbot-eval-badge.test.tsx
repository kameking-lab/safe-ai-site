import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatbotEvalBadge } from "./chatbot-eval-badge";
import { CHATBOT_EVAL_TRANSPARENCY, evalAccuracyPercent } from "@/data/chatbot-eval-transparency";

/**
 * NIQ-TOOL1 回帰ガード: /chatbot の公開eval透明性表示。
 * 数値がデータソースと一致し、誇張なしの必須注記（自作評価・第三者検証なし・
 * 網を広げれば下がり得る）が必ず表示されることを固定する。
 */
describe("ChatbotEvalBadge", () => {
  it("公開evalの数値をデータソースどおり表示する", () => {
    render(<ChatbotEvalBadge />);
    const e = CHATBOT_EVAL_TRANSPARENCY;
    expect(
      screen.getByText(new RegExp(`${e.scorableQuestions}問中${e.correct}問正答`))
    ).toBeTruthy();
    expect(screen.getByText(new RegExp(`正答率${evalAccuracyPercent(e)}%`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`公開${e.totalQuestions}問eval`))).toBeTruthy();
  });

  it("誇張なしの必須注記を必ず出す（自作・第三者検証なし・下がり得る）", () => {
    render(<ChatbotEvalBadge />);
    expect(screen.getByText(/自作の評価セットで、第三者検証はありません/)).toBeTruthy();
    expect(screen.getByText(/網を広げれば下がり得ます/)).toBeTruthy();
  });

  it("既知の重大欠陥が空なら「現時点でなし」と正直に表示する", () => {
    // 現行のデータソースは knownDefects 空を前提（空でなくなったら別表示のテストを追加）
    expect(CHATBOT_EVAL_TRANSPARENCY.knownDefects.length).toBe(0);
    render(<ChatbotEvalBadge />);
    expect(screen.getByText(/現時点でなし/)).toBeTruthy();
  });

  it("誇大表現（唯一・日本一・最高・完璧）を含まない", () => {
    const { container } = render(<ChatbotEvalBadge />);
    const text = container.textContent ?? "";
    for (const banned of ["日本一", "最高", "完璧", "唯一無二", "業界No"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("英語表示も数値と注記を出す", () => {
    render(<ChatbotEvalBadge isEn />);
    expect(screen.getByText(/self-made evaluation set with no third-party verification/)).toBeTruthy();
  });
});
