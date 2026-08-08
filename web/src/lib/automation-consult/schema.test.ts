import { describe, expect, it } from "vitest";
import {
  AUTOMATION_CONSULT_MAX_BODY_BYTES,
  automationConsultSchema,
  readAutomationConsultJson,
} from "./schema";

const validInput = {
  consultationType: "automation",
  name: "安全 太郎",
  email: "USER@EXAMPLE.TEST",
  organization: "",
  currentProblem: "毎週のCSV集計に時間がかかっています。",
  desiredSupport: "集計と定型レポート作成を自動化したいです。",
  currentTools: "",
  timing: "within-3-months",
  budget: "",
  deliveryPreference: "",
  privacyConsent: true,
  website: "",
  sourcePage: "/services/automation",
};

describe("automationConsultSchema", () => {
  it("normalizes safe input and accepts blank optional fields", () => {
    const result = automationConsultSchema.parse(validInput);
    expect(result.email).toBe("user@example.test");
    expect(result.organization).toBeUndefined();
    expect(result.currentTools).toBeUndefined();
    expect(result.budget).toBeUndefined();
    expect(result.deliveryPreference).toBeUndefined();
  });

  it("rejects email header injection", () => {
    const result = automationConsultSchema.safeParse({
      ...validInput,
      email: "user@example.test\r\nBcc: attacker@example.test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects control characters and an unapproved source page", () => {
    expect(
      automationConsultSchema.safeParse({ ...validInput, name: "担当\u0000者" }).success
    ).toBe(false);
    expect(
      automationConsultSchema.safeParse({ ...validInput, sourcePage: "/contact" }).success
    ).toBe(false);
  });

  it("rejects missing consent and unknown keys", () => {
    expect(
      automationConsultSchema.safeParse({ ...validInput, privacyConsent: false }).success
    ).toBe(false);
    expect(
      automationConsultSchema.safeParse({ ...validInput, internalRole: "admin" }).success
    ).toBe(false);
  });
});

describe("readAutomationConsultJson", () => {
  it("rejects an oversized declared body without parsing it", async () => {
    const request = new Request("https://example.test/api/automation-consult", {
      method: "POST",
      headers: { "content-length": String(AUTOMATION_CONSULT_MAX_BODY_BYTES + 1) },
      body: "{}",
    });
    await expect(readAutomationConsultJson(request)).resolves.toEqual({
      ok: false,
      reason: "payload_too_large",
    });
  });

  it("rejects malformed JSON", async () => {
    const request = new Request("https://example.test/api/automation-consult", {
      method: "POST",
      body: "{",
    });
    await expect(readAutomationConsultJson(request)).resolves.toEqual({
      ok: false,
      reason: "invalid_json",
    });
  });

  it("stops reading a chunked body after the byte limit", async () => {
    const oversized = JSON.stringify({
      value: "あ".repeat(AUTOMATION_CONSULT_MAX_BODY_BYTES),
    });
    const request = new Request("https://example.test/api/automation-consult", {
      method: "POST",
      body: oversized,
    });
    await expect(readAutomationConsultJson(request)).resolves.toEqual({
      ok: false,
      reason: "payload_too_large",
    });
  });
});
