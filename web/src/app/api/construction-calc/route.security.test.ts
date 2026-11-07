import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limiter = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/chatbot-rate-limit", () => ({
  checkRateLimit: limiter.checkRateLimit,
  getClientIp: (request: Request) => request.headers.get("x-forwarded-for") ?? "unknown",
}));

import { POST, PUT } from "./route";

function request(method = "POST") {
  return new Request("https://example.test/api/construction-calc", {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.31" },
    body: JSON.stringify(method === "POST"
      ? { text: "幅2メートルのコンクリート体積", aiProviderConsent: true }
      : { slug: "concrete-volume", values: { width: 2, length: 3, thickness: 0.2 } }),
  });
}

describe("SEC3-H1 construction AI cost boundary", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
    vi.stubEnv("GEMINI_API_KEY", "synthetic-provider-key");
    vi.stubGlobal("fetch", fetchSpy);
    fetchSpy.mockImplementation(async () => Response.json({ candidates: [{ content: { parts: [{ text: '{"slug":null}' }] } }] }));
    limiter.checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("blocks the paid provider when the existing shared AI bucket is exhausted", async () => {
    limiter.checkRateLimit.mockResolvedValue({ allowed: false, retryAfterSec: 123 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("123");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails closed before the provider when shared state is unavailable", async () => {
    limiter.checkRateLimit.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain("database unavailable");
  });

  it("consumes the shared bucket before making one authorized provider call", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(limiter.checkRateLimit).toHaveBeenCalledWith("198.51.100.31");
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(limiter.checkRateLimit.mock.invocationCallOrder[0]).toBeLessThan(fetchSpy.mock.invocationCallOrder[0]);
  });

  it.each(["preview", "ai-off", "no-key"])("keeps %s deterministic without spending the shared AI bucket", async (mode) => {
    if (mode === "preview") vi.stubEnv("VERCEL_ENV", "preview");
    if (mode === "ai-off") vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
    if (mode === "no-key") vi.stubEnv("GEMINI_API_KEY", "");
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: "fallback" });
    expect(limiter.checkRateLimit).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps deterministic calculation available when the provider bucket is unavailable", async () => {
    limiter.checkRateLimit.mockRejectedValue(new Error("unavailable"));
    expect((await PUT(request("PUT"))).status).toBe(200);
    expect(limiter.checkRateLimit).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
