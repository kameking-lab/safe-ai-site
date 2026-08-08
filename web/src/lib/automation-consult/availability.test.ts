import { describe, expect, it } from "vitest";
import { getAutomationConsultAvailability } from "./availability";

const COMPLETE_ENV = {
  AUTOMATION_CONSULT_PUBLIC_STATUS: "available",
  AUTOMATION_CONSULT_RECIPIENTS: "primary@gmail.com,audit@outlook.com",
  AUTOMATION_CONSULT_FROM: "Portal <noreply@example.test>",
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

describe("getAutomationConsultAvailability", () => {
  it("enables the Web form only with the complete provider and shared-state gates", () => {
    expect(getAutomationConsultAvailability(COMPLETE_ENV)).toMatchObject({
      status: "available",
      accepting: true,
      webFormEnabled: true,
      contactMode: "web_form",
      intakeMode: "email",
      label: "Webフォーム受付中",
    });

    for (const key of Object.keys(COMPLETE_ENV)) {
      const result = getAutomationConsultAvailability({
        ...COMPLETE_ENV,
        [key]: "",
      });
      expect(result.webFormEnabled, key).toBe(false);
      expect(result.intakeMode, key).toBeNull();
      expect(JSON.stringify(result)).not.toContain(key);
      expect(JSON.stringify(result)).not.toContain("primary@gmail.com");
    }
  });

  it("uses the mail-client fallback when recipients exist but provider or From is unavailable", () => {
    expect(
      getAutomationConsultAvailability({
        AUTOMATION_CONSULT_RECIPIENTS:
          "primary@gmail.com,audit@outlook.com",
        AUTOMATION_CONSULT_STATE_BACKEND: "postgres",
        AUTOMATION_CONSULT_STATE_HASH_SECRET: "x".repeat(32),
        AUTOMATION_CONSULT_STATE_VERIFIED: "true",
      }),
    ).toMatchObject({
      status: "mail_available",
      accepting: true,
      webFormEnabled: false,
      contactMode: "mail_client",
      intakeMode: null,
      label: "メール相談受付中",
    });
  });

  it("does not open a queue-backed public form without a verified mail provider", () => {
    expect(
      getAutomationConsultAvailability({
        AUTOMATION_CONSULT_PUBLIC_STATUS: "available",
        AUTOMATION_CONSULT_RECIPIENTS:
          "primary@gmail.com,audit@outlook.com",
        AUTOMATION_CONSULT_STATE_BACKEND: "postgres",
        DATABASE_URL: "postgresql://configured-server-only",
        AUTOMATION_CONSULT_STATE_HASH_SECRET: "x".repeat(32),
        AUTOMATION_CONSULT_STATE_VERIFIED: "true",
        AUTOMATION_CONSULT_QUEUE_ENABLED: "true",
        AUTOMATION_CONSULT_QUEUE_RETENTION_ACK: "true",
        AUTOMATION_CONSULT_QUEUE_OPERATIONS_OWNER_CONFIGURED: "true",
        AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED: "true",
        AUTOMATION_CONSULT_RETENTION_DAYS: "30",
      }),
    ).toMatchObject({
      status: "mail_available",
      accepting: true,
      webFormEnabled: false,
      contactMode: "mail_client",
    });
  });

  it("accepts the existing server-only Postgres integration as Web-form shared state when every delivery gate is present", () => {
    expect(
      getAutomationConsultAvailability({
        ...COMPLETE_ENV,
        AUTOMATION_CONSULT_STATE_BACKEND: "postgres",
        DATABASE_URL: "postgresql://configured-server-only",
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
      }),
    ).toMatchObject({
      status: "available",
      accepting: true,
      webFormEnabled: true,
    });
  });

  it("falls back to mail instead of advertising a Web form when shared state or verification is missing", () => {
    for (const env of [
      { ...COMPLETE_ENV, AUTOMATION_CONSULT_STATE_BACKEND: "memory" },
      { ...COMPLETE_ENV, AUTOMATION_CONSULT_STATE_VERIFIED: "false" },
      { ...COMPLETE_ENV, AUTOMATION_CONSULT_DELIVERY_VERIFIED: "false" },
      { ...COMPLETE_ENV, AUTOMATION_CONSULT_FROM: "" },
      { ...COMPLETE_ENV, RESEND_API_KEY: "" },
    ]) {
      expect(getAutomationConsultAvailability(env)).toMatchObject({
        status: "mail_available",
        accepting: true,
        webFormEnabled: false,
        contactMode: "mail_client",
      });
    }
  });

  it.each([
    "one@example.test",
    "one@example.test,not-an-email",
    "one@example.test,two@example.test",
    "one@gmail.com,two@gmail.com",
    "one@outlook.com,two@outlook.com",
    "",
  ])("stops intake when recipients cannot produce the required To/Bcc draft (%s)", (recipients) => {
    expect(
      getAutomationConsultAvailability({
        ...COMPLETE_ENV,
        AUTOMATION_CONSULT_RECIPIENTS: recipients,
      }),
    ).toMatchObject({
      accepting: false,
      webFormEnabled: false,
      status: "paused",
      label: "受付停止中",
    });
  });

  it("honors an explicit public pause even when mail recipients are configured", () => {
    expect(
      getAutomationConsultAvailability({
        ...COMPLETE_ENV,
        AUTOMATION_CONSULT_PUBLIC_STATUS: "paused",
      }),
    ).toMatchObject({
      accepting: false,
      webFormEnabled: false,
      contactMode: null,
      label: "受付停止中",
    });
  });
});
