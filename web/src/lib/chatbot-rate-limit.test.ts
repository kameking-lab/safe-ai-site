import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  getClientIp,
  rateLimitMessage,
  RATE_LIMIT_CONFIG,
  __resetRateLimitForTests,
} from "@/lib/chatbot-rate-limit";

describe("P2-5 チャットボットIPレート制限", () => {
  beforeEach(() => __resetRateLimitForTests());

  it("上限までは許可し、超過で拒否する", () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
      expect(checkRateLimit(ip).allowed).toBe(true);
    }
    const over = checkRateLimit(ip);
    expect(over.allowed).toBe(false);
    expect(over.retryAfterSec).toBeGreaterThan(0);
  });

  it("ウィンドウ経過後はリセットされる", () => {
    const ip = "203.0.113.10";
    const t0 = 1_000_000;
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
      checkRateLimit(ip, t0);
    }
    expect(checkRateLimit(ip, t0).allowed).toBe(false);
    // ウィンドウ経過後
    expect(checkRateLimit(ip, t0 + RATE_LIMIT_CONFIG.windowMs + 1).allowed).toBe(true);
  });

  it("IPごとに独立してカウントする", () => {
    const a = "198.51.100.1";
    const b = "198.51.100.2";
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) checkRateLimit(a);
    expect(checkRateLimit(a).allowed).toBe(false);
    expect(checkRateLimit(b).allowed).toBe(true);
  });

  it("getClientIp は x-forwarded-for の先頭を採用する", () => {
    const req = new Request("https://x/api", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
    });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("制限メッセージは公式DB誘導を含む", () => {
    const m = rateLimitMessage(120);
    expect(m).toContain("laws.e-gov.go.jp");
    expect(m).toMatch(/分後/);
  });
});
