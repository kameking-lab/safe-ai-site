import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";
import {
  deriveSignageDeviceState,
  hashSignageDeviceToken,
  isSignageEmergencyOverrideActive,
  signSignageConfiguration,
  type SignageDeviceState,
} from "@/lib/signage/fleet-governance";

export type SignageFleetRow = {
  siteId: string;
  siteCode: string;
  siteName: string;
  deviceId: string | null;
  deviceName: string | null;
  registrationStatus: string | null;
  storedStatus: string | null;
  effectiveStatus: string;
  lastSeenAt: Date | null;
  softwareVersion: string | null;
  configurationVersion: number | null;
  assignedLayout: string | null;
  staleThresholdSec: number | null;
  rolloutStatus: string | null;
  rolloutStage: string | null;
  rolloutConfigurationVersion: number | null;
  acknowledgedAt: Date | null;
};

export async function listSignageFleet(
  database: GovernanceSql,
  organizationId: string,
): Promise<SignageFleetRow[]> {
  return database.$queryRawUnsafe<SignageFleetRow[]>(
    `
      SELECT
        site."id" AS "siteId",
        site."code" AS "siteCode",
        site."name" AS "siteName",
        device."id" AS "deviceId",
        device."name" AS "deviceName",
        device."registrationStatus",
        device."status" AS "storedStatus",
        CASE
          WHEN device."id" IS NULL THEN 'unknown'
          WHEN device."registrationStatus" <> 'verified' THEN 'unknown'
          WHEN device."maintenanceAt" IS NOT NULL THEN 'maintenance'
          WHEN device."lastSeenAt" IS NULL THEN 'unknown'
          WHEN device."status" = 'emergency' THEN 'emergency'
          WHEN clock_timestamp() - device."lastSeenAt" >
            device."staleThresholdSec" * interval '6 seconds' THEN 'offline'
          WHEN clock_timestamp() - device."lastSeenAt" >
            device."staleThresholdSec" * interval '2 seconds' THEN 'stale'
          WHEN clock_timestamp() - device."lastSeenAt" >
            device."staleThresholdSec" * interval '1 second' THEN 'delayed'
          WHEN device."status" = 'degraded' THEN 'degraded'
          ELSE 'online'
        END AS "effectiveStatus",
        device."lastSeenAt",
        device."softwareVersion",
        device."configurationVersion",
        device."assignedLayout",
        device."staleThresholdSec",
        rollout."status" AS "rolloutStatus",
        rollout."rolloutStage",
        configuration."versionNumber" AS "rolloutConfigurationVersion",
        rollout."acknowledgedAt"
      FROM "SafetySite" AS site
      LEFT JOIN "SignageFleetDevice" AS device
        ON device."siteId" = site."id"
       AND device."organizationId" = site."organizationId"
       AND device."registrationStatus" <> 'revoked'
      LEFT JOIN LATERAL (
        SELECT item.*
        FROM "SignageFleetRollout" item
        WHERE item."deviceId" = device."id"
        ORDER BY item."createdAt" DESC
        LIMIT 1
      ) rollout ON true
      LEFT JOIN "SignageFleetConfiguration" AS configuration
        ON configuration."id" = rollout."configurationId"
      WHERE site."organizationId" = $1
        AND site."status" = 'active'
      ORDER BY site."name", device."name"
    `,
    organizationId,
  );
}

type DeviceAuthRow = {
  id: string;
  organizationId: string;
  siteId: string;
  registrationStatus: string;
};

export async function authenticateSignageDevice(
  database: GovernanceSql,
  tokenHash: string,
): Promise<DeviceAuthRow | null> {
  const rows = await database.$queryRawUnsafe<DeviceAuthRow[]>(
    `
      SELECT "id", "organizationId", "siteId", "registrationStatus"
      FROM "SignageFleetDevice"
      WHERE "deviceTokenHash" = $1
        AND "registrationStatus" = 'verified'
      LIMIT 1
    `,
    tokenHash,
  );
  return rows[0] ?? null;
}

