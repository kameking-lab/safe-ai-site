import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: vi.fn(),
}));

import { getServiceSupabase } from "@/lib/supabase/server";
import { __resetPushSubscriptionRateLimitForTests } from "@/lib/notifications/push-subscription-rate-limit";
import { DELETE, POST } from "./route";

const mockGet = vi.mocked(getServiceSupabase);

const ORIG = {
  pub: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  priv: process.env.VAPID_PRIVATE_KEY,
  subj: process.env.VAPID_SUBJECT,
  enabled: process.env.PUSH_DELIVERY_ENABLED,
};

function setVapid(on: boolean) {
  if (on) {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    process.env.PUSH_DELIVERY_ENABLED = "true";
  } else {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    delete process.env.PUSH_DELIVERY_ENABLED;
  }
}

function supabaseStub(error: { code?: string; message?: string } | null) {
  const upsert = vi.fn(() => Promise.resolve({ error }));
  const eq = vi.fn(() => Promise.resolve({ error }));
  return {
    client: {
      from: () => ({
        upsert,
        delete: () => ({ eq }),
      }),
    } as unknown as ReturnType<typeof getServiceSupabase>,
    upsert,
    eq,
  };
}

const goodBody = {
  subscription: {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-token",
    expirationTime: null,
    keys: {
      p256dh: Buffer.alloc(65, 1).toString("base64url"),
      auth: Buffer.alloc(16, 2).toString("base64url"),
    },
  },
  prefecture: "JP-13",
};

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "192.0.2.10",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockGet.mockReset();
  __resetPushSubscriptionRateLimitForTests();
});

afterEach(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ORIG.pub;
  process.env.VAPID_PRIVATE_KEY = ORIG.priv;
  process.env.VAPID_SUBJECT = ORIG.subj;
  if (ORIG.enabled === undefined) delete process.env.PUSH_DELIVERY_ENABLED;
  else process.env.PUSH_DELIVERY_ENABLED = ORIG.enabled;
});

describe("POST /api/push/subscribe", () => {
  it("returns a private 501 response when VAPID is not configured", async () => {
    setVapid(false);
    const res = await POST(req(goodBody));
    expect(res.status).toBe(501);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).reason).toBe("not_configured");
  });

  it("returns 503 when Supabase is not configured", async () => {
    setVapid(true);
    mockGet.mockReturnValue(null);
    const res = await POST(req(goodBody));
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).reason).toBe("cloud_not_configured");
  });

  it("rejects an arbitrary endpoint without touching the database", async () => {
    setVapid(true);
    const stub = supabaseStub(null);
    mockGet.mockReturnValue(stub.client);
    const res = await POST(
      req({
        ...goodBody,
        subscription: { ...goodBody.subscription, endpoint: "https://example.com/push/token" },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("invalid_subscription");
    expect(stub.upsert).not.toHaveBeenCalled();
  });

  it("rejects invalid key material and prefecture values", async () => {
    setVapid(true);
    const stub = supabaseStub(null);
    mockGet.mockReturnValue(stub.client);

    const badKey = await POST(
      req({
        ...goodBody,
        subscription: { ...goodBody.subscription, keys: { p256dh: "short", auth: "short" } },
      }),
    );
    expect(badKey.status).toBe(400);

    const badPrefecture = await POST(req({ ...goodBody, prefecture: "JP-99" }));
    expect(badPrefecture.status).toBe(400);
    expect(stub.upsert).not.toHaveBeenCalled();
  });

  it("rejects non-JSON and oversized bodies", async () => {
    setVapid(true);
    mockGet.mockReturnValue(supabaseStub(null).client);

    const nonJson = await POST(
      new Request("https://example.test/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "text/plain", "X-Forwarded-For": "192.0.2.11" },
        body: "not json",
      }),
    );
    expect(nonJson.status).toBe(415);

    const jsonp = await POST(
      new Request("https://example.test/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/jsonp",
          "X-Forwarded-For": "192.0.2.13",
        },
        body: JSON.stringify(goodBody),
      }),
    );
    expect(jsonp.status).toBe(415);

    const oversized = await POST(
      req({ padding: "x".repeat(16_385) }, {
        "X-Forwarded-For": "192.0.2.12",
      }),
    );
    expect(oversized.status).toBe(413);
    expect(oversized.headers.get("cache-control")).toBe("no-store");
  });

  it("returns table_not_ready when the table is missing", async () => {
    setVapid(true);
    mockGet.mockReturnValue(
      supabaseStub({ code: "PGRST205", message: "schema cache details" }).client,
    );
    const res = await POST(req(goodBody));
    expect(res.status).toBe(501);
    expect((await res.json()).reason).toBe("table_not_ready");
  });

  it("does not expose database error details", async () => {
    setVapid(true);
    mockGet.mockReturnValue(
      supabaseStub({ code: "XX000", message: "internal database host and detail" }).client,
    );
    const res = await POST(req(goodBody));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, reason: "db_error" });
  });

  it("upserts a normalized, validated subscription", async () => {
    setVapid(true);
    const stub = supabaseStub(null);
    mockGet.mockReturnValue(stub.client);
    const res = await POST(req(goodBody));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(stub.upsert).toHaveBeenCalledWith(
      {
        endpoint: goodBody.subscription.endpoint,
        p256dh: goodBody.subscription.keys.p256dh,
        auth: goodBody.subscription.keys.auth,
        prefecture: "JP-13",
      },
      { onConflict: "endpoint" },
    );
  });

  it("rate limits repeated mutations by client IP", async () => {
    setVapid(true);
    mockGet.mockReturnValue(supabaseStub(null).client);
    let res: Response | undefined;
    for (let i = 0; i < 31; i += 1) res = await POST(req(goodBody));
    expect(res?.status).toBe(429);
    expect(res?.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(res?.headers.get("cache-control")).toBe("no-store");
  });
});

describe("DELETE /api/push/subscribe", () => {
  it("rejects a missing or unapproved endpoint", async () => {
    setVapid(true);
    const stub = supabaseStub(null);
    mockGet.mockReturnValue(stub.client);

    const missing = await DELETE(
      new Request("https://example.test/api/push/subscribe", {
        method: "DELETE",
        headers: { "X-Forwarded-For": "192.0.2.20" },
      }),
    );
    expect(missing.status).toBe(400);

    const privateHost = await DELETE(
      new Request("https://example.test/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "X-Forwarded-For": "192.0.2.21",
          "content-type": "application/json",
        },
        body: JSON.stringify({ endpoint: "https://127.0.0.1/push" }),
      }),
    );
    expect(privateHost.status).toBe(400);
    expect(stub.eq).not.toHaveBeenCalled();
  });

  it("deletes only a validated provider endpoint", async () => {
    setVapid(true);
    const stub = supabaseStub(null);
    mockGet.mockReturnValue(stub.client);
    const endpoint = "https://updates.push.services.mozilla.com/wpush/v2/test-token";
    const res = await DELETE(
      new Request("https://example.test/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "X-Forwarded-For": "192.0.2.22",
          "content-type": "application/json",
        },
        body: JSON.stringify({ endpoint }),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(stub.eq).toHaveBeenCalledWith("endpoint", endpoint);
  });
});
