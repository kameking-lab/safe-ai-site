import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: vi.fn(),
}));

import { getServiceSupabase } from "@/lib/supabase/server";
import { POST, DELETE } from "./route";

const mockGet = vi.mocked(getServiceSupabase);

const ORIG = {
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

/** upsert/delete が返す error を差し込める Supabase スタブ。 */
function supabaseStub(error: { code?: string; message?: string } | null) {
  return {
    from: () => ({
      upsert: () => Promise.resolve({ error }),
      delete: () => ({ eq: () => Promise.resolve({ error }) }),
    }),
  } as unknown as ReturnType<typeof getServiceSupabase>;
}

const goodBody = {
  subscription: {
    endpoint: "https://push.example.com/abc",
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  },
  prefecture: "JP-13",
};

function req(body: unknown) {
  return new Request("https://example.test/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockGet.mockReset();
});
afterEach(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ORIG.pub;
  process.env.VAPID_PRIVATE_KEY = ORIG.priv;
  process.env.VAPID_SUBJECT = ORIG.subj;
});

describe("POST /api/push/subscribe", () => {
  it("501 when VAPID not configured", async () => {
    setVapid(false);
    const res = await POST(req(goodBody));
    expect(res.status).toBe(501);
    expect((await res.json()).reason).toBe("not_configured");
  });

  it("503 when Supabase not configured", async () => {
    setVapid(true);
    mockGet.mockReturnValue(null);
    const res = await POST(req(goodBody));
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toBe("cloud_not_configured");
  });

  it("400 on incomplete subscription", async () => {
    setVapid(true);
    mockGet.mockReturnValue(supabaseStub(null));
    const res = await POST(req({ subscription: { endpoint: "x" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("missing_field");
  });

  it("501 table_not_ready when table is missing", async () => {
    setVapid(true);
    mockGet.mockReturnValue(supabaseStub({ code: "PGRST205", message: "schema cache" }));
    const res = await POST(req(goodBody));
    expect(res.status).toBe(501);
    expect((await res.json()).reason).toBe("table_not_ready");
  });

  it("200 ok on successful upsert", async () => {
    setVapid(true);
    mockGet.mockReturnValue(supabaseStub(null));
    const res = await POST(req(goodBody));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});

describe("DELETE /api/push/subscribe", () => {
  it("400 when endpoint missing", async () => {
    setVapid(true);
    mockGet.mockReturnValue(supabaseStub(null));
    const res = await DELETE(
      new Request("https://example.test/api/push/subscribe", { method: "DELETE" })
    );
    expect(res.status).toBe(400);
  });

  it("200 ok on delete by query param", async () => {
    setVapid(true);
    mockGet.mockReturnValue(supabaseStub(null));
    const res = await DELETE(
      new Request("https://example.test/api/push/subscribe?endpoint=https://push.example.com/abc", {
        method: "DELETE",
      })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});
