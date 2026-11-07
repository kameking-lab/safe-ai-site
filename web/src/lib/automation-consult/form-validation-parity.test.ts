import { describe, expect, it } from "vitest";
import { parseAutomationConsultForm } from "./form-validation";
import { automationConsultSchema } from "./schema";

const compact = { consultationType: "other", email: "Reply@Example.test", currentProblem: "毎週の集計と転記に時間がかかっています。", timing: "undecided", privacyConsent: true, sourcePage: "/" };
const service = { ...compact, sourcePage: "/services/automation", name: "担当者", desiredSupport: "集計を自動化したい" };
const cases: Array<[string, unknown]> = [
  ["compact defaults", compact], ["service required fields", service],
  ["service missing name", { ...compact, sourcePage: "/services/automation", desiredSupport: "支援" }],
  ["service missing support", { ...compact, sourcePage: "/services/automation", name: "担当" }],
  ["CRLF normalization", { ...service, name: " 担当者 ", email: " Reply@Example.test ", currentProblem: " 第一行の説明です\r\n第二行\r第三行 ", desiredSupport: " 支援\r\n内容 ", currentTools: " CSV\rツール " }],
  ["optional blanks", { ...compact, organization: " \t ", currentTools: " \r\n ", budget: " ", deliveryPreference: "\t" }],
  ["optional undefined", { ...compact, organization: undefined, currentTools: undefined, budget: undefined, deliveryPreference: undefined }],
  ["name upper boundary", { ...service, name: "a".repeat(100) }],
  ["name too long", { ...service, name: "a".repeat(101) }],
  ["problem min", { ...compact, currentProblem: "a".repeat(10) }],
  ["problem too short", { ...compact, currentProblem: "a".repeat(9) }],
  ["problem max", { ...compact, currentProblem: "a".repeat(2000) }],
  ["problem too long", { ...compact, currentProblem: "a".repeat(2001) }],
  ["support max", { ...compact, desiredSupport: "a".repeat(2000) }],
  ["support too long", { ...compact, desiredSupport: "a".repeat(2001) }],
  ["organization max", { ...compact, organization: "a".repeat(160) }],
  ["organization too long", { ...compact, organization: "a".repeat(161) }],
  ["tools max", { ...compact, currentTools: "a".repeat(500) }],
  ["tools too long", { ...compact, currentTools: "a".repeat(501) }],
  ["single-line control", { ...service, name: "担当\t者" }],
  ["multiline control", { ...compact, currentProblem: "説明は十分ですが\u0000禁止" }],
  ["mail header injection", { ...compact, email: "reply@example.test\r\nBcc: other@example.test" }],
  ["mail dot boundary", { ...compact, email: "a..b@example.test" }],
  ["mail Unicode lowercase boundary", { ...compact, email: "\u212A@example.test" }],
  ["mail invalid domain", { ...compact, email: "reply@example.c" }],
  ["mail plus", { ...compact, email: "Reply+consult@Example.test" }],
  ["mail too long", { ...compact, email: `${"a".repeat(245)}@example.test` }],
  ["privacy false", { ...compact, privacyConsent: false }],
  ["type unknown", { ...compact, consultationType: "unknown" }],
  ["timing unknown", { ...compact, timing: "tomorrow" }],
  ["source whitelist", { ...compact, sourcePage: "/other" }],
  ["budget unknown", { ...compact, budget: "free" }],
  ["delivery unknown", { ...compact, deliveryPreference: "phone" }],
  ["unknown property", { ...compact, extra: "not allowed" }],
  ["non-string email", { ...compact, email: 123 }],
  ["null name", { ...compact, name: null }],
  ["website max", { ...compact, website: "a".repeat(200) }],
  ["website too long", { ...compact, website: "a".repeat(201) }],
  ["array payload", []],
];

describe("lightweight client / unchanged server validation boundary", () => {
  it.each(cases)("matches acceptance and normalized data: %s", (_name, input) => {
    const server = automationConsultSchema.safeParse(input);
    const client = parseAutomationConsultForm(input);
    expect(client.success).toBe(server.success);
    if (server.success && client.success) expect(client.data).toStrictEqual(server.data);
  });
});
