import { describe, expect, it, vi } from "vitest";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";
import {
  promoteSignageConfiguration,
  recordSignageHeartbeat,
  registerSignageDevice,
  stageSignageConfiguration,
} from "./fleet-repository";

function database(
  query: GovernanceSql["$queryRawUnsafe"],
  execute: GovernanceSql["$executeRawUnsafe"],
): GovernanceDatabase {
  const transaction: GovernanceSql = {
    $queryRawUnsafe: query,
    $executeRawUnsafe: execute,
  };
  return {
    ...transaction,
    $transaction: async <T>(callback: (database: GovernanceSql) => Promise<T>) =>
      callback(transaction),
  };
}

describe("signage fleet repository", () => {
  it("records heartbeat, state, config acknowledgement, and audit atomically", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "device-1",
        organizationId: "org-1",
        siteId: "site-1",
        registrationStatus: "verified",
        status: "unknown",
        lastSeenAt: null,
        staleThresholdSec: 300,
        maintenanceAt: null,
        rolloutId: "rollout-1",
        configurationId: "config-1",
        configurationVersion: 4,
        configChecksum: "checksum-1",
        signature: "signature-1",
        assignedLayout: "morning",
        schedule: [],
        emergencyOverride: null,
        contentSource: { feeds: ["jma-warning"] },
        weatherSource: { provider: "jma", areaCode: "130000" },
      },
    ]);
    const execute = vi.fn().mockResolvedValue(1);
    const result = await recordSignageHeartbeat(database(query, execute), {
      deviceId: "device-1",
      nonceHash: "nonce-hash",
      observedAt: new Date("2026-07-31T00:00:00Z"),
      status: "online",
      softwareVersion: "1.4.0",
      configurationVersion: 4,
      configChecksum: "checksum-1",
      diagnostics: { display: true },
      now: new Date("2026-07-31T00:00:01Z"),
    });
    expect(result).toMatchObject({
      ok: true,
      state: "online",
      acknowledged: true,
      configuration: { version: 4, checksum: "checksum-1" },
    });
    expect(execute.mock.calls.some((call) =>
      String(call[0]).includes('"SignageFleetHeartbeat"'),
    )).toBe(true);
    expect(execute.mock.calls.some((call) =>
      String(call[0]).includes('"SignageFleetAcknowledgement"'),
    )).toBe(true);
    expect(execute.mock.calls.some((call) =>
      String(call[0]).includes('"GovernanceAuditLog"'),
    )).toBe(true);
  });

  it("rejects a replayed heartbeat nonce", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "device-1",
        organizationId: "org-1",
        siteId: "site-1",
        registrationStatus: "verified",
        status: "online",
        lastSeenAt: null,
        staleThresholdSec: 300,
        maintenanceAt: null,
        rolloutId: null,
        configurationId: null,
        configurationVersion: null,
        configChecksum: null,
        signature: null,
        assignedLayout: null,
        schedule: null,
        emergencyOverride: null,
        contentSource: null,
        weatherSource: null,
      },
    ]);
    const error = Object.assign(new Error("duplicate"), { code: "23505" });
    const execute = vi.fn().mockRejectedValueOnce(error);
    await expect(
      recordSignageHeartbeat(database(query, execute), {
        deviceId: "device-1",
        nonceHash: "replayed",
        observedAt: new Date("2026-07-31T00:00:00Z"),
        status: "online",
        softwareVersion: "1.4.0",
        configurationVersion: null,
        configChecksum: null,
        diagnostics: {},
        now: new Date("2026-07-31T00:00:01Z"),
      }),
    ).resolves.toEqual({ ok: false, reason: "replay" });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("rejects an out-of-order heartbeat before any write", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "device-1",
        organizationId: "org-1",
        siteId: "site-1",
        registrationStatus: "verified",
        status: "online",
        lastSeenAt: new Date("2026-07-31T00:01:00Z"),
        staleThresholdSec: 300,
        maintenanceAt: null,
        rolloutId: null,
        configurationId: null,
        configurationVersion: null,
        configChecksum: null,
        signature: null,
        assignedLayout: null,
        schedule: null,
        emergencyOverride: null,
        contentSource: null,
        weatherSource: null,
      },
    ]);
    const execute = vi.fn().mockResolvedValue(1);
    await expect(
      recordSignageHeartbeat(database(query, execute), {
        deviceId: "device-1",
        nonceHash: "new-nonce",
        observedAt: new Date("2026-07-31T00:00:00Z"),
        status: "online",
        softwareVersion: "1.4.0",
        configurationVersion: null,
        configChecksum: null,
        diagnostics: {},
        now: new Date("2026-07-31T00:01:01Z"),
      }),
    ).resolves.toEqual({ ok: false, reason: "out_of_order" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("stores only a token hash and returns the raw device token once", async () => {
    const execute = vi.fn().mockResolvedValue(1);
    const result = await registerSignageDevice(
      database(vi.fn().mockResolvedValue([]), execute),
      {
        organizationId: "org-1",
        siteId: "site-1",
        name: "朝礼モニター",
        actorUserId: "admin-1",
        tokenSecret: "t".repeat(32),
        staleThresholdSec: 300,
      },
    );
    expect(result.deviceToken.length).toBeGreaterThanOrEqual(32);
    const serializedCalls = JSON.stringify(execute.mock.calls);
    expect(serializedCalls).not.toContain(result.deviceToken);
  });

  it("stages a signed canary rollout with a previous-version rollback target", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ next: 4 }])
      .mockResolvedValueOnce([
        {
          id: "device-1",
          previousConfiguration: "config-3",
          fleetCount: 10,
        },
      ]);
    const execute = vi.fn().mockResolvedValue(1);
    const result = await stageSignageConfiguration(database(query, execute), {
      organizationId: "org-1",
      siteId: "site-1",
      deviceIds: ["device-1"],
      rolloutStage: "canary",
      configuration: {
        assignedLayout: "morning",
        schedule: [],
        emergencyOverride: null,
        contentSource: { feeds: ["jma-warning"] },
        weatherSource: { provider: "jma", areaCode: "130000" },
      },
      actorUserId: "admin-1",
      signingSecret: "s".repeat(32),
      signingKeyVersion: 1,
    });
    expect(result).toMatchObject({ version: 4 });
    expect(result.checksum).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(execute.mock.calls.some((call) =>
      String(call[0]).includes('"SignageFleetRollout"'),
    )).toBe(true);
    expect(String(query.mock.calls[1]?.[0])).toContain(
      'device."siteId" = $3',
    );
  });

  it("promotes only after the prior stage is applied and healthy", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "config-4", siteId: "site-1", status: "published" },
      ])
      .mockResolvedValueOnce([
        {
          id: "rollout-canary",
          status: "acknowledged",
          acknowledgement: "applied",
          deviceStatus: "online",
          lastSeenAt: new Date("2026-07-31T00:00:00Z"),
          heartbeatFresh: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "device-canary",
          existingRollout: "rollout-canary",
          previousConfiguration: "config-3",
        },
        {
          id: "device-2",
          existingRollout: null,
          previousConfiguration: "config-3",
        },
      ]);
    const execute = vi.fn().mockResolvedValue(1);
    const result = await promoteSignageConfiguration(
      database(query, execute),
      {
        organizationId: "org-1",
        configurationId: "config-4",
        deviceIds: ["device-2"],
        rolloutStage: "staged",
        actorUserId: "admin-1",
      },
    );
    expect(result).toMatchObject({ ok: true, rolloutStage: "staged" });
    expect(String(query.mock.calls[2]?.[0])).toContain(
      'device."siteId" = $3',
    );
    expect(
      execute.mock.calls.some(
        (call) =>
          String(call[0]).includes('"SignageFleetRollout"') &&
          call.includes("staged"),
      ),
    ).toBe(true);
  });

  it("refuses a staged promotion while the canary lacks acknowledgement", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "config-4", siteId: "site-1", status: "published" },
      ])
      .mockResolvedValueOnce([
        {
          id: "rollout-canary",
          status: "deployed",
          acknowledgement: null,
          deviceStatus: "online",
          lastSeenAt: new Date("2026-07-31T00:00:00Z"),
          heartbeatFresh: true,
        },
      ]);
    const execute = vi.fn().mockResolvedValue(1);
    await expect(
      promoteSignageConfiguration(database(query, execute), {
        organizationId: "org-1",
        configurationId: "config-4",
        deviceIds: ["device-2"],
        rolloutStage: "staged",
        actorUserId: "admin-1",
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "canary_acknowledgement_or_health_required",
    });
    expect(
      execute.mock.calls.some((call) =>
        String(call[0]).includes('"SignageFleetRollout"'),
      ),
    ).toBe(false);
  });
});
