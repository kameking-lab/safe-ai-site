import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetAutomationConsultRateLimitForTests,
  checkAutomationConsultRateLimit,
  getAutomationConsultClientIp,
} from "./rate-limit";

describe("automation consult rate limit", () => {
  beforeEach(() => __resetAutomationConsultRateLimitForTests());

  it("limits the sixth request in ten minutes", () => {
    for (let index = 0; index < 5; index += 1) {
      expect(checkAutomationConsultRateLimit("test-client", index).allowed).toBe(true);
    }
    const limited = checkAutomationConsultRateLimit("test-client", 5);
    expect(limited.allowed).toBe(false);
    if (!limited.allowed) expect(limited.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("uses only the first forwarded address", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "192.0.2.10, 198.51.100.20" },
    });
    expect(getAutomationConsultClientIp(request)).toBe("192.0.2.10");
  });
});
