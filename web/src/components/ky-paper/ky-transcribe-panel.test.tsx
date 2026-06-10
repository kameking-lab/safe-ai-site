import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { KyTranscribePanel } from "@/components/ky-paper/ky-transcribe-panel";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";

const rec = normalizeKyInstructionRecord({
  siteName: "○○ビル新築",
  foremanName: "山田",
  riskRows: [{ targetLabel: "①", hazard: "墜落", reduction: "親綱使用", likelihood: 3, severity: 3 }],
  teamGoal: "親綱に掛けてから移動しよう",
});

describe("KyTranscribePanel", () => {
  let written: string[];

  beforeEach(() => {
    written = [];
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn((t: string) => {
          written.push(t);
          return Promise.resolve();
        }),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("項目別の値とコピー操作・未記入の無効化を提供する", async () => {
    render(<KyTranscribePanel record={rec} onClose={() => {}} />);
    expect(screen.getByText("○○ビル新築")).toBeTruthy();
    expect(screen.getByText("親綱に掛けてから移動しよう")).toBeTruthy();

    // 現場名のコピー → クリップボードに値が入りフィードバックが出る
    const row = screen.getByText("○○ビル新築").closest("li");
    if (!row) throw new Error("row not found");
    const btn = row.querySelector("button");
    if (!btn) throw new Error("copy button not found");
    fireEvent.click(btn);
    await waitFor(() => expect(written).toContain("○○ビル新築"));
    await screen.findByText("✓ コピーしました");

    // 未記入項目（重点実施項目）はコピー不可
    const emptyRow = screen.getByText("重点実施項目").closest("li");
    expect(emptyRow?.querySelector("button")?.disabled).toBe(true);
  });

  it("危険と対策の表はタブ区切りでコピーされる", async () => {
    render(<KyTranscribePanel record={rec} onClose={() => {}} />);
    fireEvent.click(screen.getByText("危険と対策の表をコピー（Excel貼り付け用）"));
    await waitFor(() => expect(written.some((t) => t.includes("①\t墜落\t3\t3"))).toBe(true));
  });

  it("閉じるで onClose が呼ばれる", () => {
    const onClose = vi.fn();
    render(<KyTranscribePanel record={rec} onClose={onClose} />);
    fireEvent.click(screen.getByText("閉じる"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clipboard API 不在でも textarea フォールバックでコピーできる", async () => {
    Object.assign(navigator, { clipboard: undefined });
    document.execCommand = vi.fn(() => true);
    render(<KyTranscribePanel record={rec} onClose={() => {}} />);
    const row = screen.getByText("○○ビル新築").closest("li");
    const btn = row?.querySelector("button");
    if (!btn) throw new Error("copy button not found");
    fireEvent.click(btn);
    await screen.findByText("✓ コピーしました");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });
});
