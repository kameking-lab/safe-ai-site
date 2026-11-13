// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const billing = vi.hoisted(() => ({
  reserve: vi.fn(async () => ({ id: "legacy-intent", status: "pending" })),
  prepare: vi.fn(async () => ({ id: "prepared-intent" })),
}));
vi.mock("@/lib/mobile/billing-service", () => ({
  reservePurchase: billing.reserve,
  prepareApplePurchase: billing.prepare,
}));
vi.mock("@/lib/mobile/http", () => ({
  member: async () => "member",
  json: (value: unknown) => Response.json(value),
  failure: () => Response.json({ error: "INVALID_REQUEST" }, { status: 400 }),
}));
import { POST } from "./route";

beforeEach(() => vi.clearAllMocks());

it.each([undefined, "{}"])("keeps legacy reservation requests compatible (body=%s)", async (body) => {
  const response = await POST(new Request("http://localhost/api/billing/purchase-intents", { method: "POST", body }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: "legacy-intent", status: "pending" });
  expect(billing.reserve).toHaveBeenCalledExactlyOnceWith("member");
  expect(billing.prepare).not.toHaveBeenCalled();
});

it("prepares a new Apple attempt once without a second reservation", async () => {
  const body = { appUserId: "mock-app-user-identity", attemptId: crypto.randomUUID() };
  const response = await POST(new Request("http://localhost/api/billing/purchase-intents", { method: "POST", body: JSON.stringify(body) }));
  expect(response.status).toBe(200);
  expect(billing.prepare).toHaveBeenCalledExactlyOnceWith("member", body.appUserId, body.attemptId);
  expect(billing.reserve).not.toHaveBeenCalled();
});

it("rejects incomplete preparation before reserving or reconciling", async () => {
  const response = await POST(new Request("http://localhost/api/billing/purchase-intents", { method: "POST", body: JSON.stringify({ attemptId: crypto.randomUUID() }) }));
  expect(response.status).toBe(400);
  expect(billing.prepare).not.toHaveBeenCalled();
  expect(billing.reserve).not.toHaveBeenCalled();
});
