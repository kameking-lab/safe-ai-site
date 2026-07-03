import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MeetingListClient } from "./meeting-list-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// ローカルが空・別端末のクラウド履歴を確認中は、その待機が終わるまで
// 「打合せ書なし」と誤読させてはいけない（柱0: /ky/list と対称の欠落是正）。
vi.mock("@/lib/meeting/cloud", async () => {
  const actual = await vi.importActual<typeof import("@/lib/meeting/cloud")>("@/lib/meeting/cloud");
  return {
    ...actual,
    isMeetingCloudEnabled: () => true,
    cloudPullMeetings: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("/safety-diary/list 柱0: クラウド確認中に『打合せ書なし』を誤表示しない", () => {
  it("クラウド確認中は『確認中』、解決後に実際の件数へ切り替わる", async () => {
    const { cloudPullMeetings } = await import("@/lib/meeting/cloud");
    let resolvePull!: (v: unknown[] | null) => void;
    (cloudPullMeetings as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolvePull = resolve;
      })
    );

    render(<MeetingListClient />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("確認中"));
    expect(screen.getByRole("status").textContent).not.toContain("打合せ書なし");

    resolvePull([
      {
        id: "cloud-1",
        siteName: "○○現場",
        workDate: "2026-07-04",
        author: "山田",
        savedAt: "2026-07-04T00:00:00Z",
      },
    ]);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("保存打合せ書"));
    expect(screen.getByRole("status").textContent).not.toContain("確認中");
  });

  it("クラウドにも記録が無ければ確認後に『打合せ書なし』へ収束する", async () => {
    const { cloudPullMeetings } = await import("@/lib/meeting/cloud");
    (cloudPullMeetings as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    render(<MeetingListClient />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("打合せ書なし"));
  });
});
