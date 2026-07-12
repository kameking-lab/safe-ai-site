import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ getServiceSupabase: vi.fn() }));
vi.mock("@/lib/jma/fetch-jma-runtime", () => ({ getJmaWarningsRuntime: vi.fn() }));

import { getServiceSupabase } from "@/lib/supabase/server";
import { getJmaWarningsRuntime } from "@/lib/jma/fetch-jma-runtime";
import { POST } from "./route";

const mockSupabase = vi.mocked(getServiceSupabase);
const mockWarnings = vi.mocked(getJmaWarningsRuntime);

const ORIG = {
  cron: process.env.CRON_SECRET,
  pub: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  priv: process.env.VAPID_PRIVATE_KEY,
  subj: process.env.VAPID_SUBJECT,
};

function setVapid(on: boolean) {
  if (on) {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
  } else {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  }
}

function subsStub(rows: unknown[], error: { code?: string; message?: string } | null = null) {
  return {
    from: () => ({
      select: () => ({ limit: () => Promise.resolve({ data: rows, error }) }),
      delete: () => ({ in: () => Promise.resolve({ error: null }) }),
    }),
  } as unknown as ReturnType<typeof getServiceSupabase>;
}

function req(auth: string | null, body?: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers.authorization = auth;
  return new Request("https://example.test/api/notify/push-weather-alert", {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  mockSupabase.mockReset();
  mockWarnings.mockReset();
  process.env.CRON_SECRET = "secret";
});
afterEach(() => {
  process.env.CRON_SECRET = ORIG.cron;
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ORIG.pub;
  process.env.VAPID_PRIVATE_KEY = ORIG.priv;
  process.env.VAPID_SUBJECT = ORIG.subj;
});

describe("POST /api/notify/push-weather-alert auth", () => {
  it("401 with wrong bearer", async () => {
    setVapid(true);
    const res = await POST(req("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("401 when CRON_SECRET unset (fail closed)", async () => {
    delete process.env.CRON_SECRET;
    setVapid(true);
    const res = await POST(req("Bearer secret"));
    expect(res.status).toBe(401);
  });

  it("501 when VAPID not configured", async () => {
    setVapid(false);
    const res = await POST(req("Bearer secret"));
    expect(res.status).toBe(501);
  });
});

describe("POST /api/notify/push-weather-alert dryRun", () => {
  it("counts warning-level alerts without sending", async () => {
    setVapid(true);
    mockSupabase.mockReturnValue(
      subsStub([{ endpoint: "https://push/1", p256dh: "p", auth: "a", prefecture: "JP-13" }])
    );
    mockWarnings.mockResolvedValue({
      fetchedAt: "2026-07-12T00:00:00Z",
      byIso: {
        "JP-13": {
          level: "warning",
          entries: [
            {
              sourceCode: "130000",
              level: "warning",
              headline: "大雨警報",
              reportDatetime: "2026-07-12T00:00:00Z",
              publishingOffice: "気象庁",
              warnings: [],
            },
          ],
        },
      },
    });
    const res = await POST(req("Bearer secret", { dryRun: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.subscriptions).toBe(1);
    expect(body.alerts).toBeGreaterThanOrEqual(1);
    expect(body.sent).toBe(0);
  });

  it("returns 0 alerts when only advisory-level (注意報) is active", async () => {
    setVapid(true);
    mockSupabase.mockReturnValue(
      subsStub([{ endpoint: "https://push/1", p256dh: "p", auth: "a", prefecture: "JP-13" }])
    );
    mockWarnings.mockResolvedValue({
      fetchedAt: "2026-07-12T00:00:00Z",
      byIso: {
        "JP-13": {
          level: "advisory",
          entries: [
            {
              sourceCode: "130000",
              level: "advisory",
              headline: "大雨注意報",
              reportDatetime: "2026-07-12T00:00:00Z",
              publishingOffice: "気象庁",
              warnings: [],
            },
          ],
        },
      },
    });
    const res = await POST(req("Bearer secret", { dryRun: true }));
    const body = await res.json();
    expect(body.alerts).toBe(0);
  });

  it("501 table_not_ready when subscriptions table is missing", async () => {
    setVapid(true);
    mockSupabase.mockReturnValue(subsStub([], { code: "42P01", message: "does not exist" }));
    const res = await POST(req("Bearer secret", { dryRun: true }));
    expect(res.status).toBe(501);
    expect((await res.json()).reason).toBe("table_not_ready");
  });
});
