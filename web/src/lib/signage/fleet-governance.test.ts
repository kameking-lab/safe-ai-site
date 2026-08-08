import { describe, expect, it } from "vitest";
import {
  deriveSignageDeviceState,
  hashSignageDeviceToken,
  heartbeatTimestampAllowed,
  isSignageEmergencyOverrideActive,
  signSignageConfiguration,
  verifySignageConfiguration,
} from "./fleet-governance";

const now = new Date("2026-07-31T00:10:00Z");

describe("signage fleet state", () => {
  it("distinguishes unregistered, delayed, stale, and offline devices", () => {
    expect(
      deriveSignageDeviceState(
        {
          registrationStatus: "unverified",
          lastSeenAt: now,
          staleThresholdSec: 60,
          reportedStatus: "online",
          maintenanceAt: null,
          emergencyActive: false,
        },
        now,
      ),
    ).toBe("unknown");
    const base = {
      registrationStatus: "verified" as const,
      staleThresholdSec: 60,
      reportedStatus: "online",
      maintenanceAt: null,
      emergencyActive: false,
    };
    expect(
      deriveSignageDeviceState(
        { ...base, lastSeenAt: new Date("2026-07-31T00:08:30Z") },
        now,
      ),
    ).toBe("delayed");
    expect(
      deriveSignageDeviceState(
        { ...base, lastSeenAt: new Date("2026-07-31T00:07:00Z") },
        now,
      ),
    ).toBe("stale");
    expect(
      deriveSignageDeviceState(
        { ...base, lastSeenAt: new Date("2026-07-30T23:59:00Z") },
        now,
      ),
    ).toBe("offline");
  });

  it("signs a canonical checksum and detects configuration tampering", () => {
    const secret = "s".repeat(32);
    const config = { layout: "morning", schedule: { start: "07:45" } };
    const signed = signSignageConfiguration(config, 4, secret);
    expect(verifySignageConfiguration(config, 4, signed.signature, secret)).toBe(
      true,
    );
    expect(
      verifySignageConfiguration(
        { ...config, layout: "tampered" },
        4,
        signed.signature,
        secret,
      ),
    ).toBe(false);
  });

  it("hashes raw device tokens and rejects replay-window timestamps", () => {
    const token = "device-token-".padEnd(40, "x");
    const hash = hashSignageDeviceToken(token, "h".repeat(32));
    expect(hash).not.toContain(token);
    expect(
      heartbeatTimestampAllowed(new Date("2026-07-31T00:06:00Z"), now),
    ).toBe(true);
    expect(
      heartbeatTimestampAllowed(new Date("2026-07-31T00:00:00Z"), now),
    ).toBe(false);
  });

  it("activates emergency override only when explicit and unexpired", () => {
    expect(
      isSignageEmergencyOverrideActive(
        { active: true, expiresAt: "2026-07-31T00:11:00.000Z" },
        now,
      ),
    ).toBe(true);
    expect(
      isSignageEmergencyOverrideActive(
        { active: false, expiresAt: null },
        now,
      ),
    ).toBe(false);
    expect(
      isSignageEmergencyOverrideActive(
        { active: true, expiresAt: "2026-07-31T00:09:00.000Z" },
        now,
      ),
    ).toBe(false);
  });
});
