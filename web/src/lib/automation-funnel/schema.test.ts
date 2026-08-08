import { describe, expect, it } from "vitest";
import { automationFunnelPayloadSchema } from "./schema";

const VALID = {
  event: "automation_cta_click",
  route_template: "/services/automation",
  cta_position: "hero",
  consultation_category: "automation",
  budget_bucket: "undecided",
  device_class: "mobile",
  anonymous_bucket: "af_0123456789abcdef01234567",
  consent_state: "granted",
} as const;

describe("automation funnel payload privacy schema", () => {
  it("accepts the fixed coarse allowlist", () => {
    expect(automationFunnelPayloadSchema.safeParse(VALID).success).toBe(true);
  });

  it.each([
    ["name", "Person"],
    ["email", "person@example.test"],
    ["company", "Example"],
    ["consultation_body", "private details"],
    ["receipt_number", "ABC-123"],
    ["query", "secret"],
    ["token", "secret"],
    ["url", "https://example.test/?secret=1"],
    ["ip", "203.0.113.1"],
    ["user_agent", "exact UA"],
    ["health_information", "medical detail"],
  ])("rejects prohibited field %s", (key, value) => {
    expect(
      automationFunnelPayloadSchema.safeParse({ ...VALID, [key]: value }).success,
    ).toBe(false);
  });

  it("rejects a query-bearing route and denied consent", () => {
    expect(
      automationFunnelPayloadSchema.safeParse({
        ...VALID,
        route_template: "/services/automation?email=hidden",
      }).success,
    ).toBe(false);
    expect(
      automationFunnelPayloadSchema.safeParse({
        ...VALID,
        consent_state: "denied",
      }).success,
    ).toBe(false);
  });
});