type HeartbeatDeviceRow = {
  id: string;
  organizationId: string;
  siteId: string;
  registrationStatus: "unverified" | "verified" | "revoked";
  status: string;
  lastSeenAt: Date | null;
  staleThresholdSec: number;
  maintenanceAt: Date | null;
  rolloutId: string | null;
  configurationId: string | null;
  configurationVersion: number | null;
  configChecksum: string | null;
  signature: string | null;
  assignedLayout: string | null;
  schedule: unknown;
  emergencyOverride: unknown;
  contentSource: unknown;
  weatherSource: unknown;
};

export async function recordSignageHeartbeat(
  database: GovernanceDatabase,
  input: {
    deviceId: string;
    nonceHash: string;
    observedAt: Date;
    status: "online" | "degraded" | "emergency";
    softwareVersion: string;
    configurationVersion: number | null;
    configChecksum: string | null;
    diagnostics: Record<string, string | number | boolean | null>;
    now?: Date;
  },
): Promise<
  | {
      ok: true;
      state: SignageDeviceState;
      configuration: null | {
        id: string;
        version: number;
        checksum: string;
        signature: string;
        layout: string;
        schedule: unknown;
        emergencyOverride: unknown;
        contentSource: unknown;
        weatherSource: unknown;
      };
      acknowledged: boolean;
    }
  | { ok: false; reason: "device_not_found" | "replay" | "out_of_order" }
