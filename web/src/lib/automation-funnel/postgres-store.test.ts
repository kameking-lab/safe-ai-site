import { afterEach, describe, expect, it } from "vitest";
import {
  anonymizeAutomationFunnelBucket,
  persistAutomationFunnelEvent,
  safeDeploymentId,
} from "./postgres-store";

const PAYLOAD = {
  event: "automation_form_start",
  route_template: "/services/automation",
  cta_position: "hero",
  consultation_category: "automation",
  budget_bucket: "undecided",
  device_class: "desktop",
  anonymous_bucket: "af_0123456789abcdef01234567",
  consent_state: "granted",
} as const;
const originalDeploymentId = process.env.VERCEL_DEPLOYMENT_ID;

afterEach(() => {
  if (originalDeploymentId === undefined) {
    delete process.env.VERCEL_DEPLOYMENT_ID;
  } else {
    process.env.VERCEL_DEPLOYMENT_ID = originalDeploymentId;
  }
});

describe("automation funnel persistence allowlist", () => {
  it("derives a rate key only from a valid consent bucket and server secret", () => {
    const secret = "s".repeat(32);
    const key = anonymizeAutomationFunnelBucket(
      PAYLOAD.anonymous_bucket,
      secret,
    );

    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(key).not.toContain(PAYLOAD.anonymous_bucket);
    expect(anonymizeAutomationFunnelBucket("203.0.113.10", secret)).toBeNull();
    expect(
      anonymizeAutomationFunnelBucket(PAYLOAD.anonymous_bucket, "short"),
    ).toBeNull();
  });

  it("writes only approved coarse columns and server-derived timestamps", async () => {
    let captured: Record<string, unknown> | undefined;
    const database = {
      automationFunnelEvent: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          captured = data;
          return { id: "test" };
        },
      },
    };
    const now = new Date("2026-07-29T03:00:00.000Z");
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_test";

    await persistAutomationFunnelEvent(
      PAYLOAD,
      30,
      database as never,
      now,
    );

    expect(Object.keys(captured ?? {}).sort()).toEqual(
      [
        "anonymousBucket",
        "budgetBucket",
        "consentState",
        "consultationCategory",
        "createdAt",
        "ctaPosition",
        "deployment",
        "deviceClass",
        "event",
        "eventDate",
        "expiresAt",
        "routeTemplate",
      ].sort(),
    );
    expect(JSON.stringify(captured)).not.toMatch(
      /email|company|body|query|token|userAgent|health|receipt/i,
    );
  });

  it("fails closed to a non-sensitive deployment label", () => {
    expect(safeDeploymentId({ VERCEL_DEPLOYMENT_ID: "bad value ?token" })).toBe(
      "unknown-production",
    );
  });
});
