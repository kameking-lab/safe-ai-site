import { describe, expect, it } from "vitest";
import {
  countDisclaimerCharacters,
  evaluateServiceCopyBudget,
  findPersistentWarningPhrases,
  findForbiddenServiceTerms,
  firstViewportActionLimit,
  type ServiceCopyBudgetSnapshot,
} from "./service-copy-budget";

function snapshot(
  overrides: Partial<ServiceCopyBudgetSnapshot> = {},
): ServiceCopyBudgetSnapshot {
  return {
    route: "/chatbot",
    h1Count: 1,
    introDescriptionLength: 25,
    statusBadgeCount: 1,
    mascotCount: 0,
    visibleCharactersBeforePrimaryAction: 45,
    primaryActionCount: 1,
    secondaryActionCount: 0,
    warningCardCount: 0,
    firstViewportActionCount: 6,
    firstViewportCandidateChipCount: 3,
    persistentWarningPhrases: [],
    chatbotInitialBoxActionCount: 6,
    repeatedNoticeTexts: [],
    visibleMainText: "安衛法AI 作業や設備について、普段の言葉で質問できます。",
    detailsCharacters: 0,
    textOutsideDetails: "個人情報は入力しないでください。",
    answerActionCounts: [3],
    chatbotBoxCount: 2,
    chatbotQuestionChipCount: 3,
    confirmationRequiredCount: 0,
    ...overrides,
  };
}

