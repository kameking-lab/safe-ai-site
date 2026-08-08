import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";

const ENCRYPTION_VERSION = "v1";
type Environment = Record<string, string | undefined>;

function deriveEncryptionKey(secret: string): Buffer {
  if (secret.trim().length < 32) {
    throw new Error("automation_consult_queue_secret_invalid");
  }
  return createHash("sha256")
    .update("automation-consult-queue-encryption-v1")
    .update("\0")
    .update(secret)
    .digest();
}

export function encryptAutomationConsultQueueValue(
  value: unknown,
  aad: string,
  secret: string,
): string {
  const key = deriveEncryptionKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptAutomationConsultQueueValue<T>(
  encrypted: string,
  aad: string,
  secret: string,
): T {
  const [version, ivValue, tagValue, ciphertextValue] = encrypted.split(".");
  if (
    version !== ENCRYPTION_VERSION ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue
  ) {
    throw new Error("automation_consult_queue_ciphertext_invalid");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveEncryptionKey(secret),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

function stateSecret(env: Environment = process.env): string | null {
  const value =
    env.AUTOMATION_CONSULT_QUEUE_ENCRYPTION_SECRET?.trim() ||
    env.AUTOMATION_CONSULT_STATE_HASH_SECRET?.trim();
  return value && value.length >= 32 ? value : null;
}

function retentionDays(env: Environment = process.env): number | null {
  const value = Number(env.AUTOMATION_CONSULT_RETENTION_DAYS);
  return Number.isInteger(value) && value >= 7 && value <= 90 ? value : null;
}

export function automationConsultQueueConfiguration(
  env: Environment = process.env,
):
  | { ok: true; secret: string; retentionDays: number; keyVersion: number }
  | { ok: false } {
  const secret = stateSecret(env);
  const days = retentionDays(env);
  const keyVersion = Number(env.AUTOMATION_CONSULT_QUEUE_KEY_VERSION ?? "1");
  if (
    !secret ||
    !days ||
    !Number.isInteger(keyVersion) ||
    keyVersion < 1 ||
    env.AUTOMATION_CONSULT_QUEUE_ENABLED?.trim().toLowerCase() !== "true" ||
    env.AUTOMATION_CONSULT_QUEUE_RETENTION_ACK?.trim().toLowerCase() !==
      "true" ||
    env.AUTOMATION_CONSULT_QUEUE_OPERATIONS_OWNER_CONFIGURED?.trim().toLowerCase() !==
      "true" ||
    env.AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED?.trim().toLowerCase() !==
      "true"
  ) {
    return { ok: false };
  }
  return { ok: true, secret, retentionDays: days, keyVersion };
}

function hmac(value: string, domain: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(domain)
    .update("\0")
    .update(value)
    .digest("base64url");
}

function emailFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const email = (payload as { email?: unknown }).email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export async function enqueueAutomationConsult(
  database: GovernanceDatabase,
  input: {
    referenceId: string;
    idempotencyKey: string;
    payload: unknown;
    configuration: {
      secret: string;
      retentionDays: number;
      keyVersion: number;
    };
    now?: Date;
  },
): Promise<{ ticketId: string; queued: boolean }> {
  const ticketId = randomUUID();
  const now = input.now ?? new Date();
  const retentionUntil = new Date(
    now.getTime() + input.configuration.retentionDays * 24 * 60 * 60 * 1_000,
  );
  const encryptedPayload = encryptAutomationConsultQueueValue(
    input.payload,
    `ticket:${ticketId}:payload`,
    input.configuration.secret,
  );
  const idempotencyKeyHash = hmac(
    input.idempotencyKey,
    "automation-consult-queue-idempotency-v1",
    input.configuration.secret,
  );
  const requesterHash = hmac(
    emailFromPayload(input.payload) || input.idempotencyKey,
    "automation-consult-queue-requester-v1",
    input.configuration.secret,
  );
  return database.$transaction(async (transaction) => {
    const changed = await transaction.$executeRawUnsafe(
      `
        INSERT INTO "AutomationConsultTicket" (
          "id", "referenceId", "idempotencyKeyHash", "requesterHash",
          "encryptedPayload", "encryptionKeyVersion", "status",
          "emailDeliveryStatus", "retentionUntil", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'queued', 'waiting-provider', $7,
          clock_timestamp(), clock_timestamp()
        )
        ON CONFLICT ("idempotencyKeyHash") DO NOTHING
      `,
      ticketId,
      input.referenceId,
      idempotencyKeyHash,
      requesterHash,
      encryptedPayload,
      input.configuration.keyVersion,
      retentionUntil,
    );
    if (changed !== 1) {
      const existing = await transaction.$queryRawUnsafe<
        Array<{ id: string }>
      >(
        `
          SELECT "id"
          FROM "AutomationConsultTicket"
          WHERE "idempotencyKeyHash" = $1
          LIMIT 1
        `,
        idempotencyKeyHash,
      );
      if (!existing[0]) throw new Error("automation_consult_queue_conflict");
      return { ticketId: existing[0].id, queued: false };
    }
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "actorUserId", "scope", "entityType", "entityId",
          "action", "toStatus", "metadata", "createdAt"
        ) VALUES (
          'public-consult', 'anonymous', 'automation-consult', 'ticket', $1,
          'queued', 'queued', $2::jsonb, clock_timestamp()
        )
      `,
      ticketId,
      JSON.stringify({
        referenceId: input.referenceId,
        retentionUntil: retentionUntil.toISOString(),
        emailDeliveryStatus: "waiting-provider",
      }),
    );
    return { ticketId, queued: true };
  });
}

export type AutomationConsultQueueRow = {
  id: string;
  referenceId: string;
  status: string;
  assignedUserId: string | null;
  emailDeliveryStatus: string;
  retentionUntil: Date;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listAutomationConsultQueue(
  database: GovernanceSql,
): Promise<AutomationConsultQueueRow[]> {
  return database.$queryRawUnsafe<AutomationConsultQueueRow[]>(
    `
      SELECT
        "id", "referenceId", "status", "assignedUserId",
        "emailDeliveryStatus", "retentionUntil", "deletedAt", "createdAt",
        "updatedAt"
      FROM "AutomationConsultTicket"
      WHERE "deletedAt" IS NULL
      ORDER BY "createdAt" ASC
      LIMIT 500
    `,
  );
}

export async function readAutomationConsultTicketPayload<T>(
  database: GovernanceSql,
  input: { ticketId: string; secret: string },
): Promise<
  | {
      referenceId: string;
      payload: T;
      createdAt: Date;
      emailDeliveryStatus: string;
    }
  | null
> {
  const rows = await database.$queryRawUnsafe<
    Array<{
      referenceId: string;
      encryptedPayload: string;
      createdAt: Date;
      emailDeliveryStatus: string;
    }>
  >(
    `
      SELECT
        "referenceId", "encryptedPayload", "createdAt",
        "emailDeliveryStatus"
      FROM "AutomationConsultTicket"
      WHERE "id" = $1 AND "deletedAt" IS NULL
      LIMIT 1
    `,
    input.ticketId,
  );
  const row = rows[0];
  if (!row || row.encryptedPayload === "deleted") return null;
  return {
    referenceId: row.referenceId,
    payload: decryptAutomationConsultQueueValue<T>(
      row.encryptedPayload,
      `ticket:${input.ticketId}:payload`,
      input.secret,
    ),
    createdAt: row.createdAt,
    emailDeliveryStatus: row.emailDeliveryStatus,
  };
}

export async function markAutomationConsultTicketProviderAccepted(
  database: GovernanceDatabase,
  input: { ticketId: string; actorUserId: string },
): Promise<boolean> {
  return database.$transaction(async (transaction) => {
    const changed = await transaction.$executeRawUnsafe(
      `
        UPDATE "AutomationConsultTicket"
        SET
          "emailDeliveryStatus" = 'provider-accepted',
          "status" = CASE WHEN "status" = 'queued' THEN 'reviewing' ELSE "status" END,
          "updatedAt" = clock_timestamp()
        WHERE "id" = $1
          AND "deletedAt" IS NULL
          AND "emailDeliveryStatus" <> 'provider-accepted'
      `,
      input.ticketId,
    );
    if (changed !== 1) return false;
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "actorUserId", "scope", "entityType", "entityId",
          "action", "toStatus", "createdAt"
        ) VALUES (
          'public-consult', $1, 'automation-consult', 'ticket', $2,
          'email-provider-accepted', 'provider-accepted', clock_timestamp()
        )
      `,
      input.actorUserId,
      input.ticketId,
    );
    return true;
  });
}

export async function updateAutomationConsultTicket(
  database: GovernanceDatabase,
  input: {
    ticketId: string;
    actorUserId: string;
    status: "queued" | "reviewing" | "assigned" | "waiting-provider" | "closed";
    assignedUserId: string | null;
    internalNote: string | null;
    secret: string;
    keyVersion: number;
  },
): Promise<boolean> {
  const encryptedNote = input.internalNote
    ? encryptAutomationConsultQueueValue(
        { note: input.internalNote },
        `ticket:${input.ticketId}:internal-note`,
        input.secret,
      )
    : null;
  return database.$transaction(async (transaction) => {
    const changed = await transaction.$executeRawUnsafe(
      `
        UPDATE "AutomationConsultTicket"
        SET
          "status" = $2,
          "assignedUserId" = $3,
          "encryptedInternalNote" = $4,
          "encryptionKeyVersion" = $5,
          "updatedAt" = clock_timestamp()
        WHERE "id" = $1 AND "deletedAt" IS NULL
      `,
      input.ticketId,
      input.status,
      input.assignedUserId,
      encryptedNote,
      input.keyVersion,
    );
    if (changed !== 1) return false;
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "actorUserId", "scope", "entityType", "entityId",
          "action", "toStatus", "metadata", "createdAt"
        ) VALUES (
          'public-consult', $1, 'automation-consult', 'ticket', $2,
          'admin-updated', $3, $4::jsonb, clock_timestamp()
        )
      `,
      input.actorUserId,
      input.ticketId,
      input.status,
      JSON.stringify({
        assigned: Boolean(input.assignedUserId),
        internalNotePresent: Boolean(input.internalNote),
      }),
    );
    return true;
  });
}

export async function deleteAutomationConsultTicket(
  database: GovernanceDatabase,
  input: { ticketId: string; actorUserId: string },
): Promise<boolean> {
  return database.$transaction(async (transaction) => {
    const changed = await transaction.$executeRawUnsafe(
      `
        UPDATE "AutomationConsultTicket"
        SET
          "encryptedPayload" = 'deleted',
          "encryptedInternalNote" = NULL,
          "idempotencyKeyHash" =
            md5(random()::text || clock_timestamp()::text || "id")
            || md5("id" || random()::text),
          "requesterHash" =
            md5(random()::text || clock_timestamp()::text || "id")
            || md5("id" || random()::text),
          "providerMessageIdHash" = NULL,
          "status" = 'deleted',
          "deletedAt" = clock_timestamp(),
          "updatedAt" = clock_timestamp()
        WHERE "id" = $1 AND "deletedAt" IS NULL
      `,
      input.ticketId,
    );
    if (changed !== 1) return false;
    await transaction.$executeRawUnsafe(
      `
        INSERT INTO "GovernanceAuditLog" (
          "organizationId", "actorUserId", "scope", "entityType", "entityId",
          "action", "toStatus", "createdAt"
        ) VALUES (
          'public-consult', $1, 'automation-consult', 'ticket', $2,
          'content-deleted', 'deleted', clock_timestamp()
        )
      `,
      input.actorUserId,
      input.ticketId,
    );
    return true;
  });
}

export async function deleteExpiredAutomationConsultTickets(
  database: GovernanceSql,
): Promise<number> {
  return database.$executeRawUnsafe(
    `
      UPDATE "AutomationConsultTicket"
      SET
        "encryptedPayload" = 'deleted',
        "encryptedInternalNote" = NULL,
        "idempotencyKeyHash" =
          md5(random()::text || clock_timestamp()::text || "id")
          || md5("id" || random()::text),
        "requesterHash" =
          md5(random()::text || clock_timestamp()::text || "id")
          || md5("id" || random()::text),
        "providerMessageIdHash" = NULL,
        "status" = 'deleted',
        "deletedAt" = clock_timestamp(),
        "updatedAt" = clock_timestamp()
      WHERE "retentionUntil" <= clock_timestamp()
        AND "deletedAt" IS NULL
    `,
  );
}
