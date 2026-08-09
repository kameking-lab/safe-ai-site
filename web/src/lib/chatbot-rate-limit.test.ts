import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetRateLimitForTests,
  chatbotRateLimitMaxRequests,
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_CONFIG,
  rateLimitMessage,
} from "@/lib/chatbot-rate-limit";

describe("chatbot distributed rate limit", () => {
  beforeEach(() => __resetRateLimitForTests());

  function environment(
    overrides: Partial<NodeJS.ProcessEnv>,
  ): NodeJS.ProcessEnv {
    return { NODE_ENV: "test", ...overrides } as NodeJS.ProcessEnv;
  }

  it("allows through the limit and denies the next request", async () => {
    const ip = "203.0.113.9";
    for (let index = 0; index < RATE_LIMIT_CONFIG.maxRequests; index += 1) {
      expect((await checkRateLimit(ip)).allowed).toBe(true);
    }
    const over = await checkRateLimit(ip);
    expect(over.allowed).toBe(false);
    expect(over.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the fixed window", async () => {
    const ip = "203.0.113.10";
    const start = 1_000_000;
    for (let index = 0; index < RATE_LIMIT_CONFIG.maxRequests; index += 1) {
      await checkRateLimit(ip, start);
    }
    expect((await checkRateLimit(ip, start)).allowed).toBe(false);
    expect(
      (await checkRateLimit(ip, start + RATE_LIMIT_CONFIG.windowMs + 1))
        .allowed,
    ).toBe(true);
  });

  it("uses independent anonymous client buckets", async () => {
    const first = "198.51.100.1";
    const second = "198.51.100.2";
    for (let index = 0; index < RATE_LIMIT_CONFIG.maxRequests; index += 1) {
      await checkRateLimit(first);
    }
    expect((await checkRateLimit(first)).allowed).toBe(false);
    expect((await checkRateLimit(second)).allowed).toBe(true);
  });

  it("raises only an SSO-protected Vercel Preview dry-run bucket", () => {
    expect(RATE_LIMIT_CONFIG.previewMaxRequests).toBe(240);
    expect(RATE_LIMIT_CONFIG.maxRequests).toBe(40);
    expect(
      chatbotRateLimitMaxRequests(environment({ VERCEL_ENV: "preview" })),
    ).toBe(RATE_LIMIT_CONFIG.previewMaxRequests);
    expect(
      chatbotRateLimitMaxRequests(
        environment({
          VERCEL_ENV: "preview",
          SAFE_AI_STAGING_MODE: "true",
          GEMINI_EXTERNAL_AI_ENABLED: "false",
        }),
      ),
    ).toBe(RATE_LIMIT_CONFIG.previewMaxRequests);
    expect(
      chatbotRateLimitMaxRequests(
        environment({
          VERCEL_ENV: "production",
          SAFE_AI_STAGING_MODE: "true",
        }),
      ),
    ).toBe(RATE_LIMIT_CONFIG.maxRequests);
    expect(
      chatbotRateLimitMaxRequests(
        environment({ SAFE_AI_STAGING_MODE: "true" }),
      ),
    ).toBe(RATE_LIMIT_CONFIG.maxRequests);
  });

  it("allows the bounded Preview audit and still denies its next request", async () => {
    const previewEnv = environment({ VERCEL_ENV: "preview" });
    const subject = "preview-global-audit";
    const now = 2_000_000;
    for (
      let index = 0;
      index < RATE_LIMIT_CONFIG.previewMaxRequests;
      index += 1
    ) {
      expect((await checkRateLimit(subject, now, previewEnv)).allowed).toBe(true);
    }
    expect((await checkRateLimit(subject, now, previewEnv)).allowed).toBe(false);
  });

  it("uses the first forwarded address without persisting it", () => {
    const request = new Request("https://example.test/api", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
    });
    expect(getClientIp(request)).toBe("203.0.113.5");
  });

  it("links to official fallback information", () => {
    const message = rateLimitMessage(120);
    expect(message).toContain("laws.e-gov.go.jp");
    expect(message).toContain("約2分後");
  });
});
