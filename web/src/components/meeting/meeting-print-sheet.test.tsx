import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MeetingPrintSheet } from "@/components/meeting/meeting-print-sheet";
import { normalizeMeetingRecord } from "@/lib/meeting/schema";
import { emptyMeetingPaperFieldKeys } from "@/lib/meeting/paper-fields";

describe("MeetingPrintSheet (A4横印刷レイアウト)", () => {
  const rec = normalizeMeetingRecord({
    workDateYear: "2026",
    workDateMonth: "7",
    workDateDay: "4",
    weather: "晴れ",
    temperature: "28",
    siteName: "○○ビル新築工事",
    siteManager: "山田太郎",
    supervisor: "佐藤次郎",
    author: "鈴木三郎",
    meetingDate: "2026-07-03",
    contractors: [{ id: "c1", type: "元請", parentId: null, companyName: "○○建設", workContent: "鉄骨建方", machines: "", qualifications: [], plannedCount: "5", predictedDisasters: [], risk: { severity: 1, likelihood: 1, priority: 1 }, safetyInstructions: "", responsibleName: "", actualCount: "", appendNote: "" }],
  });

  it("ヘッダー7欄と業者行を表示", () => {
    render(<MeetingPrintSheet record={rec} />);
    expect(screen.getByText("2026年7月4日")).toBeTruthy();
    expect(screen.getByText("○○ビル新築工事")).toBeTruthy();
    expect(screen.getByText("山田太郎")).toBeTruthy();
    expect(screen.getByText(/打合せ日: 2026-07-03/)).toBeTruthy();
    expect(screen.getByText("○○建設")).toBeTruthy();
  });

  it("editing 未指定ではタップ標的（role=button）が一切出ない", () => {
    render(<MeetingPrintSheet record={rec} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("【印刷不可侵】editing 未指定の出力HTMLはスナップショットと完全一致（A4正式書式の凍結）", () => {
    const { container } = render(<MeetingPrintSheet record={rec} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("editing 指定でヘッダー7欄＋明日のイベント5欄＋統括安全責任者コメントがタップ標的になり、タップでキーが飛ぶ", () => {
    const onTapField = vi.fn();
    render(<MeetingPrintSheet record={rec} editing={{ onTapField }} />);
    const cells = screen.getAllByRole("button");
    expect(cells).toHaveLength(13);
    fireEvent.click(screen.getByRole("button", { name: "打合せ日（前日）を入力" }));
    expect(onTapField).toHaveBeenCalledWith("meetingDate");
    fireEvent.click(screen.getByRole("button", { name: "作業日を入力" }));
    expect(onTapField).toHaveBeenCalledWith("workDate");
    fireEvent.click(screen.getByRole("button", { name: "天気・気温を入力" }));
    expect(onTapField).toHaveBeenCalledWith("weatherTemp");
    fireEvent.click(screen.getByRole("button", { name: "作業所名を入力" }));
    expect(onTapField).toHaveBeenCalledWith("siteName");
    fireEvent.click(screen.getByRole("button", { name: "作業所長を入力" }));
    expect(onTapField).toHaveBeenCalledWith("siteManager");
    fireEvent.click(screen.getByRole("button", { name: "主任等を入力" }));
    expect(onTapField).toHaveBeenCalledWith("supervisor");
    fireEvent.click(screen.getByRole("button", { name: "作成担当者を入力" }));
    expect(onTapField).toHaveBeenCalledWith("author");
    fireEvent.click(screen.getByRole("button", { name: "安全大会を入力" }));
    expect(onTapField).toHaveBeenCalledWith("safetyMeeting");
    fireEvent.click(screen.getByRole("button", { name: "検査を入力" }));
    expect(onTapField).toHaveBeenCalledWith("inspection");
    fireEvent.click(screen.getByRole("button", { name: "パトロールを入力" }));
    expect(onTapField).toHaveBeenCalledWith("patrol");
    fireEvent.click(screen.getByRole("button", { name: "明日の安全目標を入力" }));
    expect(onTapField).toHaveBeenCalledWith("tomorrowGoal");
    fireEvent.click(screen.getByRole("button", { name: "その他を入力" }));
    expect(onTapField).toHaveBeenCalledWith("free");
    fireEvent.click(screen.getByRole("button", { name: "統括安全責任者コメントを入力" }));
    expect(onTapField).toHaveBeenCalledWith("supervisorComment");
  });

  it("キーボード（Enter/Space）でも欄を開ける（a11y）", () => {
    const onTapField = vi.fn();
    render(<MeetingPrintSheet record={rec} editing={{ onTapField }} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "作業所名を入力" }), { key: "Enter" });
    expect(onTapField).toHaveBeenCalledWith("siteName");
  });

  it("未記入欄は「タップして入力」のプレースホルダ表示になる", () => {
    const empty = normalizeMeetingRecord({ siteName: "記入済み現場" });
    render(
      <MeetingPrintSheet
        record={empty}
        editing={{ onTapField: () => {}, emptyKeys: emptyMeetingPaperFieldKeys(empty) }}
      />
    );
    expect(screen.getByText("記入済み現場")).toBeTruthy();
    expect(screen.getAllByText("タップして入力").length).toBeGreaterThanOrEqual(3);
  });
});
