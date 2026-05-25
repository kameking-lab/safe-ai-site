import { describe, expect, it } from "vitest";
import { computeKySyncStatus, KY_SYNC_LABEL } from "@/lib/ky/sync-status";

describe("computeKySyncStatus", () => {
  it("クラウド未設定が最優先", () => {
    expect(computeKySyncStatus({ cloudEnabled: false, online: true, pending: true })).toBe("cloud-disabled");
    expect(computeKySyncStatus({ cloudEnabled: false, online: false, pending: false })).toBe("cloud-disabled");
  });
  it("クラウド有効でオフラインなら offline", () => {
    expect(computeKySyncStatus({ cloudEnabled: true, online: false, pending: true })).toBe("offline");
  });
  it("オンラインで未送信があれば pending", () => {
    expect(computeKySyncStatus({ cloudEnabled: true, online: true, pending: true })).toBe("pending");
  });
  it("オンライン・未送信なしなら synced", () => {
    expect(computeKySyncStatus({ cloudEnabled: true, online: true, pending: false })).toBe("synced");
  });
  it("全ステータスにラベルがある", () => {
    for (const s of ["cloud-disabled", "offline", "pending", "synced"] as const) {
      expect(KY_SYNC_LABEL[s]).toBeTruthy();
    }
  });
});
