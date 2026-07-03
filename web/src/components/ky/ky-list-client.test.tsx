import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { KyListClient } from "./ky-list-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// ローカルが空・別端末のクラウド履歴を確認中は、その待機が終わるまで
// 「保存KYなし」と誤読させてはいけない（柱0: 実際は記録があるのに0件と誤認させない）。
// isKyCloudEnabled/cloudPullKyRecords/flushKyCloudQueue をモックし、
// cloudPullKyRecords の解決を1マイクロタスク遅延させて途中状態を検証する。
vi.mock("@/lib/ky/storage-adapter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ky/storage-adapter")>("@/lib/ky/storage-adapter");
  return {
    ...actual,
    isKyCloudEnabled: () => true,
    flushKyCloudQueue: vi.fn().mockResolvedValue(undefined),
    cloudPullKyRecords: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("/ky/list 柱0: クラウド確認中に『保存KYなし』を誤表示しない", () => {
  it("クラウド確認中は『確認中』、解決後に実際の件数へ切り替わる", async () => {
    const { cloudPullKyRecords } = await import("@/lib/ky/storage-adapter");
    let resolvePull!: (v: { list: unknown[] } | null) => void;
    (cloudPullKyRecords as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolvePull = resolve;
      })
    );

    render(<KyListClient />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("確認中"));
    expect(screen.getByRole("status").textContent).not.toContain("保存KYなし");

    resolvePull({
      list: [
        {
          id: "cloud-1",
          siteName: "○○現場",
          workDate: "2026-07-04",
          savedAt: "2026-07-04T00:00:00Z",
        },
      ],
    });

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("保存KY"));
    expect(screen.getByRole("status").textContent).not.toContain("確認中");
  });

  it("クラウドにも記録が無ければ確認後に『保存KYなし』へ収束する", async () => {
    const { cloudPullKyRecords } = await import("@/lib/ky/storage-adapter");
    (cloudPullKyRecords as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    render(<KyListClient />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("保存KYなし"));
  });
});
