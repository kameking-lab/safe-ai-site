import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KyPrintSheet } from "@/components/ky-paper/ky-print-sheet";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";

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
