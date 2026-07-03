import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MeetingPrintSheet } from "@/components/meeting/meeting-print-sheet";
import { normalizeMeetingRecord } from "@/lib/meeting/schema";
import { checklistFieldKey, contractorFieldKey, deliveryFieldKey, emptyMeetingPaperFieldKeys } from "@/lib/meeting/paper-fields";

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

  it("editing 指定でヘッダー7欄＋明日のイベント5欄＋統括安全責任者コメント＋各社マトリクス7部位＋点検項目8カテゴリがタップ標的になり、タップでキーが飛ぶ", () => {
    const onTapField = vi.fn();
    render(<MeetingPrintSheet record={rec} editing={{ onTapField }} />);
    const cells = screen.getAllByRole("button");
    // 静的13欄 + 各社1行ぶん11タップ標的（company/workContent/machines/qualifications/plannedCount/
    // predictedDisasters/risk×2セル/safetyInstructions/responsibleName/actualCount）+ 搬入出1行ぶん3タップ標的
    // + 点検項目8カテゴリぶん8タップ標的
    expect(cells).toHaveLength(35);
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
    fireEvent.click(screen.getByRole("button", { name: "業者名・階層を入力" }));
    expect(onTapField).toHaveBeenCalledWith(contractorFieldKey("c1", "company"));
    fireEvent.click(screen.getByRole("button", { name: "作業内容を入力" }));
    expect(onTapField).toHaveBeenCalledWith(contractorFieldKey("c1", "workContent"));
    fireEvent.click(screen.getByRole("button", { name: "使用機械を入力" }));
    expect(onTapField).toHaveBeenCalledWith(contractorFieldKey("c1", "machines"));
    fireEvent.click(screen.getByRole("button", { name: "必要資格を入力" }));
    expect(onTapField).toHaveBeenCalledWith(contractorFieldKey("c1", "qualifications"));
    fireEvent.click(screen.getByRole("button", { name: "予定人員を入力" }));
    expect(onTapField).toHaveBeenCalledWith(contractorFieldKey("c1", "plannedCount"));
    fireEvent.click(screen.getByRole("button", { name: "予想災害を入力" }));
    expect(onTapField).toHaveBeenCalledWith(contractorFieldKey("c1", "predictedDisasters"));
    // リスク欄は重大性/可能性の2セルが同一キーのタップ標的（KYのriskEvalと同型）
    for (const cell of screen.getAllByRole("button", { name: "リスク（重大性・可能性）を入力" })) {
      fireEvent.click(cell);
      expect(onTapField).toHaveBeenCalledWith(contractorFieldKey("c1", "risk"));
    }
    fireEvent.click(screen.getByRole("button", { name: "安全衛生指示事項を入力" }));
    expect(onTapField).toHaveBeenCalledWith(contractorFieldKey("c1", "safetyInstructions"));
    fireEvent.click(screen.getByRole("button", { name: "協力会社責任者を入力" }));
    expect(onTapField).toHaveBeenCalledWith(contractorFieldKey("c1", "responsibleName"));
    fireEvent.click(screen.getByRole("button", { name: "実績人員（当日）を入力" }));
    expect(onTapField).toHaveBeenCalledWith(contractorFieldKey("c1", "actualCount"));
    const deliveryId = rec.deliveries[0]!.id;
    fireEvent.click(screen.getByRole("button", { name: "搬入出（物）を入力" }));
    expect(onTapField).toHaveBeenCalledWith(deliveryFieldKey(deliveryId, "item"));
    fireEvent.click(screen.getByRole("button", { name: "時刻を入力" }));
    expect(onTapField).toHaveBeenCalledWith(deliveryFieldKey(deliveryId, "time"));
    fireEvent.click(screen.getByRole("button", { name: "場所を入力" }));
    expect(onTapField).toHaveBeenCalledWith(deliveryFieldKey(deliveryId, "place"));
    for (const cat of rec.checklist) {
      fireEvent.click(screen.getByRole("button", { name: `点検（${cat.label}）を入力` }));
      expect(onTapField).toHaveBeenCalledWith(checklistFieldKey(cat.key));
    }
  });

  it("onAddContractorRow 指定時のみ「＋元請/1次/2次/3次」ホットスポットが出て、タップで型が渡る", () => {
    const onTapField = vi.fn();
    const onAddContractorRow = vi.fn();
    render(<MeetingPrintSheet record={rec} editing={{ onTapField, onAddContractorRow }} />);
    for (const t of ["元請", "1次", "2次", "3次"] as const) {
      fireEvent.click(screen.getByRole("button", { name: `＋${t}` }));
    }
    expect(onAddContractorRow).toHaveBeenNthCalledWith(1, "元請");
    expect(onAddContractorRow).toHaveBeenNthCalledWith(2, "1次");
    expect(onAddContractorRow).toHaveBeenNthCalledWith(3, "2次");
    expect(onAddContractorRow).toHaveBeenNthCalledWith(4, "3次");
  });

  it("onAddContractorRow 未指定では「＋元請」等のホットスポットが出ない", () => {
    render(<MeetingPrintSheet record={rec} editing={{ onTapField: () => {} }} />);
    expect(screen.queryByRole("button", { name: "＋元請" })).toBeNull();
  });

  it("onAddDeliveryRow 指定時のみ「＋搬入出行を追加」が出てタップで発火する", () => {
    const onAddDeliveryRow = vi.fn();
    render(<MeetingPrintSheet record={rec} editing={{ onTapField: () => {}, onAddDeliveryRow }} />);
    fireEvent.click(screen.getByRole("button", { name: "＋搬入出行を追加" }));
    expect(onAddDeliveryRow).toHaveBeenCalledOnce();
  });

  it("onAddDeliveryRow 未指定では「＋搬入出行を追加」ホットスポットが出ない", () => {
    render(<MeetingPrintSheet record={rec} editing={{ onTapField: () => {} }} />);
    expect(screen.queryByRole("button", { name: "＋搬入出行を追加" })).toBeNull();
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
