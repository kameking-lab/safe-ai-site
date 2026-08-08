import { describe, expect, it } from "vitest";
import {
  finalizeChatbotResponse,
  isPureClarificationResponse,
} from "@/lib/chatbot-contract";

const baseDraft = {
  requiresHumanReview: true as const,
  sources: [],
  source_type: "rag" as const,
  confidence: "low" as const,
};

describe("answer-first chatbot response contract", () => {
  it("upgrades a stale question-only response into a visible substantive answer", () => {
    const response = finalizeChatbotResponse({
      ...baseDraft,
      answer: "どの作業ですか？",
      clarification: {
        question: "どの作業ですか？",
        options: ["A", "B", "C", "D"],
      },
    });

    expect(response.answer).toMatch(/^結論\n(?!どの作業ですか)/);
    expect(response.answer).toContain("次の質問\nどの作業ですか？");
    expect(response.substantiveAnswer).not.toBe("どの作業ですか？");
    expect(isPureClarificationResponse(response)).toBe(false);
    expect(response.clarificationQuestion).toBe("どの作業ですか？");
    expect(response.quickReplies.map(({ label }) => label)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("derives the structured fields from an answer-first section response", () => {
    const response = finalizeChatbotResponse({
      ...baseDraft,
      answer: [
        "結論",
        "分かる範囲の結論です。［1］",
        "",
        "条件",
        "・条件A",
        "・条件B",
        "・条件C",
        "・条件D",
        "",
        "次の質問",
        "判定を絞るため、設備区分を教えてください。",
      ].join("\n"),
      citations: [],
    });

    expect(response.substantiveAnswer).toBe("分かる範囲の結論です。［1］");
    expect(response.conditions).toEqual(["条件A", "条件B", "条件C"]);
    expect(response.clarificationQuestion).toBe(
      "判定を絞るため、設備区分を教えてください。",
    );
    expect(response.quickReplies).toEqual([]);
  });

  it("keeps emergency and privacy responses free of classification controls", () => {
    const response = finalizeChatbotResponse({
      ...baseDraft,
      source_type: "safety",
      answer: "緊急対応を優先し、直ちに119番へ通報してください。",
      substantiveAnswer: "緊急対応を優先し、直ちに119番へ通報してください。",
      assumptions: [],
      conditions: [],
      citations: [],
      clarificationQuestion: null,
      quickReplies: [],
      safetyKind: "emergency",
    });

    expect(response.clarificationQuestion).toBeNull();
    expect(response.quickReplies).toEqual([]);
  });
});
