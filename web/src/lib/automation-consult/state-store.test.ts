import { describe, expect, it, vi } from "vitest";
import {
  anonymizeAutomationConsultClient,
  getAutomationConsultPreviewDryRunStateStore,
  resolveAutomationConsultStateStore,
  UpstashAutomationConsultStateStore,
} from "./state-store";
import type { PrismaClient } from "@prisma/client";

function jsonResponse(result: unknown): Response {
  return new Response(JSON.stringify({ result }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("automation consultation shared state resolution", () => {
  it("production does not fall back to process-local state", () => {
    expect(
      resolveAutomationConsultStateStore({
        NODE_ENV: "production",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      ok: false,
      reason: "production_shared_store_required",
    });
  });

  it("rejects incomplete and non-Upstash endpoints without making a request", () => {
    expect(
      resolveAutomationConsultStateStore({
        NODE_ENV: "production",
        AUTOMATION_CONSULT_STATE_BACKEND: "upstash",
        UPSTASH_REDIS_REST_URL: "http://127.0.0.1:6379",
        UPSTASH_REDIS_REST_TOKEN: "x".repeat(32),
      } as NodeJS.ProcessEnv),
    ).toEqual({
      ok: false,
      reason: "incomplete_upstash_configuration",
    });
  });

  it("uses a server-only shared adapter when all production settings exist", () => {
    const resolved = resolveAutomationConsultStateStore({
      NODE_ENV: "production",
      AUTOMATION_CONSULT_STATE_BACKEND: "upstash",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "x".repeat(32),
    } as NodeJS.ProcessEnv);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.store.backend).toBe("upstash");
  });

  it("uses the existing server-only Postgres client without a memory fallback", () => {
    const database = {} as PrismaClient;
    const resolved = resolveAutomationConsultStateStore(
      {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://configured-server-only",
        AUTOMATION_CONSULT_STATE_BACKEND: "postgres",
      } as NodeJS.ProcessEnv,
      fetch,
      database,
    );
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.store.backend).toBe("postgres");
    expect(
      resolveAutomationConsultStateStore(
        {
          NODE_ENV: "production",
          AUTOMATION_CONSULT_STATE_BACKEND: "postgres",
        } as NodeJS.ProcessEnv,
        fetch,
        null,
      ),
    ).toEqual({
      ok: false,
      reason: "incomplete_postgres_configuration",
    });
  });

  it("provides process-local dry-run state only from trusted preview environment", () => {
    expect(
      getAutomationConsultPreviewDryRunStateStore({
        NODE_ENV: "test",
        VERCEL_ENV: "preview",
      } as NodeJS.ProcessEnv)?.backend,
    ).toBe("memory");
    expect(
      getAutomationConsultPreviewDryRunStateStore({
        NODE_ENV: "production",
      } as NodeJS.ProcessEnv),
    ).toBeNull();
    expect(
      getAutomationConsultPreviewDryRunStateStore({
        NODE_ENV: "production",
        SAFE_AI_STAGING_MODE: "false",
        dryRun: "true",
      } as NodeJS.ProcessEnv),
    ).toBeNull();
  });
});

describe("automation consultation client key privacy", () => {
  it("requires a strong server secret and never returns the raw address", () => {
    expect(anonymizeAutomationConsultClient("203.0.113.25", "short")).toBeNull();
    const anonymous = anonymizeAutomationConsultClient(
      "203.0.113.25",
      "s".repeat(32),
    );
    expect(anonymous).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(anonymous).not.toContain("203.0.113.25");
    expect(
      anonymizeAutomationConsultClient("203.0.113.25", "s".repeat(32)),
    ).toBe(anonymous);
  });
});

describe("Upstash automation consultation state adapter", () => {
  it("uses atomic scripts for pending, completion and replay without storing form fields", async () => {
    const success = {
      ok: true as const,
      referenceId: "AC-20260724-ABC123",
      receivedAt: "2026-07-24T01:02:03.000Z",
    };
    const encoded = Buffer.from(JSON.stringify(success), "utf8").toString(
      "base64url",
    );
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse("new"))
      .mockResolvedValueOnce(jsonResponse(1))
      .mockResolvedValueOnce(jsonResponse(`replay|${encoded}`));
    const store = new UpstashAutomationConsultStateStore(
      "https://example.upstash.io",
      "server-secret-token",
      fetchMock,
    );

    await expect(
      store.beginIdempotency("safe-key", "fingerprint"),
    ).resolves.toEqual({ state: "new" });
    await expect(
      store.completeIdempotency("safe-key", "fingerprint", success),
    ).resolves.toBe(true);
    await expect(
      store.beginIdempotency("safe-key", "fingerprint"),
    ).resolves.toEqual({ state: "replay", response: success });

    const serializedRequests = fetchMock.mock.calls
      .map((call) => String((call[1] as RequestInit | undefined)?.body ?? ""))
      .join("\n");
    expect(serializedRequests).not.toContain("name");
    expect(serializedRequests).not.toContain("email");
    expect(serializedRequests).not.toContain("company");
    expect(serializedRequests).not.toContain("consultation");
  });

  it("returns shared retry-after and fails closed on malformed replies", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([6, 41]))
      .mockResolvedValueOnce(jsonResponse(["invalid"]));
    const store = new UpstashAutomationConsultStateStore(
      "https://example.upstash.io",
      "server-secret-token",
      fetchMock,
    );
    await expect(store.consumeRateLimit("anonymous")).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 41,
    });
    await expect(store.consumeRateLimit("anonymous")).rejects.toThrow(
      "shared_state_invalid_rate_result",
    );
  });
});
