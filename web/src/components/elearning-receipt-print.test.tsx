import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ElearningReceiptExport,
  ELEARNING_RECEIPT_DISCLAIMER,
  formatReceiptDate,
} from "./elearning-receipt-print";
import { recordThemeAttempt, clearAllProgress } from "@/lib/elearning/progress";

/**
 * NIQ-REC2 回帰ガード: Eラーニング社内記録用の受講記録出力。
 * 修了証ではないことを示す固定注記の文言・氏名/日付/テーマ/正答率の表示を固定する。
 */
describe("ElearningReceiptExport", () => {
  beforeEach(() => {
    clearAllProgress();
  });

  it("受講履歴が無ければ何も描画しない", () => {
    const { container } = render(<ElearningReceiptExport />);
    expect(container.firstChild).toBeNull();
  });

  it("修了証ではないことを示す固定注記を必ず出す", () => {
    recordThemeAttempt({
      themeId: "th-1",
      themeTitle: "墜落防止の基本",
      totalQuestions: 5,
      correctCount: 4,
      wrongQuestionIds: ["q3"],
    });
    render(<ElearningReceiptExport />);
    expect(ELEARNING_RECEIPT_DISCLAIMER).toContain("法定教育の修了を証するものではありません");
    // 画面と印刷様式の両方に注記が入る
    expect(screen.getAllByText(new RegExp(ELEARNING_RECEIPT_DISCLAIMER)).length).toBeGreaterThanOrEqual(1);
  });

  it("テーマ名・正答率・氏名入力・印刷ボタンを表示する", () => {
    recordThemeAttempt({
      themeId: "th-2",
      themeTitle: "熱中症の初期対応",
      totalQuestions: 4,
      correctCount: 4,
      wrongQuestionIds: [],
    });
    render(<ElearningReceiptExport />);
    expect(screen.getAllByText("熱中症の初期対応").length).toBeGreaterThan(0);
    expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/氏名/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /受講記録を印刷/ })).toBeTruthy();
  });

  it("誇大・修了証めいた表現（修了証・認定・合格証）を出さない", () => {
    recordThemeAttempt({
      themeId: "th-3",
      themeTitle: "テーマ",
      totalQuestions: 2,
      correctCount: 1,
      wrongQuestionIds: ["q1"],
    });
    const { container } = render(<ElearningReceiptExport />);
    const text = container.textContent ?? "";
    // 「修了証ではありません」というバッジは可。「修了証を発行」等の断定は禁止。
    expect(text).not.toContain("修了証を発行");
    expect(text).not.toContain("認定証");
    expect(text).not.toContain("合格証");
  });
});

describe("formatReceiptDate", () => {
  it("ISO を和暦様式に整形（不正値は空文字）", () => {
    expect(formatReceiptDate("2026-07-11T10:00:00.000Z")).toMatch(/2026年7月\d+日/);
    expect(formatReceiptDate("not-a-date")).toBe("");
  });
});
