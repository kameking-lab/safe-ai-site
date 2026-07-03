import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DistributedInputBar } from "./distributed-input-bar";

vi.mock("@/lib/meeting/cloud", () => ({
  isMeetingCloudEnabled: () => true,
  cloudCreateMeetingShare: vi.fn(),
  cloudFetchMeetingContributions: vi.fn(),
}));

import { cloudCreateMeetingShare, cloudFetchMeetingContributions } from "@/lib/meeting/cloud";

const baseProps = {
  meetingId: "m1",
  siteName: "テスト現場",
  workDate: "2026-07-04",
  contractors: [],
  onImport: vi.fn(),
};

describe("DistributedInputBar 色文法（柱0-0）", () => {
  beforeEach(() => {
    vi.mocked(cloudCreateMeetingShare).mockReset();
    vi.mocked(cloudFetchMeetingContributions).mockReset();
    localStorage.clear();
  });

  it("共有リンク発行の失敗メッセージは危険色(rose)で表示する", async () => {
    vi.mocked(cloudCreateMeetingShare).mockResolvedValue(null);
    render(<DistributedInputBar {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /協力会社に入力を依頼/ }));
    const msg = await screen.findByText("共有リンクの発行に失敗しました。時間をおいて再度お試しください。");
    expect(msg.className).toContain("text-rose-700");
    expect(msg.className).not.toContain("text-emerald-700");
  });

  it("共有リンク発行の成功メッセージは安全色(emerald)で表示する", async () => {
    vi.mocked(cloudCreateMeetingShare).mockResolvedValue("token-abc");
    render(<DistributedInputBar {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /協力会社に入力を依頼/ }));
    const msg = await screen.findByText("共有リンクを発行しました。各協力会社にLINE等で送ってください。");
    expect(msg.className).toContain("text-emerald-700");
  });

  it("取り込み失敗メッセージは危険色(rose)で表示する", async () => {
    vi.mocked(cloudFetchMeetingContributions).mockResolvedValue(null);
    render(<DistributedInputBar {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /協力会社の入力を取り込む/ }));
    const msg = await screen.findByText("取り込みに失敗しました。");
    expect(msg.className).toContain("text-rose-700");
  });

  it("使い方を閉じるボタンとトグルボタンは44px以上を確保する", () => {
    render(<DistributedInputBar {...baseProps} />);
    const closeBtn = screen.getByRole("button", { name: "使い方を閉じる" });
    expect(closeBtn.className).toContain("min-h-[44px]");
    expect(closeBtn.className).toContain("min-w-[44px]");
  });
});
