import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { WorkersMasterClient } from "./workers-master-client";

// 柱0: ローカルが空・別端末のクラウド履歴を確認中は、その待機が終わるまで
// 「登録なし」と誤読させてはいけない（実際は記録があるのに0名と誤認させない、
// /ky/list・/safety-diary/list と同型の柱0違反。別ファイルに分離し isKyCloudEnabled=true
// のモックが他の無読テスト（同期完結を前提）に影響しないようにする）。
vi.mock("@/lib/ky/storage-adapter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ky/storage-adapter")>("@/lib/ky/storage-adapter");
  return {
    ...actual,
    isKyCloudEnabled: () => true,
    flushKyCloudQueue: vi.fn().mockResolvedValue(undefined),
    cloudPullWorkers: vi.fn(),
    cloudPushWorkers: vi.fn().mockResolvedValue(undefined),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("/ky/workers 柱0: クラウド確認中に『登録なし』を誤表示しない", () => {
  it("クラウド確認中は『確認中』、解決後に実際の人数へ切り替わる", async () => {
    const { cloudPullWorkers } = await import("@/lib/ky/storage-adapter");
    let resolvePull!: (v: Array<{ id: string; name: string; affiliation: "self"; company: string; qualNo: string; isRegular: boolean; hidden: boolean; createdAt: number }> | null) => void;
    (cloudPullWorkers as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolvePull = resolve;
      })
    );

    render(<WorkersMasterClient />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("確認中"));
    expect(screen.getByRole("status").textContent).not.toContain("登録なし");

    resolvePull([
      {
        id: "w-1",
        name: "山田 太郎",
        affiliation: "self",
        company: "",
        qualNo: "1",
        isRegular: true,
        hidden: false,
        createdAt: 1_700_000_000_000,
      },
    ]);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("登録済み"));
    expect(screen.getByRole("status").textContent).not.toContain("確認中");
  });

  it("クラウドにも記録が無ければ確認後に『登録なし』へ収束する", async () => {
    const { cloudPullWorkers } = await import("@/lib/ky/storage-adapter");
    (cloudPullWorkers as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    render(<WorkersMasterClient />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("登録なし"));
  });
});
