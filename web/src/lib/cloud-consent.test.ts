import { describe, expect, it, vi } from "vitest";
import {
  CLOUD_CONSENT_KEY,
  grantCloudConsent,
  hasCloudConsent,
  revokeCloudConsent,
} from "./cloud-consent";

describe("versioned optional cloud consent", () => {
  it("defaults closed and rejects malformed or older values", () => {
    expect(hasCloudConsent(localStorage)).toBe(false);
    localStorage.setItem(CLOUD_CONSENT_KEY, JSON.stringify({ granted: true }));
    expect(hasCloudConsent(localStorage)).toBe(false);
  });

  it("requires an explicit grant and can be withdrawn", () => {
    expect(grantCloudConsent(localStorage)).toBe(true);
    expect(hasCloudConsent(localStorage)).toBe(true);
    revokeCloudConsent(localStorage);
    expect(hasCloudConsent(localStorage)).toBe(false);
  });

  it("fails closed when storage is unavailable", () => {
    expect(hasCloudConsent({ getItem: vi.fn(() => { throw new Error("blocked"); }) })).toBe(false);
    expect(grantCloudConsent({ setItem: vi.fn(() => { throw new Error("blocked"); }) })).toBe(false);
  });
});
