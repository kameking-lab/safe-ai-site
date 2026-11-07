import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SafeEmailParams, SafeEmailResult } from "@/lib/external/resend-safe";
import { buildAutomationConsultOwnerEmail, deliverAutomationConsultEmails, getAutomationConsultEmailConfiguration, prepareAutomationConsultEmailDryRun } from "./email";
import type { AutomationConsultInput } from "./schema";

const consultation: AutomationConsultInput = {
  consultationType: "other", name: '<script>alert("name")</script>',
  email: "requester@example.test", currentProblem: "<b>CSV集計</b>に時間がかかります。",
  desiredSupport: "", timing: "undecided", privacyConsent: true,
  website: "", sourcePage: "/services/automation",
};
const input = {
  consultation, referenceId: "AC-20261009-ABCDEF123456",
  submissionStartedAtJst: "2026/10/09 13:00:00",
  idempotencyKey: "m7example.owner-request-key",
};

describe("single owner consultation delivery", () => {
  beforeEach(() => {
    vi.stubEnv("AUTOMATION_CONSULT_RECIPIENTS", "audit@outlook.com,primary@gmail.com");
    vi.stubEnv("AUTOMATION_CONSULT_FROM", "Portal <noreply@example.test>");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("uses only one configured Gmail and never the legacy Outlook address", () => {
    expect(getAutomationConsultEmailConfiguration()).toEqual({
      ok: true, from: "Portal <noreply@example.test>", recipients: ["primary@gmail.com"],
    });
    vi.stubEnv("AUTOMATION_CONSULT_RECIPIENTS", "primary@gmail.com");
    expect(getAutomationConsultEmailConfiguration().ok).toBe(true);
  });

  it.each(["", "owner@example.test", "one@gmail.com,two@gmail.com", "one@gmail.com,other@example.test", "one@gmail.com\r\nBcc:bad@example.test"])("fails closed for ambiguous or unsafe destinations %s", recipients => {
    vi.stubEnv("AUTOMATION_CONSULT_RECIPIENTS", recipients);
    expect(getAutomationConsultEmailConfiguration()).toEqual({ ok: false });
  });

  it("escapes user content and uses the validated reply address", () => {
    const email = buildAutomationConsultOwnerEmail(input);
    expect(email.replyTo).toBe(consultation.email);
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("&lt;b&gt;CSV集計&lt;/b&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.text).toContain("送信元ページ: /services/automation");
  });

  it("sends one owner message with Reply-To and sends no automatic reply", async () => {
    const sendEmail = vi.fn(async (_params: SafeEmailParams): Promise<SafeEmailResult> => ({ delivered: true, id: "provider-test" }));
    await expect(deliverAutomationConsultEmails({ ...input, sendEmail })).resolves.toEqual({ delivered: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      to: "primary@gmail.com", replyTo: consultation.email,
      idempotencyKey: "m7example.owner-request-key.owner-1",
    });
    expect(JSON.stringify(sendEmail.mock.calls)).not.toContain("audit@outlook.com");
  });

  it("dry-run returns no recipients or body and makes no external calls", () => {
    const summary = prepareAutomationConsultEmailDryRun(input);
    expect(summary).toEqual({ mode: "dry-run", ownerDeliveryCount: 1, acknowledgementDeliveryCount: 0, replyToValidated: true, bodiesGenerated: true });
    expect(JSON.stringify(summary)).not.toContain(consultation.email);
    expect(JSON.stringify(summary)).not.toContain(consultation.currentProblem);
  });

  it("returns provider failure honestly without logging personal data", async () => {
    const logs = [vi.spyOn(console, "info"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
    const sendEmail = vi.fn(async (_params: SafeEmailParams): Promise<SafeEmailResult> => ({ delivered: false, reason: "send_failed", detail: "synthetic" }));
    await expect(deliverAutomationConsultEmails({ ...input, sendEmail })).resolves.toEqual({ delivered: false, reason: "owner_delivery_failed" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });

  it("reuses the same provider key and body after an ambiguous failure", async () => {
    const delivered = new Set<string>();
    const sendEmail = vi.fn(async (params: SafeEmailParams): Promise<SafeEmailResult> => {
      const key = params.idempotencyKey!;
      if (!delivered.has(key)) {
        delivered.add(key);
        return { delivered: false, reason: "send_failed", detail: "ambiguous timeout after provider acceptance" };
      }
      return { delivered: true, id: "same-provider-message" };
    });
    await expect(deliverAutomationConsultEmails({ ...input, sendEmail })).resolves.toEqual({ delivered: false, reason: "owner_delivery_failed" });
    await expect(deliverAutomationConsultEmails({ ...input, sendEmail })).resolves.toEqual({ delivered: true });
    expect(delivered.size).toBe(1);
    expect(sendEmail.mock.calls[0][0]).toEqual(sendEmail.mock.calls[1][0]);
  });
});
