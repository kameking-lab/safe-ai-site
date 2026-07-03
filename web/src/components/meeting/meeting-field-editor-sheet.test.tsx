import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MeetingFieldEditorSheet } from "./meeting-field-editor-sheet";
import { buildDefaultMeetingRecord } from "@/lib/meeting/schema";

/**
 * 打合せ用紙canvasのフィールドエディタシート フォーカス管理の回帰ガード（2026-07-04）。
 * KY版(field-editor-sheet.test.tsx)・law-search-results.tsx の AI要約モーダルで
 * 確立済みの同型パターン（Tabトラップ・閉じた際の起動元復帰）を踏襲。
 */
describe("MeetingFieldEditorSheet のフォーカス管理", () => {
  function renderSheet() {
    const record = buildDefaultMeetingRecord();
    render(
      <MeetingFieldEditorSheet
        fieldKey="siteName"
        record={record}
        patch={vi.fn()}
        onClose={vi.fn()}
        onSelectField={vi.fn()}
      />
    );
  }

  it("開いた際にタップしたセル（起動元）を記憶し、閉じた際に復帰する", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const record = buildDefaultMeetingRecord();
    const { unmount } = render(
      <MeetingFieldEditorSheet
        fieldKey="siteName"
        record={record}
        patch={vi.fn()}
        onClose={vi.fn()}
        onSelectField={vi.fn()}
      />
    );

    // アンマウント（onCloseによる親側の非表示化と同じ効果）で起動元へフォーカスが復帰することを確認。
    unmount();
    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });

  it("Tabキーでシート内の最初/最後の要素間を循環する（フォーカストラップ）", () => {
    renderSheet();

    const closeButton = screen.getByRole("button", { name: "閉じる" });
    const nextButton = screen.getByRole("button", { name: "次の欄へ →" });

    nextButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(nextButton);
  });
});
