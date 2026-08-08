import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SafeEmailParams, SafeEmailResult } from "@/lib/external/resend-safe";
import {
  buildAutomationConsultAcknowledgementEmail,
  buildAutomationConsultOwnerEmail,
  deliverAutomationConsultEmails,
  getAutomationConsultEmailConfiguration,
  prepareAutomationConsultEmailDryRun,
} from "./email";
import type { AutomationConsultInput } from "./schema";

const consultation: AutomationConsultInput = {
  consultationType: "automation",
  name: `<script>alert("name")</script>`,
  email: "requester@example.test",
  organization: "Example & Co.",
  currentProblem: "<b>CSV集計</b>に時間がかかります。",
  desiredSupport: "集計とレポート作成の自動化",
  currentTools: "Excel",
  timing: "within-3-months",
  budget: "100000-300000",
  deliveryPreference: "online",
  privacyConsent: true,
  website: "",
  sourcePage: "/services/automation",
};

const referenceId = "AC-20260723-ABCDEF12";
const submissionStartedAtJst = "2026/07/23 12:34:56";

describe("automation consult email", () => {
  beforeEach(() => {
    process.env.AUTOMATION_CONSULT_RECIPIENTS =
      "owner-one@example.test,owner-two@example.test";
    process.env.AUTOMATION_CONSULT_FROM = "Portal <noreply@example.test>";
  });

  afterEach(() => {
    delete process.env.AUTOMATION_CONSULT_RECIPIENTS;
    delete process.env.AUTOMATION_CONSULT_FROM;
    vi.restoreAllMocks();
  });

  it("fails closed unless exactly two unique safe recipients and a sender are configured", () => {
    expect(getAutomationConsultEmailConfiguration().ok).toBe(true);

    process.env.AUTOMATION_CONSULT_RECIPIENTS = "owner-one@example.test";
    expect(getAutomationConsultEmailConfiguration()).toEqual({ ok: false });

    process.env.AUTOMATION_CONSULT_RECIPIENTS =
      "owner-one@example.test,owner-one@example.test";
    expect(getAutomationConsultEmailConfiguration()).toEqual({ ok: false });

    process.env.AUTOMATION_CONSULT_RECIPIENTS =
      "owner-one@example.test,owner-two@example.test\r\nBcc:bad@example.test";
    expect(getAutomationConsultEmailConfiguration()).toEqual({ ok: false });
  });

  it("escapes every user value in HTML and safely sets Reply-To", () => {
    const ownerEmail = buildAutomationConsultOwnerEmail({
      consultation,
      referenceId,
      submissionStartedAtJst,
    });
    expect(ownerEmail.replyTo).toBe(consultation.email);
    expect(ownerEmail.html).toContain("&lt;script&gt;");
    expect(ownerEmail.html).toContain("&lt;b&gt;CSV集計&lt;/b&gt;");
    expect(ownerEmail.html).not.toContain("<script>");

    const acknowledgement = buildAutomationConsultAcknowledgementEmail({
      consultation,
      referenceId,
    });
    expect(acknowledgement.html).toContain("&lt;script&gt;");
    expect(acknowledgement.html).not.toContain("<script>");
    expect(acknowledgement.text).toContain("このメールへ返信しても相談の追加受付はできません");
    expect(acknowledgement.text).toContain("機密資料は、このメールへ送信しないでください");
  });

  it("sends two owner notifications separately, then one acknowledgement", async () => {
    const calls: SafeEmailParams[] = [];
    const sendEmail = vi.fn(async (params: SafeEmailParams): Promise<SafeEmailResult> => {
      calls.push(params);
      return { delivered: true, id: null };
    });

    await expect(
      deliverAutomationConsultEmails({
        consultation,
        referenceId,
        submissionStartedAtJst,
        idempotencyKey: "m7example.owner-request-key",
        sendEmail,
      })
    ).resolves.toEqual({ delivered: true });

    expect(calls).toHaveLength(3);
    expect(calls[0].to).toBe("owner-one@example.test");
    expect(calls[1].to).toBe("owner-two@example.test");
    expect(Array.isArray(calls[0].to)).toBe(false);
    expect(Array.isArray(calls[1].to)).toBe(false);
    expect(calls[0].replyTo).toBe(consultation.email);
    expect(calls[1].replyTo).toBe(consultation.email);
    expect(calls[2].to).toBe(consultation.email);
    expect(calls[2].replyTo).toBeUndefined();
    expect(calls.map((call) => call.idempotencyKey)).toEqual([
      "m7example.owner-request-key.owner-1",
      "m7example.owner-request-key.owner-2",
      "m7example.owner-request-key.ack",
    ]);
  });

  it("dry-run builds the production message structures but returns no addresses or body", () => {
    const summary = prepareAutomationConsultEmailDryRun({
      consultation,
      referenceId,
      submissionStartedAtJst,
      idempotencyKey: "m7example.owner-request-key",
    });
    expect(summary).toEqual({
      mode: "dry-run",
      ownerDeliveryCount: 2,
      acknowledgementDeliveryCount: 1,
      replyToValidated: true,
      bodiesGenerated: true,
    });
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain(consultation.email);
    expect(serialized).not.toContain(consultation.currentProblem);
    expect(serialized).not.toContain("owner-one@example.test");
  });

  it("does not send an acknowledgement when either owner delivery fails", async () => {
    let callCount = 0;
    const sendEmail = vi.fn(async (): Promise<SafeEmailResult> => {
      callCount += 1;
      return callCount === 1
        ? { delivered: false, reason: "send_failed", detail: "test" }
        : { delivered: true, id: null };
    });

    await expect(
      deliverAutomationConsultEmails({
        consultation,
        referenceId,
        submissionStartedAtJst,
        idempotencyKey: "m7example.owner-request-key",
        sendEmail,
      })
    ).resolves.toEqual({ delivered: false, reason: "owner_delivery_failed" });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("reports acknowledgement failure without logging PII", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let callCount = 0;
    const sendEmail = vi.fn(async (): Promise<SafeEmailResult> => {
      callCount += 1;
      return callCount === 3
        ? { delivered: false, reason: "send_failed", detail: "test" }
        : { delivered: true, id: null };
    });

    await expect(
      deliverAutomationConsultEmails({
        consultation,
        referenceId,
        submissionStartedAtJst,
        idempotencyKey: "m7example.owner-request-key",
        sendEmail,
      })
    ).resolves.toEqual({ delivered: false, reason: "reply_failed" });
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("uses stable per-message provider keys so partial delivery retries cannot duplicate mail", async () => {
    const attempts = new Map<string, number>();
    let firstOwnerTwoFailure = true;
    const sendEmail = vi.fn(async (params: SafeEmailParams): Promise<SafeEmailResult> => {
      const key = params.idempotencyKey ?? "";
      attempts.set(key, (attempts.get(key) ?? 0) + 1);
      if (key.endsWith("owner-2") && firstOwnerTwoFailure) {
        firstOwnerTwoFailure = false;
        return { delivered: false, reason: "send_failed", detail: "test" };
      }
      return { delivered: true, id: key };
    });
    const input = {
      consultation,
      referenceId,
      submissionStartedAtJst,
      idempotencyKey: "m7example.owner-request-key",
      sendEmail,
    };

    await expect(deliverAutomationConsultEmails(input)).resolves.toEqual({
      delivered: false,
      reason: "owner_delivery_failed",
    });
    await expect(deliverAutomationConsultEmails(input)).resolves.toEqual({
      delivered: true,
    });

    expect(attempts.get("m7example.owner-request-key.owner-1")).toBe(2);
    expect(attempts.get("m7example.owner-request-key.owner-2")).toBe(2);
    expect(attempts.get("m7example.owner-request-key.ack")).toBe(1);
  });
});
