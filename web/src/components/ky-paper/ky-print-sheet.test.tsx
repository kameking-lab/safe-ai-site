import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { KyPrintSheet } from "@/components/ky-paper/ky-print-sheet";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import { emptyKyPaperFieldKeys } from "@/lib/ky/paper-fields";

describe("KyPrintSheet (A4印刷レイアウト)", () => {
  const rec = normalizeKyInstructionRecord({
    siteName: "○○ビル新築",
    projectName: "3工区",
    foremanName: "山田",
    workRows: [{ workDetail: "鉄骨建方" }],
    riskRows: [{ targetLabel: "①", hazard: "墜落", reduction: "親綱使用", likelihood: 3, severity: 3 }],
    teamGoal: "親綱に掛けてから移動しよう",
    pointingCall: "親綱ヨシ",
    participants: [{ name: "佐藤" }],
  });

  it("現場名・作業・危険・対策・目標を表示", () => {
    render(<KyPrintSheet record={rec} />);
    expect(screen.getByText("○○ビル新築")).toBeTruthy();
    expect(screen.getByText("3工区")).toBeTruthy();
    expect(screen.getByText("鉄骨建方")).toBeTruthy();
    expect(screen.getByText("墜落")).toBeTruthy();
    expect(screen.getByText("親綱使用")).toBeTruthy();
    expect(screen.getByText("親綱に掛けてから移動しよう")).toBeTruthy();
  });

  it("3つの確認印枠（職長・元方・元請）を持つ", () => {
    render(<KyPrintSheet record={rec} />);
    expect(screen.getByText(/職長 確認印/)).toBeTruthy();
    expect(screen.getByText(/元方安全衛生管理者 確認印/)).toBeTruthy();
    expect(screen.getByText(/元請担当者 確認印/)).toBeTruthy();
  });

  it("参加者を表示", () => {
    render(<KyPrintSheet record={rec} />);
    expect(screen.getByText(/佐藤/)).toBeTruthy();
  });
});

describe("F1/O10: editing prop（印刷不可侵とタップ標的）", () => {
  // 印刷不可侵スナップショットは決定論でなければならない。作業日を明示固定しないと
  // normalize が既定で new Date()（今日）を埋め、実行日ごとにスナップショットが
  // 揺れて偽陽性で落ちる（この不具合を修理）。日付は固定センチネルにピン留めする。
  const rec = normalizeKyInstructionRecord({
    siteName: "○○ビル新築",
    projectName: "3工区",
    foremanName: "山田",
    workDateYear: "2026",
    workDateMonth: "7",
    workDateDay: "1",
    workRows: [{ workDetail: "鉄骨建方" }],
    riskRows: [{ targetLabel: "①", hazard: "墜落", reduction: "親綱使用", likelihood: 3, severity: 3 }],
    teamGoal: "親綱に掛けてから移動しよう",
    pointingCall: "親綱ヨシ",
    participants: [{ name: "佐藤" }],
  });

  it("【印刷不可侵】editing 未指定の出力HTMLはスナップショットと完全一致（A4正式書式の凍結）", () => {
    const { container } = render(<KyPrintSheet record={rec} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("editing 未指定ではタップ標的（role=button）が一切出ない", () => {
    render(<KyPrintSheet record={rec} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("editing 指定でヘッダー6欄＋本日の作業内容＋4R目標3欄＋参加者がタップ標的になり、タップでキーが飛ぶ", () => {
    const onTapField = vi.fn();
    render(<KyPrintSheet record={rec} editing={{ onTapField }} />);
    // 静的11欄(参加者含む) + 危険行(既定5行×3部位。可能性/重大性は2セルとも同じrisk.N.evalキー) = 11 + 5*4 = 31
    const cells = screen.getAllByRole("button");
    expect(cells).toHaveLength(31);
    fireEvent.click(screen.getByRole("button", { name: "現場名を入力" }));
    expect(onTapField).toHaveBeenCalledWith("siteName");
    fireEvent.click(screen.getByRole("button", { name: "元請会社を入力" }));
    expect(onTapField).toHaveBeenCalledWith("coop1Name");
    fireEvent.click(screen.getByRole("button", { name: "本日の作業内容を入力" }));
    expect(onTapField).toHaveBeenCalledWith("workDetail");
    fireEvent.click(screen.getByRole("button", { name: "指差呼称（ヨシ！）を入力" }));
    expect(onTapField).toHaveBeenCalledWith("pointingCall");
    fireEvent.click(screen.getByRole("button", { name: "参加者を入力" }));
    expect(onTapField).toHaveBeenCalledWith("participants");
  });

  it("O10（続き）: 危険行の危険/対策/可能性・重大性がタップ標的になる", () => {
    const onTapField = vi.fn();
    render(<KyPrintSheet record={rec} editing={{ onTapField }} />);
    fireEvent.click(screen.getByRole("button", { name: "危険のポイント（1）を入力" }));
    expect(onTapField).toHaveBeenCalledWith("risk.0.hazard");
    fireEvent.click(screen.getByRole("button", { name: "対策（1）を入力" }));
    expect(onTapField).toHaveBeenCalledWith("risk.0.reduction");
    expect(screen.getAllByRole("button", { name: "可能性・重大性（1）を入力" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "可能性・重大性（1）を入力" })[0]);
    expect(onTapField).toHaveBeenCalledWith("risk.0.eval");
  });

  it("O10（続き）: onAddRiskRow 指定時のみ「＋危険行を追加」が出てタップで発火する", () => {
    const onAddRiskRow = vi.fn();
    const { rerender } = render(<KyPrintSheet record={rec} editing={{ onTapField: () => {} }} />);
    expect(screen.queryByRole("button", { name: "＋ 危険行を追加" })).toBeNull();
    rerender(<KyPrintSheet record={rec} editing={{ onTapField: () => {}, onAddRiskRow }} />);
    fireEvent.click(screen.getByRole("button", { name: "＋ 危険行を追加" }));
    expect(onAddRiskRow).toHaveBeenCalledOnce();
  });

  it("キーボード（Enter/Space）でも欄を開ける（a11y）", () => {
    const onTapField = vi.fn();
    render(<KyPrintSheet record={rec} editing={{ onTapField }} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "工事名・工区を入力" }), { key: "Enter" });
    expect(onTapField).toHaveBeenCalledWith("projectName");
  });

  it("未記入欄は「タップして入力」のプレースホルダ表示になる", () => {
    const empty = normalizeKyInstructionRecord({ siteName: "記入済み現場" });
    render(
      <KyPrintSheet
        record={empty}
        editing={{ onTapField: () => {}, emptyKeys: emptyKyPaperFieldKeys(empty) }}
      />
    );
    // siteName は記入済み → 値表示、foremanName 等は未記入 → プレースホルダ
    expect(screen.getByText("記入済み現場")).toBeTruthy();
    expect(screen.getAllByText("タップして入力").length).toBeGreaterThanOrEqual(3);
  });
});
