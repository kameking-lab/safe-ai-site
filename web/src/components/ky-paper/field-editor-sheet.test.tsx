import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FieldEditorSheet } from "./field-editor-sheet";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";

/**
 * KY用紙canvasのフィールドエディタシート フォーカス管理の回帰ガード（2026-07-04）。
 * role="dialog"/aria-modal/Escapeは既存実装済みだが、キーボード利用者がTabで
 * シート外へ抜けられる・閉じた際にタップしたセルへフォーカスが戻らない不具合を是正。
 * law-search-results.tsx の AI要約モーダルで確立済みの同型パターンを踏襲。
 */
describe("FieldEditorSheet のフォーカス管理", () => {
  function renderSheet() {
    const record = normalizeKyInstructionRecord({});
    render(
      <FieldEditorSheet
        fieldKey="siteName"
        record={record}
        patch={vi.fn()}
        onClose={vi.fn()}
        onSelectField={vi.fn()}
        weather={{ region: "tokyo", setRegion: vi.fn(), fetchWeather: vi.fn(), busy: false }}
        participants={{
          workers: [],
          regularWorkers: [],
          workerGroups: [],
          selectedNames: new Set(),
          toggleWorker: vi.fn(),
          addWorkers: vi.fn(),
          clearMasterWorkers: vi.fn(),
        }}
      />
    );
  }

  it("開いた際にタップしたセル（起動元）を記憶し、Escapeで閉じた際に復帰する", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const onClose = vi.fn();
    const record = normalizeKyInstructionRecord({});
    const { unmount } = render(
      <FieldEditorSheet
        fieldKey="siteName"
        record={record}
        patch={vi.fn()}
        onClose={onClose}
        onSelectField={vi.fn()}
        weather={{ region: "tokyo", setRegion: vi.fn(), fetchWeather: vi.fn(), busy: false }}
        participants={{
          workers: [],
          regularWorkers: [],
          workerGroups: [],
          selectedNames: new Set(),
          toggleWorker: vi.fn(),
          addWorkers: vi.fn(),
          clearMasterWorkers: vi.fn(),
        }}
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
