"use client";

export const CLOUD_CONSENT_KEY = "safe-ai:optional-cloud-consent:v1";

type StoredConsent = {
  version: 1;
  granted: true;
  grantedAt: string;
};

export function hasCloudConsent(storage?: Pick<Storage, "getItem">): boolean {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
    if (!target) return false;
    const parsed = JSON.parse(target.getItem(CLOUD_CONSENT_KEY) ?? "null") as Partial<StoredConsent> | null;
    return parsed?.version === 1 && parsed.granted === true && typeof parsed.grantedAt === "string";
  } catch {
    return false;
  }
}

export function grantCloudConsent(storage?: Pick<Storage, "setItem">): boolean {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
    if (!target) return false;
    const value: StoredConsent = { version: 1, granted: true, grantedAt: new Date().toISOString() };
    target.setItem(CLOUD_CONSENT_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function revokeCloudConsent(storage?: Pick<Storage, "removeItem">): void {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
    target?.removeItem(CLOUD_CONSENT_KEY);
  } catch {
    // Revocation is best-effort when storage itself is unavailable.
  }
}