describe("service-first copy lint / UI budget", () => {
  it("accepts the first-view and answer budgets at their exact limits", () => {
    expect(evaluateServiceCopyBudget(snapshot())).toEqual([]);
  });

  it("detects copy before action, persistent warnings, CTA and chatbot control excess", () => {
    const codes = evaluateServiceCopyBudget(
      snapshot({
        visibleCharactersBeforePrimaryAction: 121,
        primaryActionCount: 2,
        secondaryActionCount: 3,
        warningCardCount: 1,
        answerActionCounts: [2, 4],
        chatbotQuestionChipCount: 5,
        firstViewportActionCount: 8,
        firstViewportCandidateChipCount: 5,
        chatbotInitialBoxActionCount: 7,
        chatbotBoxCount: 4,
      }),
    ).map((issue) => issue.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "copy-before-action",
        "primary-actions",
        "secondary-actions",
        "warning-cards",
        "first-viewport-actions",
        "candidate-chips",
        "answer-actions",
        "chatbot-question-chips",
        "chatbot-initial-actions",
        "chatbot-boxes",
      ]),
    );
  });

  it("enforces three task actions plus only the route-specific candidate budget", () => {
    expect(firstViewportActionLimit("/chatbot")).toBe(6);
    expect(firstViewportActionLimit("/chemical-ra")).toBe(6);
    expect(firstViewportActionLimit("/law-search")).toBe(6);
    expect(firstViewportActionLimit("/risk")).toBe(3);

    expect(
      evaluateServiceCopyBudget(
        snapshot({
          route: "/law-search",
          firstViewportActionCount: 7,
          firstViewportCandidateChipCount: 4,
          chatbotQuestionChipCount: 0,
          chatbotInitialBoxActionCount: 0,
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "candidate-chips", limit: 3 }),
        expect.objectContaining({ code: "first-viewport-actions", limit: 6 }),
      ]),
    );
    expect(
      evaluateServiceCopyBudget(
        snapshot({
          route: "/chemical-ra",
          firstViewportActionCount: 6,
          firstViewportCandidateChipCount: 3,
          chatbotQuestionChipCount: 0,
          chatbotInitialBoxActionCount: 0,
        }),
      ),
    ).toEqual([]);
    expect(
      evaluateServiceCopyBudget(
        snapshot({
          route: "/accidents",
          firstViewportActionCount: 10,
          firstViewportCandidateChipCount: 4,
          chatbotQuestionChipCount: 0,
          chatbotInitialBoxActionCount: 0,
        }),
      ),
    ).toContainEqual(
      expect.objectContaining({ code: "first-viewport-actions", limit: 7 }),
    );
    expect(
      evaluateServiceCopyBudget(
        snapshot({
          route: "/chemical-ra",
          firstViewportActionCount: 13,
          firstViewportCandidateChipCount: 10,
          chatbotQuestionChipCount: 0,
          chatbotInitialBoxActionCount: 0,
        }),
      ).map(({ code }) => code),
    ).toEqual(expect.arrayContaining(["first-viewport-actions", "candidate-chips"]));
    expect(
      evaluateServiceCopyBudget(
        snapshot({
          route: "/risk",
          firstViewportActionCount: 4,
          firstViewportCandidateChipCount: 0,
          chatbotQuestionChipCount: 0,
          chatbotInitialBoxActionCount: 0,
        }),
      ),
    ).toContainEqual(
      expect.objectContaining({ code: "first-viewport-actions", limit: 3 }),
    );
    expect(
      evaluateServiceCopyBudget(
        snapshot({
          route: "/risk",
          firstViewportActionCount: 3,
          firstViewportCandidateChipCount: 1,
          chatbotQuestionChipCount: 0,
          chatbotInitialBoxActionCount: 0,
        }),
      ),
    ).toContainEqual(
      expect.objectContaining({ code: "candidate-chips", limit: 0 }),
    );
  });

  it("detects normal-state verification walls even without a warning marker", () => {
    const text =
      "機械検証済み・改正内容の人手確認待ち。最終人手確認は未登録（確認記録待ち）。";
    const phrases = findPersistentWarningPhrases(text);
    expect(phrases).toEqual(
      expect.arrayContaining(["機械検証済み", "人手確認待ち", "確認記録待ち"]),
    );
    expect(
      evaluateServiceCopyBudget(
        snapshot({
          route: "/laws",
          firstViewportActionCount: 1,
          firstViewportCandidateChipCount: 0,
          chatbotQuestionChipCount: 0,
          chatbotInitialBoxActionCount: 0,
          warningCardCount: 0,
          persistentWarningPhrases: phrases,
          visibleMainText: text,
        }),
      ),
    ).toContainEqual(
      expect.objectContaining({ code: "persistent-warning-copy" }),
    );
  });

  it("finds repeated notices and internal implementation vocabulary", () => {
    const issues = evaluateServiceCopyBudget(
      snapshot({
        repeatedNoticeTexts: ["個人情報は入力しない"],
        visibleMainText: "RAG corpus retrieval provenance hash eval synthetic",
      }),
    );
    expect(issues.filter((issue) => issue.code === "forbidden-term")).toHaveLength(7);
    expect(issues.some((issue) => issue.code === "repeated-notice")).toBe(true);
    expect(findForbiddenServiceTerms("法令本文から検索")).toEqual([]);
    expect(
      findForbiddenServiceTerms("自作評価、第三者検証、Recall@5、MRRを主画面に表示"),
    ).toEqual(expect.arrayContaining(["Recall@", "MRR", "自作評価", "第三者検証"]));
  });

  it("counts disclaimer copy only when it remains outside details", () => {
    const text =
      "本回答は法的助言ではありません。AIは誤る可能性があり保証しません。最終判断は専門家が行ってください。" +
      "個人情報や健康情報は入力しないでください。法令の正本を確認してください。AIの回答は公式見解ではありません。" +
      "最終判断は担当者が行い、必要に応じて公式情報を確認してください。";
    expect(countDisclaimerCharacters(text)).toBeGreaterThan(80);
    expect(
      evaluateServiceCopyBudget(snapshot({ textOutsideDetails: text })).some(
        (issue) => issue.code === "disclaimer-outside-details",
      ),
    ).toBe(true);
  });

  it("allows the dedicated usage-notes page to contain the centralized notices", () => {
    const text = "AIの回答は法的助言や公式見解ではありません。".repeat(8);
    expect(
      evaluateServiceCopyBudget(
        snapshot({ route: "/about/usage-notes", textOutsideDetails: text }),
      ).some((issue) => issue.code === "disclaimer-outside-details"),
    ).toBe(false);
  });

  it("limits repeated confirmation-required wording on one page", () => {
    expect(
      evaluateServiceCopyBudget(snapshot({ confirmationRequiredCount: 2 })),
    ).toContainEqual(
      expect.objectContaining({ code: "confirmation-required", actual: 2 }),
    );
  });
});