> {
  return database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRawUnsafe<HeartbeatDeviceRow[]>(
      `
        SELECT
          device."id",
          device."organizationId",
          device."siteId",
          device."registrationStatus",
          device."status",
          device."lastSeenAt",
          device."staleThresholdSec",
          device."maintenanceAt",
          rollout."id" AS "rolloutId",
          configuration."id" AS "configurationId",
          configuration."versionNumber" AS "configurationVersion",
          configuration."configChecksum",
          configuration."signature",
          configuration."assignedLayout",
          configuration."schedule",
          configuration."emergencyOverride",
          configuration."contentSource",
          configuration."weatherSource"
        FROM "SignageFleetDevice" device
        LEFT JOIN LATERAL (
          SELECT item.*
          FROM "SignageFleetRollout" item
          WHERE item."deviceId" = device."id"
            AND item."status" IN ('pending', 'deploying', 'deployed')
          ORDER BY item."createdAt" DESC
          LIMIT 1
        ) rollout ON true
        LEFT JOIN "SignageFleetConfiguration" configuration
          ON configuration."id" = rollout."configurationId"
        WHERE device."id" = $1
          AND device."registrationStatus" = 'verified'
        FOR UPDATE OF device
      `,
      input.deviceId,
    );
    const device = rows[0];
    if (!device) return { ok: false, reason: "device_not_found" };
    if (
      device.lastSeenAt &&
      input.observedAt.getTime() <= device.lastSeenAt.getTime()
    ) {
      return { ok: false, reason: "out_of_order" };
    }

    const evaluatedAt = input.now ?? new Date();
    const state = deriveSignageDeviceState(
      {
        registrationStatus: device.registrationStatus,
        lastSeenAt: input.observedAt,
        staleThresholdSec: device.staleThresholdSec,
        reportedStatus: input.status,
        maintenanceAt: device.maintenanceAt,
        emergencyActive:
          input.status === "emergency" ||
          isSignageEmergencyOverrideActive(
            device.emergencyOverride,
            evaluatedAt,
          ),
      },
      evaluatedAt,
    );
    try {
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "SignageFleetHeartbeat" (
            "deviceId", "nonceHash", "observedAt", "receivedAt", "status",
            "softwareVersion", "configurationVersion", "configChecksum",
            "diagnostics"
          ) VALUES (
            $1, $2, $3, clock_timestamp(), $4, $5, $6, $7, $8::jsonb
          )
        `,
        input.deviceId,
        input.nonceHash,
        input.observedAt,
        input.status,
        input.softwareVersion,
        input.configurationVersion,
        input.configChecksum,
        JSON.stringify(input.diagnostics),
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        return { ok: false, reason: "replay" };
      }
      throw error;
    }
    await transaction.$executeRawUnsafe(
      `
        UPDATE "SignageFleetDevice"
        SET
          "lastSeenAt" = $2,
          "status" = $3,
          "softwareVersion" = $4,
          "configurationVersion" = $5,
          "updatedAt" = clock_timestamp()
        WHERE "id" = $1
      `,
      input.deviceId,
      input.observedAt,
      state,
      input.softwareVersion,
      input.configurationVersion,
    );

    const acknowledged =
      Boolean(device.rolloutId) &&
      Boolean(device.configChecksum) &&
      input.configChecksum === device.configChecksum &&
      input.configurationVersion === device.configurationVersion;
    if (acknowledged && device.rolloutId && device.configChecksum) {
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "SignageFleetAcknowledgement" (
            "id", "deviceId", "rolloutId", "configChecksum",
            "acknowledgement", "acknowledgedAt", "createdAt"
          ) VALUES (
            $1, $2, $3, $4, 'applied', $5, clock_timestamp()
          )
          ON CONFLICT ("deviceId", "rolloutId") DO NOTHING
        `,
        randomUUID(),
        input.deviceId,
        device.rolloutId,
        device.configChecksum,
        input.observedAt,
      );
      await transaction.$executeRawUnsafe(
        `
          UPDATE "SignageFleetRollout"
          SET
            "status" = 'acknowledged',
            "acknowledgedAt" = $2,
            "updatedAt" = clock_timestamp()
          WHERE "id" = $1
        `,
        device.rolloutId,
        input.observedAt,
      );
    }
    if (device.status !== state || acknowledged) {
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "GovernanceAuditLog" (
            "organizationId", "siteId", "actorUserId", "scope", "entityType",
            "entityId", "action", "fromStatus", "toStatus", "metadata",
            "createdAt"
          ) VALUES (
            $1, $2, $3, 'signage', 'device', $3, $4, $5, $6,
            $7::jsonb, clock_timestamp()
          )
        `,
        device.organizationId,
        device.siteId,
        device.id,
        acknowledged ? "heartbeat-and-config-ack" : "heartbeat-state-changed",
        device.status,
        state,
        JSON.stringify({
          configurationVersion: input.configurationVersion,
          acknowledged,
        }),
      );
    }

    const configuration =
      device.configurationId &&
      device.configurationVersion !== null &&
      device.configChecksum &&
      device.signature &&
      device.assignedLayout
        ? {
            id: device.configurationId,
            version: device.configurationVersion,
            checksum: device.configChecksum,
            signature: device.signature,
            layout: device.assignedLayout,
            schedule: device.schedule,
            emergencyOverride: device.emergencyOverride,
            contentSource: device.contentSource,
            weatherSource: device.weatherSource,
          }
        : null;
    return { ok: true, state, configuration, acknowledged };
  });
}

export async function registerSignageDevice(
  database: GovernanceDatabase,
  input: {
    organizationId: string;
    siteId: string;
    name: string;
    actorUserId: string;
    tokenSecret: string;
    staleThresholdSec: number;
  },
): Promise<{ deviceId: string; deviceToken: string }> {
  const deviceId = randomUUID();
  const deviceToken = randomBytes(32).toString("base64url");
  const tokenHash = hashSignageDeviceToken(deviceToken, input.tokenSecret);
  await database.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "SignageFleetDevice" (
          "id", "organizationId", "siteId", "name", "deviceTokenHash",
          "tokenVersion", "tokenRotatedAt", "status", "staleThresholdSec",
          "registrationStatus", "registeredAt", "verifiedAt", "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, 1, clock_timestamp(), 'unknown', $6,
          'verified', clock_timestamp(), clock_timestamp(), clock_timestamp(),
          clock_timestamp()
        )
      `,
      deviceId,
      input.organizationId,
      input.siteId,
      input.name,
      tokenHash,
      input.staleThresholdSec,
    );
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "siteId", "actorUserId", "scope", "entityType",
          "entityId", "action", "toStatus", "metadata", "createdAt"
        ) VALUES (
          $1, $2, $3, 'signage', 'device', $4, 'registered',
          'connection-unconfirmed', $5::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      input.siteId,
      input.actorUserId,
      deviceId,
      JSON.stringify({ tokenVersion: 1, staleThresholdSec: input.staleThresholdSec }),
    );
  });
  return { deviceId, deviceToken };
}

