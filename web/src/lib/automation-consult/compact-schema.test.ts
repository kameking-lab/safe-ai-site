import { describe, expect, it } from "vitest";
import { automationConsultSchema } from "./schema";
import { sanitizeAutomationConsultSourcePage } from "./html";
import { buildAutomationConsultOwnerEmail, buildAutomationConsultAcknowledgementEmail } from "./email";
const input = { consultationType: "other", email: "reply@example.test", currentProblem: "毎週の集計と転記に時間がかかっています。", timing: "undecided", privacyConsent: true, sourcePage: "/" };
describe("compact source contract", () => {
  it("allows optional name and support on the exact LP source and preserves Reply-To", () => {
    const consultation = automationConsultSchema.parse(input);
    expect(consultation.name).toBe(""); expect(consultation.desiredSupport).toBe("");
    const email = buildAutomationConsultOwnerEmail({ consultation, referenceId: "AC-20261008-ABCDEF123456", submissionStartedAtJst: "2026/10/08 20:00" });
    expect(email.replyTo).toBe(input.email); expect(email.text).toContain("送信元ページ: /");
    expect(sanitizeAutomationConsultSourcePage("/")).toBe("/");
    expect(buildAutomationConsultAcknowledgementEmail({ consultation, referenceId: "AC-20261008-ABCDEF123456" }).text).toContain("ご相談者 様");
  });
  it("retains service required fields and exact source whitelist and rejects header controls", () => {
    expect(automationConsultSchema.safeParse({ ...input, sourcePage: "/services/automation" }).success).toBe(false);
    expect(automationConsultSchema.safeParse({ ...input, sourcePage: "/unknown" }).success).toBe(false);
    expect(automationConsultSchema.safeParse({ ...input, email: "reply@example.test\r\nBcc: other@example.test" }).success).toBe(false);
    expect(automationConsultSchema.safeParse({ ...input, name: "a".repeat(101) }).success).toBe(false);
    expect(automationConsultSchema.safeParse({ ...input, currentProblem: "a".repeat(2001) }).success).toBe(false);
  });
});
