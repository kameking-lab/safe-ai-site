import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkersMasterClient } from "./workers-master-client";
import {
  WORKERS_STORAGE_KEY,
  WORKER_RETENTION_DAYS,
} from "@/lib/ky/workers-master";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("/ky/workers 端末内31日境界", () => {
  it("期限切れの旧localStorage氏名を自動削除し、登録なしへ収束する", () => {
    const expiredAt =
      Date.now() - (WORKER_RETENTION_DAYS * 24 * 60 * 60 * 1000 + 1);
    localStorage.setItem(
      WORKERS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "w-expired",
          name: "期限切れ作業員",
          affiliation: "self",
          company: "",
          qualNo: "",
          isRegular: true,
          hidden: false,
          createdAt: expiredAt,
        },
      ]),
    );

    render(<WorkersMasterClient />);

    expect(screen.getByRole("status").textContent).toContain("登録なし");
    expect(localStorage.getItem(WORKERS_STORAGE_KEY)).toBeNull();
  });

  it("クラウド確認・network送信をせず端末内保持境界を明示する", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<WorkersMasterClient />);

    expect(screen.queryByText("確認中")).toBeNull();
    expect(screen.getByText(/この端末だけに最終利用から31日保存/)).toBeTruthy();
    expect(screen.queryByText(/クラウド/)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
