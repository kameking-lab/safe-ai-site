import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/cloud-owner", () => ({
  getCloudOwnerId: vi.fn(),
  privateJson: (payload: unknown, status = 200) =>
    Response.json(payload, { status, headers: { "Cache-Control": "no-store" } }),
  cloudAuthRequired: () =>
    Response.json(
      { ok: false, reason: "authentication_required" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    ),
  requireCloudConsent: (request: Request, scope: string) =>
    request.headers.get("x-cloud-consent") === scope
      ? null
      : Response.json(
          { ok: false, reason: "cloud_consent_required" },
          { status: 428, headers: { "Cache-Control": "no-store" } },
        ),
  readBoundedJson: async (request: Request) => {
    try {
      return { ok: true, value: await request.json() };
    } catch {
      return { ok: false, reason: "invalid_json" };
    }
  },
}));
vi.mock("@/lib/supabase/server", () => ({ getServiceSupabase: vi.fn() }));

import { getCloudOwnerId } from "@/lib/server/cloud-owner";
import { getServiceSupabase } from "@/lib/supabase/server";
import { POST as postKy, GET as getKy } from "./ky/records/route";
import { POST as postWorkers, GET as getWorkers } from "./ky/workers/route";
import { POST as postMeeting, GET as getMeeting } from "./meeting/records/route";
import { POST as postShare, GET as getShare } from "./meeting/share/route";
import {
  POST as postContribution,
  GET as getContribution,
} from "./meeting/contribute/[token]/route";
import { POST as postChemical, GET as getChemical } from "./chemical/ra-records/route";

const mockOwner = vi.mocked(getCloudOwnerId);
const mockSupabase = vi.mocked(getServiceSupabase);

const postRequest = (body: unknown, consent?: "ky-v1" | "meeting-v1") =>
  new Request("https://example.test/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(consent ? { "x-cloud-consent": consent } : {}),
    },
    body: JSON.stringify(body),
  });

describe("service-role cloud storage authorization", () => {
  beforeEach(() => {
    mockOwner.mockReset();
    mockSupabase.mockReset();
  });

  it("KY・作業員・打合せ・共有・化学RAは未認証でDBへ到達しない", async () => {
    mockOwner.mockResolvedValue(null);
    const calls: Array<() => Promise<Response>> = [
      () => postKy(postRequest({ deviceId: "attacker", record: {} })),
      () => getKy(new Request("https://example.test/api?deviceId=attacker")),
      () => postWorkers(postRequest({ deviceId: "attacker", workers: [] })),
      () => getWorkers(new Request("https://example.test/api")),
      () => postMeeting(postRequest({ deviceId: "attacker", record: {} })),
      () => getMeeting(new Request("https://example.test/api?deviceId=attacker")),
      () => postChemical(postRequest({ deviceId: "attacker", record: { payload: {} } })),
      () => getChemical(new Request("https://example.test/api")),
    ];

    for (const call of calls) {
      const response = await call();
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
      await expect(response.json()).resolves.toMatchObject({ reason: "authentication_required" });
    }
    for (const response of [
      await postShare(),
      await getShare(),
      await postContribution(),
      await getContribution(),
    ]) {
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      await expect(response.json()).resolves.toMatchObject({
        reason: "distributed_input_reverification_required",
      });
    }
    expect(mockSupabase).not.toHaveBeenCalled();
  });

  it("クライアント指定deviceIdを無視して認証ownerへ保存する", async () => {
    mockOwner.mockResolvedValue("user_server_derived");
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.mockReturnValue({ from: vi.fn(() => ({ insert })) } as never);

    const response = await postKy(postRequest({
      deviceId: "attacker-controlled",
      record: { workDateYear: "2026", workDateMonth: "07", workDateDay: "22" },
    }, "ky-v1"));
    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ device_id: "user_server_derived" }));
    expect(insert).not.toHaveBeenCalledWith(expect.objectContaining({ device_id: "attacker-controlled" }));
  });

  it("PF-020: 認証済みでも用途別クラウド同意がなければbodyを保存しない", async () => {
    mockOwner.mockResolvedValue("user_server_derived");
    const from = vi.fn();
    mockSupabase.mockReturnValue({ from } as never);

    const kyResponse = await postKy(postRequest({ record: { siteName: "テスト現場" } }));
    expect(kyResponse.status).toBe(428);
    await expect(kyResponse.json()).resolves.toMatchObject({
      reason: "cloud_consent_required",
    });

    const meetingResponse = await postMeeting(
      postRequest({ record: { siteName: "テスト現場" } }),
    );
    expect(meetingResponse.status).toBe(428);
    expect(from).not.toHaveBeenCalled();
  });
});
