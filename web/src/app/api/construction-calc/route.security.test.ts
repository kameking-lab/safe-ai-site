import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GEMINI_FLASH_MODEL } from "@/lib/gemini-model";
import { POST, PUT } from "./route";

const limiter = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/chatbot-rate-limit", () => ({
  checkRateLimit: limiter.checkRateLimit,
  getClientIp: (request: Request) => request.headers.get("x-forwarded-for") ?? "unknown",
}));

const ledger = vi.hoisted(() => ({
  transaction: vi.fn(),
  month: vi.fn(),
  reserve: vi.fn(),
  settle: vi.fn(),
}));
vi.mock("@/lib/prisma", () => {
  const tx = {
    $executeRaw: vi.fn(),
    mobileBudgetMonth: { upsert: ledger.month, update: vi.fn() },
    mobileProviderReservation: { create: ledger.reserve, updateMany: ledger.settle },
  };
  return {
    prisma: {
      $transaction: (work: (db: typeof tx) => Promise<unknown>) => ledger.transaction(() => work(tx)),
    },
  };
});

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
    vi.stubEnv("SAFE_AI_STAGING_MODE", "false");
    vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "true");
    vi.stubEnv("GEMINI_API_KEY", "synthetic-provider-key");
    vi.stubEnv("MOBILE_LEDGER_ENABLED", "true");
    vi.stubEnv("MOBILE_AI_PRICED_MODEL", GEMINI_FLASH_MODEL);
    vi.stubEnv("MOBILE_AI_INPUT_JPY_PER_MILLION", "100");
    vi.stubEnv("MOBILE_AI_OUTPUT_JPY_PER_MILLION", "500");
    vi.stubEnv("MOBILE_AI_COST_MARGIN", "1.25");
    ledger.transaction.mockReset().mockImplementation(async (work: () => Promise<unknown>) => work());
    ledger.month.mockResolvedValue({ committedYen: 0, reservedYen: 0 });
    ledger.reserve.mockResolvedValue({ id: "test-reservation" });
    ledger.settle.mockResolvedValue({ count: 1 });
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
    expect(ledger.transaction).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails closed before the provider when shared rate-limit state is unavailable", async () => {
    limiter.checkRateLimit.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(ledger.transaction).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain("database unavailable");
  });

  it("consumes the shared bucket and reserves the monthly budget before one authorized provider call", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: "ai" });
    expect(limiter.checkRateLimit).toHaveBeenCalledOnce();
    expect(limiter.checkRateLimit).toHaveBeenCalledWith("198.51.100.31");
    expect(ledger.reserve).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(limiter.checkRateLimit).toHaveBeenCalledBefore(ledger.reserve);
    expect(ledger.reserve).toHaveBeenCalledBefore(fetchSpy);
  });

  it("falls back with zero provider calls when the shared monthly budget denies a reservation", async () => {
    ledger.month.mockResolvedValue({ committedYen: 45_000, reservedYen: 0 });

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: "fallback" });
    expect(ledger.month).toHaveBeenCalledOnce();
    expect(ledger.reserve).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back with zero provider calls when the budget reservation fails to commit", async () => {
    ledger.transaction.mockImplementationOnce(async (work: () => Promise<unknown>) => {
      await work();
      throw new Error("fixture budget transaction failed");
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: "fallback" });
    expect(ledger.reserve).toHaveBeenCalledOnce();
    expect(ledger.settle).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(["preview", "ai-off", "no-key"])("keeps %s deterministic without spending the shared AI bucket", async (mode) => {
    if (mode === "preview") vi.stubEnv("VERCEL_ENV", "preview");
    if (mode === "ai-off") vi.stubEnv("GEMINI_EXTERNAL_AI_ENABLED", "false");
    if (mode === "no-key") vi.stubEnv("GEMINI_API_KEY", "");
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: "fallback" });
    expect(limiter.checkRateLimit).not.toHaveBeenCalled();
    expect(ledger.transaction).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps deterministic calculation available when the provider bucket is unavailable", async () => {
    limiter.checkRateLimit.mockRejectedValue(new Error("unavailable"));
    expect((await PUT(request("PUT"))).status).toBe(200);
    expect(limiter.checkRateLimit).not.toHaveBeenCalled();
    expect(ledger.transaction).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