export async function rotateSignageDeviceToken(
  database: GovernanceDatabase,
  input: {
    organizationId: string;
    deviceId: string;
    actorUserId: string;
    tokenSecret: string;
  },
): Promise<{ deviceToken: string } | null> {
  const deviceToken = randomBytes(32).toString("base64url");
  const tokenHash = hashSignageDeviceToken(deviceToken, input.tokenSecret);
  return database.$transaction(async (transaction) => {
    const changed = await transaction.$executeRawUnsafe(
      `
        UPDATE "SignageFleetDevice"
        SET
          "deviceTokenHash" = $3,
          "tokenVersion" = "tokenVersion" + 1,
          "tokenRotatedAt" = clock_timestamp(),
          "status" = 'unknown',
          "lastSeenAt" = NULL,
          "updatedAt" = clock_timestamp()
        WHERE "id" = $1
          AND "organizationId" = $2
          AND "registrationStatus" = 'verified'
      `,
      input.deviceId,
      input.organizationId,
      tokenHash,
    );
    if (changed !== 1) return null;
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "actorUserId", "scope", "entityType", "entityId",
          "action", "toStatus", "createdAt"
        ) VALUES (
          $1, $2, 'signage', 'device', $3, 'token-rotated',
          'connection-unconfirmed', clock_timestamp()
        )
      `,
      input.organizationId,
      input.actorUserId,
      input.deviceId,
    );
    return { deviceToken };
  });
}

export type SignageConfigurationInput = {
  assignedLayout: string;
  schedule: unknown;
  emergencyOverride: unknown;
  contentSource: unknown;
  weatherSource: unknown;
};

export async function stageSignageConfiguration(
  database: GovernanceDatabase,
  input: {
    organizationId: string;
    siteId: string | null;
    deviceIds: string[];
    rolloutStage: "preview" | "canary" | "staged" | "all";
    configuration: SignageConfigurationInput;
    actorUserId: string;
    signingSecret: string;
    signingKeyVersion: number;
  },
): Promise<{
  configurationId: string;
  version: number;
  checksum: string;
  rolloutIds: string[];
}> {
  if (input.rolloutStage === "preview" && input.deviceIds.length !== 0) {
    throw new Error("signage_preview_must_not_target_devices");
  }
  if (input.rolloutStage === "canary" && input.deviceIds.length === 0) {
    throw new Error("signage_canary_device_required");
  }
  if (
    input.rolloutStage === "staged" ||
    input.rolloutStage === "all"
  ) {
    throw new Error("signage_rollout_stage_requires_promotion");
  }
  return database.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      `signage-config:${input.organizationId}`,
    );
    const versions = await transaction.$queryRawUnsafe<Array<{ next: number }>>(
      `
        SELECT (COALESCE(MAX("versionNumber"), 0) + 1)::int AS "next"
        FROM "SignageFleetConfiguration"
        WHERE "organizationId" = $1
      `,
      input.organizationId,
    );
    const version = versions[0]?.next ?? 1;
    const signedPayload = {
      version,
      ...input.configuration,
    };
    const signed = signSignageConfiguration(
      signedPayload,
      version,
      input.signingSecret,
    );
    const configurationId = randomUUID();
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "SignageFleetConfiguration" (
          "id", "organizationId", "siteId", "versionNumber",
          "assignedLayout", "schedule", "emergencyOverride", "contentSource",
          "weatherSource", "configChecksum", "signature",
          "signingKeyVersion", "status", "createdByUserId", "createdAt",
          "publishedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb,
          $10, $11, $12, $14, $13, clock_timestamp(),
          CASE WHEN $14 = 'published' THEN clock_timestamp() ELSE NULL END
        )
      `,
      configurationId,
      input.organizationId,
      input.siteId,
      version,
      input.configuration.assignedLayout,
      JSON.stringify(input.configuration.schedule),
      JSON.stringify(input.configuration.emergencyOverride),
      JSON.stringify(input.configuration.contentSource),
      JSON.stringify(input.configuration.weatherSource),
      signed.checksum,
      signed.signature,
      input.signingKeyVersion,
      input.actorUserId,
      input.rolloutStage === "preview" ? "draft" : "published",
    );
    const devices = await transaction.$queryRawUnsafe<
      Array<{
        id: string;
        previousConfiguration: string | null;
        fleetCount: number | string;
      }>
    >(
      `
        SELECT
          device."id",
          previous."configurationId" AS "previousConfiguration",
          (
            SELECT COUNT(*)::int
            FROM "SignageFleetDevice" fleet
            WHERE fleet."organizationId" = $1
              AND fleet."registrationStatus" = 'verified'
              AND ($3::varchar IS NULL OR fleet."siteId" = $3)
          ) AS "fleetCount"
        FROM "SignageFleetDevice" device
        LEFT JOIN LATERAL (
          SELECT rollout."configurationId"
          FROM "SignageFleetRollout" rollout
          WHERE rollout."deviceId" = device."id"
            AND rollout."status" IN ('deployed', 'acknowledged')
          ORDER BY rollout."createdAt" DESC
          LIMIT 1
        ) previous ON true
        WHERE device."organizationId" = $1
          AND device."registrationStatus" = 'verified'
          AND device."id" = ANY($2::varchar[])
          AND ($3::varchar IS NULL OR device."siteId" = $3)
        FOR UPDATE OF device
      `,
      input.organizationId,
      input.deviceIds,
      input.siteId,
    );
    if (devices.length !== input.deviceIds.length) {
      throw new Error("signage_rollout_device_scope_invalid");
    }
    if (input.rolloutStage === "canary") {
      const fleetCount = Number(devices[0]?.fleetCount ?? 0);
      const canaryLimit = Math.max(1, Math.ceil(fleetCount * 0.1));
      if (
        !Number.isInteger(fleetCount) ||
        fleetCount < 1 ||
        devices.length > canaryLimit
      ) {
        throw new Error("signage_canary_scope_too_large");
      }
    }
    const rolloutIds: string[] = [];
    for (const device of devices) {
      const rolloutId = randomUUID();
      rolloutIds.push(rolloutId);
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "SignageFleetRollout" (
            "id", "organizationId", "deviceId", "configurationId",
            "previousConfiguration", "rolloutStage", "status", "scheduledAt",
            "createdByUserId", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'pending', clock_timestamp(), $7,
            clock_timestamp(), clock_timestamp()
          )
        `,
        rolloutId,
        input.organizationId,
        device.id,
        configurationId,
        device.previousConfiguration,
        input.rolloutStage,
        input.actorUserId,
      );
    }
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "siteId", "actorUserId", "scope", "entityType",
          "entityId", "action", "toStatus", "metadata", "createdAt"
        ) VALUES (
          $1, $2, $3, 'signage', 'configuration', $4, 'rollout-staged',
          $5, $6::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      input.siteId,
      input.actorUserId,
      configurationId,
      input.rolloutStage,
      JSON.stringify({
        version,
        checksum: signed.checksum,
        deviceCount: devices.length,
      }),
    );
    return {
      configurationId,
      version,
      checksum: signed.checksum,
      rolloutIds,
    };
  });
}

export async function promoteSignageConfiguration(
  database: GovernanceDatabase,
  input: {
    organizationId: string;
    configurationId: string;
    deviceIds: string[];
    rolloutStage: "staged" | "all";
    actorUserId: string;
  },
): Promise<
  | { ok: true; rolloutIds: string[]; rolloutStage: "staged" | "all" }
  | { ok: false; reason: string }
> {
  if (input.deviceIds.length === 0) {
    return { ok: false, reason: "promotion_devices_required" };
  }
  return database.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      `signage-promotion:${input.organizationId}:${input.configurationId}`,
    );
    const configurations = await transaction.$queryRawUnsafe<
      Array<{ id: string; siteId: string | null; status: string }>
    >(
      `
        SELECT "id", "siteId", "status"
        FROM "SignageFleetConfiguration"
        WHERE "id" = $1
          AND "organizationId" = $2
          AND "status" = 'published'
        FOR UPDATE
      `,
      input.configurationId,
      input.organizationId,
    );
    const configuration = configurations[0];
    if (!configuration) {
      return { ok: false, reason: "configuration_not_found" };
    }

    const requiredPreviousStage =
      input.rolloutStage === "staged" ? "canary" : "staged";
    const previousRollouts = await transaction.$queryRawUnsafe<
      Array<{
        id: string;
        status: string;
        acknowledgement: string | null;
        deviceStatus: string;
        lastSeenAt: Date | null;
        heartbeatFresh: boolean;
      }>
    >(
      `
        SELECT
          rollout."id",
          rollout."status",
          acknowledgement."acknowledgement",
          device."status" AS "deviceStatus",
          device."lastSeenAt",
          (
            device."lastSeenAt" IS NOT NULL
            AND clock_timestamp() - device."lastSeenAt" <=
              device."staleThresholdSec" * interval '1 second'
          ) AS "heartbeatFresh"
        FROM "SignageFleetRollout" rollout
        INNER JOIN "SignageFleetDevice" device
          ON device."id" = rollout."deviceId"
         AND device."organizationId" = rollout."organizationId"
         AND device."registrationStatus" = 'verified'
        LEFT JOIN "SignageFleetAcknowledgement" acknowledgement
          ON acknowledgement."rolloutId" = rollout."id"
         AND acknowledgement."deviceId" = device."id"
        WHERE rollout."organizationId" = $1
          AND rollout."configurationId" = $2
          AND rollout."rolloutStage" = $3
        FOR UPDATE OF rollout, device
      `,
      input.organizationId,
      input.configurationId,
      requiredPreviousStage,
    );
    if (
      previousRollouts.length === 0 ||
      previousRollouts.some(
        (rollout) =>
          rollout.status !== "acknowledged" ||
          rollout.acknowledgement !== "applied" ||
          rollout.deviceStatus !== "online" ||
          !rollout.heartbeatFresh,
      )
    ) {
      return {
        ok: false,
        reason: `${requiredPreviousStage}_acknowledgement_or_health_required`,
      };
    }

    const fleet = await transaction.$queryRawUnsafe<
      Array<{
        id: string;
        existingRollout: string | null;
        previousConfiguration: string | null;
      }>
    >(
      `
        SELECT
          device."id",
          current_config."rolloutId" AS "existingRollout",
          previous."configurationId" AS "previousConfiguration"
        FROM "SignageFleetDevice" device
        LEFT JOIN LATERAL (
          SELECT rollout."id" AS "rolloutId"
          FROM "SignageFleetRollout" rollout
          WHERE rollout."deviceId" = device."id"
            AND rollout."configurationId" = $2
            AND rollout."status" NOT IN ('failed', 'cancelled', 'rolled-back')
          ORDER BY rollout."createdAt" DESC
          LIMIT 1
        ) current_config ON true
        LEFT JOIN LATERAL (
          SELECT rollout."configurationId"
          FROM "SignageFleetRollout" rollout
          WHERE rollout."deviceId" = device."id"
            AND rollout."status" IN ('deployed', 'acknowledged')
          ORDER BY rollout."createdAt" DESC
          LIMIT 1
        ) previous ON true
        WHERE device."organizationId" = $1
          AND device."registrationStatus" = 'verified'
          AND ($3::varchar IS NULL OR device."siteId" = $3)
        FOR UPDATE OF device
      `,
      input.organizationId,
      input.configurationId,
      configuration.siteId,
    );
    const requested = new Set(input.deviceIds);
    if (requested.size !== input.deviceIds.length) {
      return { ok: false, reason: "duplicate_device_id" };
    }
    const byId = new Map(fleet.map((device) => [device.id, device]));
    if (
      input.deviceIds.some(
        (deviceId) =>
          !byId.has(deviceId) || Boolean(byId.get(deviceId)?.existingRollout),
      )
    ) {
      return { ok: false, reason: "promotion_device_scope_invalid" };
    }
    if (
      input.rolloutStage === "all" &&
      fleet.some(
        (device) => !device.existingRollout && !requested.has(device.id),
      )
    ) {
      return { ok: false, reason: "all_stage_requires_complete_fleet" };
    }

    const rolloutIds: string[] = [];
    for (const deviceId of input.deviceIds) {
      const device = byId.get(deviceId);
      if (!device) {
        throw new Error("signage_promotion_device_disappeared");
      }
      const rolloutId = randomUUID();
      rolloutIds.push(rolloutId);
      await transaction.$executeRawUnsafe(
        `
          INSERT INTO "SignageFleetRollout" (
            "id", "organizationId", "deviceId", "configurationId",
            "previousConfiguration", "rolloutStage", "status", "scheduledAt",
            "createdByUserId", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'pending', clock_timestamp(), $7,
            clock_timestamp(), clock_timestamp()
          )
        `,
        rolloutId,
        input.organizationId,
        device.id,
        input.configurationId,
        device.previousConfiguration,
        input.rolloutStage,
        input.actorUserId,
      );
    }
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "siteId", "actorUserId", "scope", "entityType",
          "entityId", "action", "fromStatus", "toStatus", "metadata",
          "createdAt"
        ) VALUES (
          $1, $2, $3, 'signage', 'configuration', $4,
          'rollout-promoted', $5, $6, $7::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      configuration.siteId,
      input.actorUserId,
      input.configurationId,
      requiredPreviousStage,
      input.rolloutStage,
      JSON.stringify({
        requiredPreviousStage,
        rolloutStage: input.rolloutStage,
        deviceCount: rolloutIds.length,
      }),
    );
    return { ok: true, rolloutIds, rolloutStage: input.rolloutStage };
  });
}

export async function rollbackSignageConfiguration(
  database: GovernanceDatabase,
  input: {
    organizationId: string;
    rolloutId: string;
    actorUserId: string;
  },
): Promise<{ rollbackRolloutId: string } | null> {
  return database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRawUnsafe<
      Array<{
        id: string;
        deviceId: string;
        configurationId: string;
        previousConfiguration: string | null;
      }>
    >(
      `
        SELECT "id", "deviceId", "configurationId", "previousConfiguration"
        FROM "SignageFleetRollout"
        WHERE "id" = $1
          AND "organizationId" = $2
          AND "status" IN ('pending', 'deploying', 'deployed', 'acknowledged')
        FOR UPDATE
      `,
      input.rolloutId,
      input.organizationId,
    );
    const current = rows[0];
    if (!current?.previousConfiguration) return null;
    const rollbackRolloutId = randomUUID();
    await transaction.$executeRawUnsafe(
      `
        UPDATE "SignageFleetRollout"
        SET "status" = 'rolled-back',
            "rolledBackAt" = clock_timestamp(),
            "updatedAt" = clock_timestamp()
        WHERE "id" = $1
      `,
      current.id,
    );
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "SignageFleetRollout" (
          "id", "organizationId", "deviceId", "configurationId",
          "previousConfiguration", "rolloutStage", "status", "scheduledAt",
          "createdByUserId", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, 'rollback', 'pending', clock_timestamp(), $6,
          clock_timestamp(), clock_timestamp()
        )
      `,
      rollbackRolloutId,
      input.organizationId,
      current.deviceId,
      current.previousConfiguration,
      current.configurationId,
      input.actorUserId,
    );
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "actorUserId", "scope", "entityType", "entityId",
          "action", "fromStatus", "toStatus", "metadata", "createdAt"
        ) VALUES (
          $1, $2, 'signage', 'rollout', $3, 'rollback-staged',
          'active-configuration', 'previous-configuration',
          $4::jsonb, clock_timestamp()
        )
      `,
      input.organizationId,
      input.actorUserId,
      current.id,
      JSON.stringify({ rollbackRolloutId }),
    );
    return { rollbackRolloutId };
  });
}
