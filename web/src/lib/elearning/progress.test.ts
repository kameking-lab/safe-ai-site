/**
 * P0-014 (usability-audit-day3-2026-05-24):
 * Eラーニング 進捗 localStorage ストアのユニットテスト。
 */

import { describe, expect, test, beforeEach } from "vitest";
import {
  buildProgressSummary,
  clearAllProgress,
  loadProgressList,
  recordThemeAttempt,
} from "./progress";

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
  clearAllProgress();
});

describe("recordThemeAttempt + loadProgressList", () => {
  test("空状態で loadProgressList は空配列", () => {
    expect(loadProgressList()).toEqual([]);
  });

  test("テーマ受講を記録 → 一覧から取得", () => {
    recordThemeAttempt({
      themeId: "theme-1",
      themeTitle: "高所作業安全",
      totalQuestions: 10,
      correctCount: 8,
      wrongQuestionIds: ["q3", "q7"],
      attemptedAt: "2026-05-24T10:00:00.000Z",
    });
    const list = loadProgressList();
    expect(list).toHaveLength(1);
    expect(list[0].correctCount).toBe(8);
    expect(list[0].completedCount).toBe(0); // 全問正答ではないので 0
    expect(list[0].wrongQuestionIds).toEqual(["q3", "q7"]);
  });

  test("同一テーマで再受講 → completedCount が累積", () => {
    recordThemeAttempt({
      themeId: "theme-1",
      themeTitle: "高所作業安全",
      totalQuestions: 10,
      correctCount: 10,
      wrongQuestionIds: [],
      attemptedAt: "2026-05-24T10:00:00.000Z",
    });
    recordThemeAttempt({
      themeId: "theme-1",
      themeTitle: "高所作業安全",
      totalQuestions: 10,
      correctCount: 10,
      wrongQuestionIds: [],
      attemptedAt: "2026-05-25T10:00:00.000Z",
    });
    const list = loadProgressList();
    expect(list).toHaveLength(1);
    expect(list[0].completedCount).toBe(2);
  });

  test("複数テーマを記録すると新しい順", () => {
    recordThemeAttempt({
      themeId: "theme-1",
      themeTitle: "T1",
      totalQuestions: 5,
      correctCount: 5,
      wrongQuestionIds: [],
      attemptedAt: "2026-05-24T10:00:00.000Z",
    });
    recordThemeAttempt({
      themeId: "theme-2",
      themeTitle: "T2",
      totalQuestions: 5,
      correctCount: 3,
      wrongQuestionIds: ["q1", "q2"],
      attemptedAt: "2026-05-25T10:00:00.000Z",
    });
    const list = loadProgressList();
    expect(list[0].themeId).toBe("theme-2");
    expect(list[1].themeId).toBe("theme-1");
  });

  test("clearAllProgress で全削除", () => {
    recordThemeAttempt({
      themeId: "theme-1",
      themeTitle: "T1",
      totalQuestions: 5,
      correctCount: 5,
      wrongQuestionIds: [],
    });
    expect(loadProgressList()).toHaveLength(1);
    clearAllProgress();
    expect(loadProgressList()).toHaveLength(0);
  });
});

describe("buildProgressSummary", () => {
  test("完了 + 進行中 + 正答率の集計", () => {
    const records = [
      {
        themeId: "t1",
        themeTitle: "T1",
        totalQuestions: 10,
        correctCount: 10, // complete
        completedCount: 1,
        wrongQuestionIds: [],
        lastAttemptedAt: "2026-05-24T10:00:00.000Z",
      },
      {
        themeId: "t2",
        themeTitle: "T2",
        totalQuestions: 10,
        correctCount: 7, // in-progress
        completedCount: 0,
        wrongQuestionIds: ["q1", "q2", "q3"],
        lastAttemptedAt: "2026-05-24T11:00:00.000Z",
      },
      {
        themeId: "t3",
        themeTitle: "T3",
        totalQuestions: 10,
        correctCount: 0, // 未着手レベル (record はあるが正答ゼロ)
        completedCount: 0,
        wrongQuestionIds: [],
        lastAttemptedAt: "2026-05-24T12:00:00.000Z",
      },
    ];
    const summary = buildProgressSummary(records);
    expect(summary.totalThemes).toBe(3);
    expect(summary.completedThemes).toBe(1);
    expect(summary.inProgressThemes).toBe(1);
    expect(summary.totalCorrect).toBe(17);
    expect(summary.totalQuestions).toBe(30);
  });
});
