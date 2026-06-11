import { describe, it, expect } from "vitest";
import type { ThemeProgress } from "./progress";
import {
  buildLearningConclusion,
  buildQuizConclusion,
  INTRO_FIRST_THEME_ID,
} from "./learning-conclusion";

function record(over: Partial<ThemeProgress>): ThemeProgress {
  return {
    themeId: "t1",
    themeTitle: "テーマ1",
    totalQuestions: 10,
    correctCount: 10,
    completedCount: 1,
    wrongQuestionIds: [],
    lastAttemptedAt: "2026-06-01T09:00:00.000Z",
    ...over,
  };
}

describe("buildLearningConclusion", () => {
  it("履歴ゼロ → 入門から開始（青・入門コース先頭へ）", () => {
    const c = buildLearningConclusion([]);
    expect(c.kind).toBe("start");
    expect(c.tone).toBe("info");
    if (c.kind === "start") {
      expect(c.actionThemeId).toBe(INTRO_FIRST_THEME_ID);
    }
  });

  it("未完了テーマあり → 学習のこりN件（青）・続きは最終受講の未完了テーマ", () => {
    const c = buildLearningConclusion([
      record({ themeId: "done", correctCount: 10 }),
      record({
        themeId: "older-incomplete",
        correctCount: 4,
        lastAttemptedAt: "2026-06-02T09:00:00.000Z",
      }),
      record({
        themeId: "newest-incomplete",
        correctCount: 7,
        lastAttemptedAt: "2026-06-05T09:00:00.000Z",
      }),
    ]);
    expect(c.kind).toBe("resume");
    expect(c.tone).toBe("info");
    if (c.kind === "resume") {
      expect(c.remaining).toBe(2);
      expect(c.actionThemeId).toBe("newest-incomplete");
    }
  });

  it("正答0のテーマも「のこり」に数える（進捗ボードの進行中と違い取りこぼさない）", () => {
    const c = buildLearningConclusion([record({ correctCount: 0 })]);
    expect(c.kind).toBe("resume");
    if (c.kind === "resume") expect(c.remaining).toBe(1);
  });

  it("全テーマ全問正答 → 全問正答（緑）", () => {
    const c = buildLearningConclusion([
      record({ themeId: "a" }),
      record({ themeId: "b", totalQuestions: 5, correctCount: 5 }),
    ]);
    expect(c.kind).toBe("complete");
    expect(c.tone).toBe("safe");
    if (c.kind === "complete") expect(c.completed).toBe(2);
  });
});

describe("buildQuizConclusion", () => {
  it("回答が残っている間は 回答のこりN問（青）", () => {
    expect(buildQuizConclusion({ total: 10, answered: 3, correct: 3 })).toEqual({
      tone: "info",
      title: "回答のこり",
      value: 7,
      unit: "問",
    });
  });

  it("全問回答・全問正答 → 緑", () => {
    expect(buildQuizConclusion({ total: 10, answered: 10, correct: 10 })).toEqual({
      tone: "safe",
      title: "全問正答",
      value: 10,
      unit: "問",
    });
  });

  it("全問回答・誤答あり → 黄（要対応=再挑戦）", () => {
    expect(buildQuizConclusion({ total: 10, answered: 10, correct: 8 })).toEqual({
      tone: "warning",
      title: "誤答",
      value: 2,
      unit: "問",
    });
  });

  it("設問なしテーマは青の設問なし（ゼロ除算・偽の全問正答を出さない）", () => {
    expect(buildQuizConclusion({ total: 0, answered: 0, correct: 0 })).toEqual({
      tone: "info",
      title: "設問なし",
      value: null,
    });
  });
});
