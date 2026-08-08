import { describe, expect, it } from "vitest";
import { computeKySyncStatus, KY_SYNC_LABEL } from "@/lib/ky/sync-status";

describe("computeKySyncStatus", () => {
  it("returns local-only when cloud transport is not configured", () => {
    expect(computeKySyncStatus({ cloudEnabled: false, online: true, pending: true })).toBe("local-only");
    expect(computeKySyncStatus({ cloudEnabled: false, online: false, pending: false })).toBe("local-only");
  });

  it("does not claim cloud readiness before explicit consent", () => {
    expect(computeKySyncStatus({ cloudEnabled: true, online: true, pending: false })).toBe("consent-required");
  });

  it("reports transport state only after consent", () => {
    expect(computeKySyncStatus({ cloudEnabled: true, consentGranted: true, online: false, pending: true })).toBe("offline");
    expect(computeKySyncStatus({ cloudEnabled: true, consentGranted: true, online: true, pending: true })).toBe("pending");
  });

  it("claims synced only after an actual successful transfer", () => {
    expect(computeKySyncStatus({ cloudEnabled: true, consentGranted: true, online: true, pending: false })).toBe("ready");
    expect(computeKySyncStatus({ cloudEnabled: true, consentGranted: true, online: true, pending: false, lastTransfer: "success" })).toBe("synced");
    expect(computeKySyncStatus({ cloudEnabled: true, consentGranted: true, online: true, pending: false, lastTransfer: "failed" })).toBe("failed");
  });

  it("has a label for every state", () => {
    for (const status of ["local-only", "consent-required", "ready", "offline", "pending", "synced", "failed"] as const) {
      expect(KY_SYNC_LABEL[status]).toBeTruthy();
    }
  });
});
