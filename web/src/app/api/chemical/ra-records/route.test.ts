import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: () => ({
    from: () => ({ upsert: mocks.upsert }),
  }),
}));

vi.mock("@/lib/server/cloud-owner", () => {
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "private, no-store",
      },
    });
  return {
    getCloudOwnerId: vi.fn().mockResolvedValue("owner-test"),
    cloudAuthRequired: () => json({ ok: false, reason: "auth_required" }, 401),
    privateJson: json,
    readBoundedJson: async (request: Request) => {
      try {
        return { ok: true as const, value: await request.json() };
      } catch {
        return { ok: false as const, reason: "invalid_json" as const };
      }
    },
  };
});

vi.mock("@/lib/mhlw-chemicals-slim", () => ({
  findByCasSlim: (cas: string) =>
    ({
      "108-88-3": { primaryName: "トルエン", aliases: [] },
      "67-64-1": { primaryName: "アセトン", aliases: [] },
    })[cas],
}));

import { POST } from "./route";

function request(payload: unknown) {
  return new Request("http://localhost/api/chemical/ra-records", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cloudConsent: true,
      record: {
        raId: "mixture-test",
        substance: "匿名化した混合物",
        workContent: "混合物RA",
        payload,
      },
    }),
  });
}

function validPayload() {
  return {
    type: "mixture",
    components: [
      { name: "トルエン", cas: "108-88-3", concentration: 40, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 60, unit: "wt%" },
    ],
    humanReviewConfirmed: true,
    humanReviewAt: new Date().toISOString(),
  };
}

describe("POST /api/chemical/ra-records mixture validation", () => {
  beforeEach(() => {
    mocks.upsert.mockReset();
    mocks.upsert.mockResolvedValue({ error: null });
  });

  it.each([
    [{ ...validPayload(), humanReviewConfirmed: false }, "human_review_required"],
    [
      {
        ...validPayload(),
        components: [
          { name: "トルエン", cas: "108-88-3", concentration: 20, unit: "wt%" },
          { name: "アセトン", cas: "67-64-1", concentration: 60, unit: "wt%" },
        ],
      },
      "invalid_total",
    ],
    [
      {
        ...validPayload(),
        components: [
          { name: "不明物質", cas: "50-00-0", concentration: 40, unit: "wt%" },
          { name: "アセトン", cas: "67-64-1", concentration: 60, unit: "wt%" },
        ],
      },
      "unknown_cas",
    ],
  ])("invalid mixture fails closed before storage: %s", async (payload, reason) => {
    const response = await POST(request(payload));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      reason,
      requiresHumanReview: true,
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("stores only server-normalized components after current human review", async () => {
    const response = await POST(
      request({
        ...validPayload(),
        advice: "クライアントが付与した未検証の換気・保護具助言",
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    const stored = mocks.upsert.mock.calls[0]?.[0] as {
      payload: { components: Array<Record<string, unknown>>; advice?: unknown };
    };
    expect(stored.payload.components).toEqual([
      { name: "トルエン", cas: "108-88-3", concentration: 40, unit: "wt%" },
      { name: "アセトン", cas: "67-64-1", concentration: 60, unit: "wt%" },
    ]);
    expect(stored.payload).not.toHaveProperty("advice");
  });
});
