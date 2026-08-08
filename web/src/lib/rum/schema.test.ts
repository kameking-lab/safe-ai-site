import { describe, expect, it } from "vitest";
import { rumPayloadSchema } from "./schema";

const SAFE_PAYLOAD = {
  route_template: "/safety-ai",
  metric: "LCP",
  value: 2_400,
  rating: "good",
  navigation_type: "navigate",
  device_class: "mobile",
  connection_class: "medium",
  build_id: "build_20260729",
  anonymous_bucket: "rum_0123456789abcdef01234567",
};

describe("RUM collector schema", () => {
  it("accepts exactly the allowlisted non-PII payload", () => {
    expect(rumPayloadSchema.parse(SAFE_PAYLOAD)).toEqual(SAFE_PAYLOAD);
  });

  it.each([
    { ...SAFE_PAYLOAD, route_template: "https://example.test/?q=secret" },
    { ...SAFE_PAYLOAD, route_template: "/chatbot" },
    { ...SAFE_PAYLOAD, route_template: "/services/automation" },
    { ...SAFE_PAYLOAD, route_template: "/chemical-ra" },
    { ...SAFE_PAYLOAD, route_template: "/ky/paper" },
    { ...SAFE_PAYLOAD, email: "person@example.test" },
    { ...SAFE_PAYLOAD, value: Number.POSITIVE_INFINITY },
    { ...SAFE_PAYLOAD, metric: "URL" },
  ])("rejects sensitive, identifying, or unknown input", (payload) => {
    expect(rumPayloadSchema.safeParse(payload).success).toBe(false);
  });
});
