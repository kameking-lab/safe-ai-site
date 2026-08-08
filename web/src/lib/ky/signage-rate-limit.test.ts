import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetSignageRateLimitForTests,
  checkSignageLookupRateLimit,
  SIGNAGE_RATE_LIMIT_CONFIG,
} from "./signage-rate-limit";

describe("signage distributed lookup rate limit", () => {
  beforeEach(__resetSignageRateLimitForTests);

  it("denies after the per-client limit", async () => {
    for (
      let index = 0;
      index < SIGNAGE_RATE_LIMIT_CONFIG.maxLookups;
      index += 1
    ) {
      expect(
        (await checkSignageLookupRateLimit("192.0.2.1", 1_000)).allowed,
      ).toBe(true);
    }
    const denied = await checkSignageLookupRateLimit("192.0.2.1", 1_000);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBeGreaterThan(0);
    expect(
      (await checkSignageLookupRateLimit("192.0.2.2", 1_000)).allowed,
    ).toBe(true);
  });

  it("opens a new fixed window", async () => {
    for (
      let index = 0;
      index < SIGNAGE_RATE_LIMIT_CONFIG.maxLookups;
      index += 1
    ) {
      await checkSignageLookupRateLimit("192.0.2.3", 1_000);
    }
    expect(
      (
        await checkSignageLookupRateLimit(
          "192.0.2.3",
          1_000 + SIGNAGE_RATE_LIMIT_CONFIG.windowMs + 1,
        )
      ).allowed,
    ).toBe(true);
  });
});
