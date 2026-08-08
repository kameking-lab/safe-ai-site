import { beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  __resetAutomationConsultIdempotencyForTests,
  beginAutomationConsultIdempotency,
  completeAutomationConsultIdempotency,
  failAutomationConsultIdempotency,
  fingerprintAutomationConsultInput,
  isValidAutomationConsultIdempotencyKey,
  parseAutomationConsultSubmissionDate,
} from "./idempotency";

const HASH_SECRET = "test-only-automation-consult-state-secret-0123456789";
const fingerprint = (value: unknown) => {
  const result = fingerprintAutomationConsultInput(value, HASH_SECRET);
  if (!result) throw new Error("test fingerprint was not created");
  return result;
};

describe("automation consult idempotency", () => {
  beforeEach(() => __resetAutomationConsultIdempotencyForTests());

  it("validates opaque keys and never accepts header injection", () => {
    const now = Date.now();
    const key = `${now.toString(36)}.request-1234567890`;
    expect(isValidAutomationConsultIdempotencyKey(key)).toBe(true);
    expect(parseAutomationConsultSubmissionDate(key, now)?.getTime()).toBe(now);
    expect(isValidAutomationConsultIdempotencyKey("short")).toBe(false);
    expect(isValidAutomationConsultIdempotencyKey("request-123456\r\nbad")).toBe(false);
    const expired = `${(now - 25 * 60 * 60 * 1_000).toString(36)}.request-1234567890`;
    expect(parseAutomationConsultSubmissionDate(expired, now)).toBeNull();
  });

  it("blocks concurrent duplicates, replays success, and rejects changed bodies", () => {
    const key = `${Date.now().toString(36)}.request-1234567890`;
    const bodyFingerprint = fingerprint({ value: 1 });
    expect(beginAutomationConsultIdempotency(key, bodyFingerprint, 1)).toEqual({ state: "new" });
    expect(beginAutomationConsultIdempotency(key, bodyFingerprint, 2)).toEqual({
      state: "pending",
    });
    expect(
      beginAutomationConsultIdempotency(
        key,
        fingerprint({ value: 2 }),
        2
      )
    ).toEqual({ state: "conflict" });

    const response = {
      ok: true as const,
      referenceId: "AC-20260723-ABCDEF12",
      receivedAt: "2026-07-23T00:00:00.000Z",
    };
    completeAutomationConsultIdempotency(key, response, 3);
    expect(beginAutomationConsultIdempotency(key, bodyFingerprint, 4)).toEqual({
      state: "replay",
      response,
    });
  });

  it("allows a safe retry after a failed attempt", () => {
    const key = `${Date.now().toString(36)}.request-1234567890`;
    const bodyFingerprint = fingerprint({ value: 1 });
    beginAutomationConsultIdempotency(key, bodyFingerprint, 1);
    failAutomationConsultIdempotency(key);
    expect(beginAutomationConsultIdempotency(key, bodyFingerprint, 2)).toEqual({ state: "new" });
  });

  it("releases a crashed pending attempt after five minutes", () => {
    const key = `${Date.now().toString(36)}.request-1234567890`;
    const bodyFingerprint = fingerprint({ value: 1 });
    expect(beginAutomationConsultIdempotency(key, bodyFingerprint, 1)).toEqual({ state: "new" });
    expect(beginAutomationConsultIdempotency(key, bodyFingerprint, 5 * 60 * 1_000)).toEqual({
      state: "pending",
    });
    expect(beginAutomationConsultIdempotency(key, bodyFingerprint, 5 * 60 * 1_000 + 1)).toEqual({
      state: "new",
    });
  });

  it("fails closed without a strong secret and never stores a plain body digest", () => {
    const body = {
      email: "requester@example.test",
      currentProblem: "synthetic consultation text",
    };
    expect(fingerprintAutomationConsultInput(body, undefined)).toBeNull();
    expect(fingerprintAutomationConsultInput(body, "too-short")).toBeNull();

    const protectedFingerprint = fingerprint(body);
    const plainDigest = createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex");
    expect(protectedFingerprint).not.toBe(plainDigest);
    expect(protectedFingerprint).not.toContain(body.email);
    expect(protectedFingerprint).not.toContain(body.currentProblem);
    expect(fingerprintAutomationConsultInput(body, `${HASH_SECRET}-other`)).not.toBe(
      protectedFingerprint,
    );
  });
});
