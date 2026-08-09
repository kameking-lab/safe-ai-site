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

    expect(response.answer.startsWith(response.directAnswer)).toBe(true);
    expect(response.answer).toContain("次の質問\nどの作業ですか？");
    expect(response.directAnswer).toBe(response.substantiveAnswer);
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
    expect(response.directAnswer).toBe("分かる範囲の結論です。［1］");
    expect(response.importantConditions).toEqual(["条件A", "条件B", "条件C"]);
    expect(response.conditions).toEqual(["条件A", "条件B", "条件C"]);
    expect(response.clarificationQuestion).toBe(
      "判定を絞るため、設備区分を教えてください。",
    );
    expect(response.quickReplies).toEqual([]);
    expect(response.effectiveDateStatus).toEqual({
      asOf: null,
      status: "unknown",
      label: "施行状態を公式資料から特定できていません。",
    });
  });

  it("prefers canonical fields and synchronizes compatibility aliases", () => {
    const response = finalizeChatbotResponse({
      ...baseDraft,
      answer: "旧回答",
      directAnswer: "盤を開けて測定する場合の直接回答です。［1］",
      substantiveAnswer: "旧回答",
      importantConditions: [" 充電状態 ", "電圧区分", "充電状態"],
      conditions: ["旧条件"],
      citations: [],
      sources: [
        {
          law: "労働安全衛生規則",
          article: "第346条",
          text: "テスト用条文",
          asOf: "2026-08-09",
          applicationStatus: "current",
        },
      ],
    });

    expect(response.answer).toBe(response.directAnswer);
    expect(response.substantiveAnswer).toBe(response.directAnswer);
    expect(response.importantConditions).toEqual(["充電状態", "電圧区分"]);
    expect(response.conditions).toBe(response.importantConditions);
    expect(response.effectiveDateStatus).toEqual({
      asOf: "2026-08-09",
      status: "current",
      label: "2026-08-09時点で施行中として確認済みです。",
    });
  });

  it("never emits only a question or chips and limits clarification to one", () => {
    const response = finalizeChatbotResponse({
      ...baseDraft,
      answer: "どれですか？",
      clarificationQuestion: "見るだけですか？\n盤を開けますか？",
      quickReplies: [
        { label: "見るだけ", prompt: "見るだけ" },
        { label: "盤を開ける", prompt: "盤を開ける" },
        { label: "配線する", prompt: "配線する" },
        { label: "その他", prompt: "その他" },
      ],
    });

    expect(response.directAnswer).toContain("確認対象を特定できない");
    expect(response.directAnswer).not.toMatch(/^[^。\n]*[？?]$/);
    expect(response.answer.startsWith(response.directAnswer)).toBe(true);
    expect(response.clarificationQuestion).toBe("見るだけですか？");
    expect(response.quickReplies).toHaveLength(3);
    expect(isPureClarificationResponse(response)).toBe(false);
  });

  it("keeps an explicit effective-date status but fills an empty label", () => {
    const response = finalizeChatbotResponse({
      ...baseDraft,
      answer: "対象日版の公式本文がないため、法的な要否は保留します。",
      citations: [],
      effectiveDateStatus: {
        asOf: "2026-08-09",
        status: "unknown",
        label: "",
      },
    });

    expect(response.directAnswer).toContain("公式本文がない");
    expect(response.effectiveDateStatus).toEqual({
      asOf: "2026-08-09",
      status: "unknown",
      label: "2026-08-09時点で施行状態を公式資料から特定できていません。",
    });
  });

  it("projects response context to the nine-key public contract", () => {
    const response = finalizeChatbotResponse({
      ...baseDraft,
      answer: "電気設備の点検条件を説明します。",
      context: {
        topicDomain: "electrical",
        workAction: "tester-measurement",
        equipment: "電気設備",
        workType: "電気作業",
        height: "2m以上",
        load: "最大荷重1.5t",
        qualification: "特別教育",
        role: "作業指揮者",
        targetDate: "2026-08-09",
        targetDateEnd: "2026-08-31",
        targetDatePrecision: "month",
        confirmedChoices: ["見るだけ", "山田太郎"],
      } as never,
    });

    expect(response.context).toEqual({
      topicDomain: "electrical",
      workAction: "tester-measurement",
      equipment: "電気設備",
      roleType: "work-leader",
      qualificationType: "special-education",
      workDate: "2026-08-09",
      confirmedChoices: ["見るだけ", "高さ2m以上", "最大荷重1.5t"],
    });
    expect(JSON.stringify(response.context)).not.toContain("山田太郎");
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
