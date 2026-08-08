import { beforeEach, describe, expect, it, vi } from "vitest";

const { readiness, consumeRateLimit, persistMetric } = vi.hoisted(() => ({
  readiness: vi.fn(),
  consumeRateLimit: vi.fn(),
  persistMetric: vi.fn(),
}));

vi.mock("@/lib/rum/server-readiness", () => ({
  getRumServerReadiness: readiness,
}));
vi.mock("@/lib/rum/postgres-store", () => ({
  anonymizeRumClient: () => "anonymous-client",
  consumeRumRateLimit: consumeRateLimit,
  getRumClientIp: () => "synthetic-client",
  persistRumMetric: persistMetric,
}));

import { POST } from "./route";

const PAYLOAD = {
  route_template: "/",
  metric: "LCP",
  value: 2_400,
  rating: "good",
  navigation_type: "navigate",
  device_class: "mobile",
  connection_class: "medium",
  build_id: "build_20260729",
  anonymous_bucket: "rum_0123456789abcdef01234567",
};

function request(body: unknown, origin = "https://www.anzen-ai-portal.jp") {
  return new Request("https://www.anzen-ai-portal.jp/api/rum", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("RUM collector route", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    readiness.mockReturnValue({
      ready: false,
      sinkEndpoint: null,
      sinkBackend: null,
    });
    consumeRateLimit.mockResolvedValue({ allowed: true });
    persistMetric.mockResolvedValue(undefined);
  });

  it("fails closed before reading a payload when external readiness is absent", async () => {
    const response = await POST(request({ email: "person@example.test" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "rum_unavailable" },
    });
  });

  it("rejects cross-origin and extra/sensitive fields", async () => {
    readiness.mockReturnValue({
      ready: true,
      sinkEndpoint: "https://rum-collector.example.test/v1/web-vitals",
      sinkBackend: "external",
    });
    expect((await POST(request(PAYLOAD, "https://evil.example"))).status).toBe(403);
    expect(
      (await POST(request({ ...PAYLOAD, consultation_text: "private" }))).status,
    ).toBe(422);
  });

  it("forwards only validated schema and echoes no payload", async () => {
    readiness.mockReturnValue({
      ready: true,
      sinkEndpoint: "https://rum-collector.example.test/v1/web-vitals",
      sinkBackend: "external",
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request(PAYLOAD));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(PAYLOAD);
  });

  it("persists only validated payloads in the shared Postgres sink", async () => {
    readiness.mockReturnValue({
      ready: true,
      sinkEndpoint: null,
      sinkBackend: "postgres",
      retentionDays: 30,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(PAYLOAD));

    expect(response.status).toBe(204);
    expect(consumeRateLimit).toHaveBeenCalledWith("anonymous-client");
    expect(persistMetric).toHaveBeenCalledWith(PAYLOAD, 30);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rate limits before reading or persisting a RUM payload", async () => {
    readiness.mockReturnValue({
      ready: true,
      sinkEndpoint: null,
      sinkBackend: "postgres",
      retentionDays: 30,
    });
    consumeRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 17,
    });

    const response = await POST(request({ ...PAYLOAD, email: "not-read" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("17");
    expect(persistMetric).not.toHaveBeenCalled();
  });
});
