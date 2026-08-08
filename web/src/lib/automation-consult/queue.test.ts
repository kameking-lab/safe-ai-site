import { describe, expect, it, vi } from "vitest";
import type {
  GovernanceDatabase,
  GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";
import {
  automationConsultQueueConfiguration,
  decryptAutomationConsultQueueValue,
  encryptAutomationConsultQueueValue,
  enqueueAutomationConsult,
  updateAutomationConsultTicket,
} from "./queue";

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

const configuration = {
  secret: "q".repeat(32),
  retentionDays: 30,
  keyVersion: 1,
};

describe("automation consultation encrypted queue", () => {
  it("encrypts with authenticated AAD and rejects tampering or another ticket", () => {
    const encrypted = encryptAutomationConsultQueueValue(
      { email: "person@example.test", body: "相談本文" },
      "ticket:one:payload",
      configuration.secret,
    );
    expect(encrypted).not.toContain("person@example.test");
    expect(encrypted).not.toContain("相談本文");
    expect(
      decryptAutomationConsultQueueValue(
        encrypted,
        "ticket:one:payload",
        configuration.secret,
      ),
    ).toEqual({ email: "person@example.test", body: "相談本文" });
    expect(() =>
      decryptAutomationConsultQueueValue(
        encrypted,
        "ticket:two:payload",
        configuration.secret,
      ),
    ).toThrow();
  });

  it("requires retention, owner, admin path, and an encryption secret", () => {
    const complete = {
      AUTOMATION_CONSULT_QUEUE_ENABLED: "true",
      AUTOMATION_CONSULT_QUEUE_RETENTION_ACK: "true",
      AUTOMATION_CONSULT_QUEUE_OPERATIONS_OWNER_CONFIGURED: "true",
      AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED: "true",
      AUTOMATION_CONSULT_RETENTION_DAYS: "30",
      AUTOMATION_CONSULT_QUEUE_KEY_VERSION: "1",
      AUTOMATION_CONSULT_STATE_HASH_SECRET: "x".repeat(32),
    };
    expect(automationConsultQueueConfiguration(complete)).toMatchObject({
      ok: true,
      retentionDays: 30,
    });
    expect(
      automationConsultQueueConfiguration({
        ...complete,
        AUTOMATION_CONSULT_QUEUE_RETENTION_ACK: "false",
      }),
    ).toEqual({ ok: false });
  });

  it("persists ciphertext and hashed keys, never raw PII or body", async () => {
    const execute = vi.fn().mockResolvedValue(1);
    const result = await enqueueAutomationConsult(
      database(vi.fn().mockResolvedValue([]), execute),
      {
        referenceId: "AC-20260731-TEST0001",
        idempotencyKey: "abcdef12.abcdefghijklmnop",
        payload: {
          email: "person@example.test",
          currentProblem: "顧客名を含む相談本文",
        },
        configuration,
        now: new Date("2026-07-31T00:00:00Z"),
      },
    );
    expect(result.queued).toBe(true);
    const serialized = JSON.stringify(execute.mock.calls);
    expect(serialized).not.toContain("person@example.test");
    expect(serialized).not.toContain("顧客名を含む相談本文");
    expect(serialized).not.toContain("abcdefghijklmnop");
    expect(serialized).toContain("AutomationConsultTicket");
    expect(serialized).toContain("GovernanceAuditLog");
  });

  it("encrypts internal notes and writes only metadata to the audit log", async () => {
    const execute = vi.fn().mockResolvedValue(1);
    await expect(
      updateAutomationConsultTicket(database(vi.fn(), execute), {
        ticketId: "ticket-1",
        actorUserId: "admin-1",
        status: "assigned",
        assignedUserId: "admin-1",
        internalNote: "相談者へ明日返信する",
        secret: configuration.secret,
        keyVersion: 1,
      }),
    ).resolves.toBe(true);
    const serialized = JSON.stringify(execute.mock.calls);
    expect(serialized).not.toContain("相談者へ明日返信する");
    expect(serialized).toContain("internalNotePresent");
  });
});
