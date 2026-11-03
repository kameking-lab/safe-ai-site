import { beforeEach, describe, expect, it } from "vitest";
import type { ExamQuestion } from "@/lib/exam-library-model";
import { isAppLocalStorageKey } from "@/lib/local-data-registry";
import {
  EXAM_PROGRESS_MEMO_MAX_LENGTH,
  answerResult,
  clearExamProgress,
  createExamProgress,
  examProgressKey,
  parseExamProgress,
  readExamProgressRaw,
  resetAnswers,
  saveExamProgress,
  summarizeExamProgress,
  wrongQuestionIds,
  type ExamSessionAnswers,
} from "./exam-library-progress";

const EXAM_ID = "lckohyo-TEST01";

function question(
  number: number,
  overrides: Partial<ExamQuestion> = {},
): ExamQuestion {
  return {
    id: `${EXAM_ID}-q${number}`,
    number,
    text: `問 ${number}`,
    images: [`/exam-library/${EXAM_ID}/q${number}.webp`],
    correctChoice: 3,
    choiceCount: 5,
    answerAuthority: "official",
    ...overrides,
  };
}

const questions: ExamQuestion[] = [
  question(1),
  question(2),
  question(3, { correctChoice: null, answerAuthority: "unconfirmed" }),
  question(4, { correctChoice: null, choiceCount: 0, answerAuthority: "descriptive" }),
];

describe("exam-library-progress", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses a device-only key covered by the app's delete-all registry", () => {
    expect(examProgressKey(EXAM_ID)).toBe(`safe-ai:exam-library:v1:${EXAM_ID}`);
    expect(isAppLocalStorageKey(examProgressKey(EXAM_ID))).toBe(true);
  });

  it("grades only official answers and never grades unconfirmed or descriptive items", () => {
    const answers: ExamSessionAnswers = {
      [questions[0].id]: { choice: 3, memo: "", submitted: true },
      [questions[1].id]: { choice: 1, memo: "", submitted: true },
      [questions[2].id]: { choice: 2, memo: "", submitted: true },
      [questions[3].id]: { choice: null, memo: "下書き", submitted: true },
    };
    expect(answerResult(questions[0], answers[questions[0].id])).toBe("correct");
    expect(answerResult(questions[1], answers[questions[1].id])).toBe("incorrect");
    expect(answerResult(questions[2], answers[questions[2].id])).toBe("unscored");
    expect(answerResult(questions[3], answers[questions[3].id])).toBe("unscored");
    expect(answerResult(questions[0], undefined)).toBe("unanswered");

    expect(summarizeExamProgress(questions, answers)).toEqual({
      total: 4,
      answered: 4,
      correct: 1,
      incorrect: 1,
      unscored: 2,
      scorable: 2,
    });
    expect(wrongQuestionIds(questions, answers)).toEqual([questions[1].id]);
  });

  it("resets only the retried answers and keeps memos", () => {
    const answers: ExamSessionAnswers = {
      [questions[0].id]: { choice: 3, memo: "", submitted: true },
      [questions[1].id]: { choice: 1, memo: "", submitted: true },
      [questions[3].id]: { choice: null, memo: "メモ", submitted: true },
    };
    const next = resetAnswers(answers, [questions[1].id, questions[3].id]);
    expect(next[questions[0].id]).toEqual(answers[questions[0].id]);
    expect(next[questions[1].id]).toBeUndefined();
    expect(next[questions[3].id]).toEqual({ choice: null, memo: "メモ", submitted: false });
    expect(answers[questions[1].id]?.submitted).toBe(true);
  });

  it("round-trips saved progress and re-grades from current question data", () => {
    const answers: ExamSessionAnswers = {
      [questions[0].id]: { choice: 3, memo: "", submitted: true },
      [questions[1].id]: { choice: 1, memo: "", submitted: true },
      untouched: { choice: null, memo: "", submitted: false },
    };
    const progress = createExamProgress(
      EXAM_ID,
      answers,
      questions[1].id,
      new Date("2026-09-11T00:00:00Z"),
    );
    expect(Object.keys(progress.answers)).toEqual([questions[0].id, questions[1].id]);
    expect(saveExamProgress(window.localStorage, progress)).toBe(true);

    const restored = parseExamProgress(
      readExamProgressRaw(window.localStorage, EXAM_ID),
      EXAM_ID,
      questions,
    );
    expect(restored?.lastQuestionId).toBe(questions[1].id);
    expect(restored?.updatedAt).toBe("2026-09-11T00:00:00.000Z");
    expect(restored && summarizeExamProgress(questions, restored.answers).correct).toBe(1);

    clearExamProgress(window.localStorage, EXAM_ID);
    expect(readExamProgressRaw(window.localStorage, EXAM_ID)).toBeNull();
  });

  it("drops foreign, unknown, out-of-range and corrupted saved values", () => {
    expect(parseExamProgress("{broken", EXAM_ID, questions)).toBeNull();
    expect(parseExamProgress(null, EXAM_ID, questions)).toBeNull();
    expect(
      parseExamProgress(
        JSON.stringify({ version: 1, examId: "lckohyo-OTHER", answers: {} }),
        EXAM_ID,
        questions,
      ),
    ).toBeNull();
    expect(
      parseExamProgress(JSON.stringify({ version: 2, examId: EXAM_ID, answers: {} }), EXAM_ID, questions),
    ).toBeNull();

    const restored = parseExamProgress(
      JSON.stringify({
        version: 1,
        examId: EXAM_ID,
        lastQuestionId: "not-a-question",
        updatedAt: "invalid",
        answers: {
          [questions[0].id]: { choice: 9, submitted: true },
          [questions[1].id]: { choice: 2, submitted: "yes" },
          [questions[3].id]: { memo: "x".repeat(EXAM_PROGRESS_MEMO_MAX_LENGTH + 10), submitted: true },
          [`${EXAM_ID}-q999`]: { choice: 1, submitted: true },
        },
      }),
      EXAM_ID,
      questions,
    );
    expect(restored).not.toBeNull();
    // 範囲外の番号は未回答に戻す（誤った正誤を表示しない）
    expect(restored?.answers[questions[0].id]).toBeUndefined();
    expect(restored?.answers[questions[1].id]).toEqual({ choice: 2, memo: "", submitted: false });
    expect(restored?.answers[questions[3].id]?.memo).toHaveLength(EXAM_PROGRESS_MEMO_MAX_LENGTH);
    expect(restored?.answers[`${EXAM_ID}-q999`]).toBeUndefined();
    expect(restored?.lastQuestionId).toBeNull();
    expect(restored?.updatedAt).toBe("");
  });

  it("reports failure instead of throwing when storage is unavailable", () => {
    const failing = {
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      getItem: () => {
        throw new Error("SecurityError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    } as unknown as Storage;
    expect(saveExamProgress(failing, createExamProgress(EXAM_ID, {}, null))).toBe(false);
    expect(readExamProgressRaw(failing, EXAM_ID)).toBeNull();
    expect(() => clearExamProgress(failing, EXAM_ID)).not.toThrow();
  });
});
