import { describe, expect, it } from "vitest";
import { getAutomationFunnelServerReadiness } from "./server-readiness";

const READY = {
  VERCEL_ENV: "production",
  AUTOMATION_FUNNEL_COLLECTION_ENABLED: "true",
  AUTOMATION_FUNNEL_RETENTION_DAYS: "30",
  DATABASE_URL: "postgresql://configured.invalid/db",
  RUM_RATE_LIMIT_HASH_SECRET: "s".repeat(32),
};

describe("automation funnel readiness", () => {
  it("is production-only and requires explicit retention and collection flags", () => {
    expect(getAutomationFunnelServerReadiness(READY).ready).toBe(true);
    expect(
      getAutomationFunnelServerReadiness({ ...READY, VERCEL_ENV: "preview" })
        .ready,
    ).toBe(false);
    expect(
      getAutomationFunnelServerReadiness({
        ...READY,
        AUTOMATION_FUNNEL_RETENTION_DAYS: "31",
      }).retention,
    ).toBe("invalid");
    expect(
      getAutomationFunnelServerReadiness({
        ...READY,
        AUTOMATION_FUNNEL_COLLECTION_ENABLED: "false",
      }).ready,
    ).toBe(false);
  });
});
