import { describe, expect, it } from "vitest";
import {
  createAutomationFunnelAdapter,
  createAutomationFunnelMockTransport,
  prepareAutomationFunnelPayload,
} from "./privacy-adapter";

const SAFE_INPUT = {
  event: "automation_cta_click",
  pathname: "/services/automation",
  ctaPosition: "hero",
  consultationCategory: "automation",
  budgetBucket: "undecided",
  deviceClass: "mobile",
  anonymousBucket: "af_0123456789abcdef01234567",
};

describe("automation funnel client privacy adapter", () => {
  it("constructs only allowed fields and never forwards arbitrary data", () => {
    const payload = prepareAutomationFunnelPayload({
      ...SAFE_INPUT,
      email: "hidden@example.test",
      query: "hidden",
    } as typeof SAFE_INPUT & { email: string; query: string });
    expect(Object.keys(payload ?? {}).sort()).toEqual(
      [
        "anonymous_bucket",
        "budget_bucket",
        "consent_state",
        "consultation_category",
        "cta_position",
        "device_class",
        "event",
        "route_template",
      ].sort(),
    );
    expect(JSON.stringify(payload)).not.toContain("hidden");
  });

  it("fails closed without consent, outside production, or under DNT/GPC", async () => {
    for (const options of [
      { consentGranted: false, productionRuntime: true, dntOrGpc: false },
      { consentGranted: true, productionRuntime: false, dntOrGpc: false },
      { consentGranted: true, productionRuntime: true, dntOrGpc: true },
    ]) {
      const mock = createAutomationFunnelMockTransport();
      const adapter = createAutomationFunnelAdapter({
        ...options,
        transport: mock.transport,
      });
      await expect(adapter.record(SAFE_INPUT)).resolves.toBe(false);
      expect(mock.calls).toHaveLength(0);
    }
  });

  it("uses sitewide only for fixed global navigation positions", () => {
    expect(
      prepareAutomationFunnelPayload({
        ...SAFE_INPUT,
        pathname: "/about/quality",
        ctaPosition: "footer",
      })?.route_template,
    ).toBe("sitewide");
    expect(
      prepareAutomationFunnelPayload({
        ...SAFE_INPUT,
        pathname: "/about/quality",
        ctaPosition: "hero",
      }),
    ).toBeNull();
  });

  it("accepts the real annual-plan CTA route template", () => {
    expect(
      prepareAutomationFunnelPayload({
        ...SAFE_INPUT,
        pathname: "/strategy/plan-generator",
        ctaPosition: "annual_plan",
      }),
    ).toMatchObject({
      route_template: "/strategy/plan-generator",
      cta_position: "annual_plan",
    });
    expect(
      prepareAutomationFunnelPayload({
        ...SAFE_INPUT,
        pathname: "/annual-plan",
        ctaPosition: "annual_plan",
      }),
    ).toBeNull();
  });
});
