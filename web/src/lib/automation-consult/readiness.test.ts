import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateAutomationConsultReadiness, getAutomationConsultAvailability, getAutomationConsultReadinessReasons } from "./availability";

const complete = {
  AUTOMATION_CONSULT_PUBLIC_STATUS: "available", AUTOMATION_CONSULT_RECIPIENTS: "owner@gmail.com,legacy@outlook.com",
  AUTOMATION_CONSULT_FROM: "Portal <noreply@example.test>", RESEND_API_KEY: "synthetic-long-key",
  AUTOMATION_CONSULT_STATE_BACKEND: "postgres", DATABASE_URL: "postgresql://synthetic-local.test/state",
  AUTOMATION_CONSULT_STATE_HASH_SECRET: "synthetic-state-secret-01234567890123456789",
  AUTOMATION_CONSULT_FROM_VERIFIED: "true", AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK: "true",
  AUTOMATION_CONSULT_STATE_VERIFIED: "true", AUTOMATION_CONSULT_DELIVERY_VERIFIED: "true",
  AUTOMATION_CONSULT_RETENTION_DAYS: "30", AUTOMATION_CONSULT_RETENTION_POLICY_ACK: "true",
  AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED: "true",
};
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe("private readiness predicates", () => {
  it("reports only fixed booleans/enums and preserves complete and paused public shapes", () => {
    expect(getAutomationConsultReadinessReasons(complete)).toEqual([]);
    expect(Object.values(evaluateAutomationConsultReadiness(complete).checks).every(v => typeof v === "boolean")).toBe(true);
    expect(getAutomationConsultAvailability(complete)).toMatchObject({ webFormEnabled: true, intakeMode: "email", retentionDays: 30 });
    expect(getAutomationConsultAvailability({ ...complete, AUTOMATION_CONSULT_PUBLIC_STATUS: " PAUSED " })).toMatchObject({ webFormEnabled: false, accepting: false, contactMode: null });
    expect(getAutomationConsultReadinessReasons({ ...complete, AUTOMATION_CONSULT_PUBLIC_STATUS: "checking" })).toEqual(["public_status_not_available"]);
  });
  it.each([
    ["AUTOMATION_CONSULT_RECIPIENTS", "recipients"], ["RESEND_API_KEY", "resend_key"],
    ["AUTOMATION_CONSULT_STATE_BACKEND", "state_backend"], ["AUTOMATION_CONSULT_STATE_HASH_SECRET", "state_hash_secret"],
    ["AUTOMATION_CONSULT_FROM_VERIFIED", "from_verified"], ["AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK", "bounce_complaint_policy"],
    ["AUTOMATION_CONSULT_STATE_VERIFIED", "state_verified"], ["AUTOMATION_CONSULT_DELIVERY_VERIFIED", "delivery_verified"],
    ["AUTOMATION_CONSULT_RETENTION_POLICY_ACK", "retention_policy"], ["AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED", "admin_review_path"],
  ])("identifies missing common %s without exposing its value", (key, code) => {
    const env = { ...complete, [key]: " " };
    expect(getAutomationConsultReadinessReasons(env)).toContain(`common_${code}_missing`);
    expect(getAutomationConsultAvailability(env).webFormEnabled).toBe(false);
  });
  it.each([
    ["AUTOMATION_CONSULT_RECIPIENTS", "one@gmail.com,two@gmail.com", "recipients_invalid"],
    ["AUTOMATION_CONSULT_FROM", "bad\r\nheader", "sender_invalid"],
    ["RESEND_API_KEY", "short", "resend_key_invalid"],
    ["AUTOMATION_CONSULT_STATE_BACKEND", "memory", "state_backend_invalid"],
    ["DATABASE_URL", " ", "postgres_url_missing"],
    ["AUTOMATION_CONSULT_STATE_HASH_SECRET", "short", "state_hash_secret_invalid"],
    ["AUTOMATION_CONSULT_FROM_VERIFIED", "false", "from_not_verified"],
    ["AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK", "false", "bounce_complaint_policy_not_acknowledged"],
    ["AUTOMATION_CONSULT_STATE_VERIFIED", "false", "state_not_verified"],
    ["AUTOMATION_CONSULT_DELIVERY_VERIFIED", "false", "delivery_not_verified"],
    ["AUTOMATION_CONSULT_RETENTION_POLICY_ACK", "false", "retention_policy_not_acknowledged"],
    ["AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED", "false", "admin_review_path_not_verified"],
  ])("identifies invalid %s independently of presence", (key, value, reason) => {
    const env = { ...complete, [key]: value };
    expect(getAutomationConsultReadinessReasons(env)).toContain(reason);
    expect(getAutomationConsultAvailability(env).webFormEnabled).toBe(false);
  });
  it.each(["", "0", "6", "91", "7.5", "NaN", "Infinity"])("rejects invalid retention %s", value => {
    expect(getAutomationConsultReadinessReasons({ ...complete, AUTOMATION_CONSULT_RETENTION_DAYS: value })).toContain("retention_days_invalid");
  });
  it.each(["7", "90"])("preserves inclusive retention boundary %s", value => {
    expect(getAutomationConsultReadinessReasons({ ...complete, AUTOMATION_CONSULT_RETENTION_DAYS: value })).toEqual([]);
  });
  it("checks only selected backend and preserves existing Upstash/sender/flag normalization", () => {
    const env = { ...complete, AUTOMATION_CONSULT_STATE_BACKEND: " UPSTASH ", UPSTASH_REDIS_REST_URL: "https://synthetic.upstash.com", UPSTASH_REDIS_REST_TOKEN: "t".repeat(16), DATABASE_URL: "", AUTOMATION_CONSULT_FROM: " ", NOTIFY_FROM: complete.AUTOMATION_CONSULT_FROM, AUTOMATION_CONSULT_DELIVERY_VERIFIED: " TRUE " };
    expect(getAutomationConsultReadinessReasons(env)).toEqual([]);
    expect(getAutomationConsultReadinessReasons({ ...env, UPSTASH_REDIS_REST_URL: "http://synthetic.upstash.io", UPSTASH_REDIS_REST_TOKEN: "short" })).toEqual(["upstash_url_invalid", "upstash_token_invalid"]);
  });
  it("private server logger accepts no arbitrary input, deduplicates for five minutes, and logs no values", async () => {
    vi.resetModules();
    vi.useFakeTimers(); vi.setSystemTime(0);
    for (const [key, value] of Object.entries(complete)) vi.stubEnv(key, value);
    vi.stubEnv("RESEND_API_KEY", "private-short");
    vi.stubEnv("AUTOMATION_CONSULT_PUBLIC_STATUS", "not-available");
    // A nonempty but invalid key isolates validity from presence.
    vi.stubEnv("RESEND_API_KEY", "secret");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { logAutomationConsultReadinessFailure } = await import("./readiness-log");
    logAutomationConsultReadinessFailure(); logAutomationConsultReadinessFailure();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenLastCalledWith("[automation-consult:readiness:v1]", "public_status_not_available,resend_key_invalid");
    vi.advanceTimersByTime(300000); logAutomationConsultReadinessFailure();
    expect(warn).toHaveBeenCalledTimes(2);
    vi.stubEnv("AUTOMATION_CONSULT_PUBLIC_STATUS", "available");
    warn.mockImplementationOnce(() => { throw new Error("PRIVATE_LOGGER_FAILURE"); });
    expect(() => logAutomationConsultReadinessFailure()).not.toThrow();
    const output = JSON.stringify(warn.mock.calls);
    for (const value of ["secret", complete.AUTOMATION_CONSULT_RECIPIENTS, complete.AUTOMATION_CONSULT_FROM, complete.DATABASE_URL, complete.AUTOMATION_CONSULT_STATE_HASH_SECRET]) expect(output).not.toContain(value);
  });
});
