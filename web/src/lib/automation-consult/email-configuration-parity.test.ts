import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAutomationConsultAvailability } from "./availability";
import { getAutomationConsultEmailConfiguration } from "./email";

const completeEnvironment = {
  AUTOMATION_CONSULT_PUBLIC_STATUS: "available",
  AUTOMATION_CONSULT_RECIPIENTS: "primary@gmail.com,audit@outlook.com",
  AUTOMATION_CONSULT_FROM: "Portal <noreply@example.test>",
  NOTIFY_FROM: "Portal <fallback@example.test>",
  RESEND_API_KEY: "synthetic-test-key",
  AUTOMATION_CONSULT_STATE_BACKEND: "upstash",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "synthetic-test-token-long",
  AUTOMATION_CONSULT_STATE_HASH_SECRET: "x".repeat(32),
  AUTOMATION_CONSULT_FROM_VERIFIED: "true",
  AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK: "true",
  AUTOMATION_CONSULT_STATE_VERIFIED: "true",
  AUTOMATION_CONSULT_DELIVERY_VERIFIED: "true",
  AUTOMATION_CONSULT_RETENTION_DAYS: "30",
  AUTOMATION_CONSULT_RETENTION_POLICY_ACK: "true",
  AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED: "true",
};

describe("consultation configuration normalization parity", () => {
  beforeEach(() => {
    for (const [name, value] of Object.entries(completeEnvironment)) {
      vi.stubEnv(name, value);
    }
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses the existing notification sender for an empty or space-only explicit sender", () => {
    for (const from of ["", "   "]) {
      vi.stubEnv("AUTOMATION_CONSULT_FROM", from);
      expect(getAutomationConsultAvailability().webFormEnabled).toBe(true);
      expect(getAutomationConsultEmailConfiguration()).toEqual({
        ok: true,
        from: completeEnvironment.NOTIFY_FROM,
        recipients: ["primary@gmail.com", "audit@outlook.com"],
      });
    }
  });

  it("ignores only empty recipient entries and preserves configured recipient order", () => {
    vi.stubEnv("AUTOMATION_CONSULT_RECIPIENTS", " audit@outlook.com, primary@gmail.com, ");
    expect(getAutomationConsultAvailability().webFormEnabled).toBe(true);
    expect(getAutomationConsultEmailConfiguration()).toEqual({
      ok: true,
      from: completeEnvironment.AUTOMATION_CONSULT_FROM,
      recipients: ["audit@outlook.com", "primary@gmail.com"],
    });
  });

  it.each([
    ["nonempty invalid explicit sender", { AUTOMATION_CONSULT_FROM: "invalid sender" }],
    ["empty sender without fallback", { AUTOMATION_CONSULT_FROM: "   ", NOTIFY_FROM: "" }],
    ["three nonempty recipients", { AUTOMATION_CONSULT_RECIPIENTS: "primary@gmail.com,audit@outlook.com,third@example.test" }],
    ["one unique recipient", { AUTOMATION_CONSULT_RECIPIENTS: "primary@gmail.com,primary@gmail.com," }],
    ["control-only explicit sender", { AUTOMATION_CONSULT_FROM: "\r\n" }],
    ["control-only recipient entry", { AUTOMATION_CONSULT_RECIPIENTS: "primary@gmail.com,audit@outlook.com,\r\n" }],
    ["sender header injection", { AUTOMATION_CONSULT_FROM: "Portal <noreply@example.test>\r\nBcc:third@example.test" }],
    ["recipient header injection", { AUTOMATION_CONSULT_RECIPIENTS: "primary@gmail.com,audit@outlook.com\r\nBcc:third@example.test" }],
    ["control-only fallback sender", { AUTOMATION_CONSULT_FROM: "", NOTIFY_FROM: "\u0000" }],
  ])("fails closed for %s", (_label, overrides) => {
    for (const [name, value] of Object.entries(overrides)) {
      vi.stubEnv(name, value);
    }
    expect(getAutomationConsultEmailConfiguration()).toEqual({ ok: false });
  });
});
