import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MeetingListClient } from "./meeting-list-client";
import { buildDefaultMeetingRecord } from "@/lib/meeting/schema";
import { snapshotMeeting } from "@/lib/meeting/store";

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn() }),
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
  routerPush.mockReset();
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

describe("/safety-diary/list editor destinations", () => {
  it("opens and duplicates a saved record directly in the editor", async () => {
    const { cloudPullMeetings } = await import("@/lib/meeting/cloud");
    (cloudPullMeetings as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    snapshotMeeting(buildDefaultMeetingRecord({ idFactory: () => "meeting-route-test" }));

    render(<MeetingListClient />);

    fireEvent.click(await screen.findByRole("button", { name: "開く（再編集）" }));
    await waitFor(() => expect(routerPush).toHaveBeenLastCalledWith("/safety-diary?edit=1"));

    fireEvent.click(screen.getByRole("button", { name: "翌日用に複製" }));
    await waitFor(() => expect(routerPush).toHaveBeenCalledTimes(2));
    expect(routerPush).toHaveBeenLastCalledWith("/safety-diary?edit=1");
  });

  it("sends every empty-state create action directly to the editor", async () => {
    const { cloudPullMeetings } = await import("@/lib/meeting/cloud");
    (cloudPullMeetings as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    render(<MeetingListClient />);

    await waitFor(() => expect(screen.getAllByRole("link", { name: /新規作成/ })).toHaveLength(2));
    for (const link of screen.getAllByRole("link", { name: /新規作成/ })) {
      expect(link.getAttribute("href")).toBe("/safety-diary?edit=1");
    }
  });

  it("sends the populated-state create action directly to the editor", async () => {
    snapshotMeeting(buildDefaultMeetingRecord({ idFactory: () => "meeting-route-test" }));

    render(<MeetingListClient />);

    await waitFor(() => expect(screen.getAllByRole("link", { name: /新規作成/ })).toHaveLength(2));
    for (const link of screen.getAllByRole("link", { name: /新規作成/ })) {
      expect(link.getAttribute("href")).toBe("/safety-diary?edit=1");
    }
  });
});
