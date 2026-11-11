// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock('@/lib/mobile/operations-alerts',()=>({deliverOperationsAlerts:vi.fn(async()=>({sent:0}))}));
const sales=vi.hoisted(()=>vi.fn(async(_deadline:number)=>({closed:0})));
vi.mock('@/lib/mobile/pro-sales-checkouts',()=>({processPausedStripeCheckouts:sales}));

const calls = vi.hoisted(() => ({ billing: [] as number[], deletions: [] as number[], enqueue: [] as number[], deliver: [] as number[] }));
const deleteMany = vi.hoisted(() => vi.fn(async () => ({ count: 0 })));
vi.mock("@/lib/mobile/billing-service", () => ({
  billingDb: () => ({ mobileAuthFlow: { deleteMany }, mobileSession: { deleteMany }, mobileUsageOperation: { deleteMany } }),
  processBillingEvents: vi.fn(async (_limit: number, deadline: number) => { calls.billing.push(deadline); return { processed: 0 }; }),
}));
vi.mock("@/lib/mobile/account-deletion", () => ({ processAccountDeletions: vi.fn(async (deadline: number) => { calls.deletions.push(deadline); return { checked: 0 }; }) }));
vi.mock("@/lib/mobile/notification-worker", () => ({
  enqueueWeather: vi.fn(async (deadline: number) => { calls.enqueue.push(deadline); }),
  deliverWeather: vi.fn(async (_send: unknown, deadline: number) => { calls.deliver.push(deadline); return { sent: 0 }; }),
}));
import { POST, maxDuration } from "./route";

const AUTH = "Bearer synthetic-maintenance";
afterEach(() => { vi.unstubAllEnvs();sales.mockClear(); for (const list of Object.values(calls)) list.length = 0; });

describe("mobile maintenance", () => {
  it("rejects a missing or wrong authorization", async () => {
    vi.stubEnv("MOBILE_MAINTENANCE_AUTHORIZATION", AUTH);
    for (const headers of [{}, { Authorization: "Bearer wrong" }] as Record<string, string>[]) {
      expect((await POST(new Request("https://example.test/api/mobile/v1/maintenance", { method: "POST", headers }))).status).toBe(401);
    }
    expect(calls.billing).toHaveLength(0);
    expect(sales).not.toHaveBeenCalled();
  });

  it("fits every phase into one 45-second budget under the 60-second function limit", async () => {
    vi.stubEnv("MOBILE_MAINTENANCE_AUTHORIZATION", AUTH);
    vi.stubEnv("MOBILE_APNS_ENABLED", "true");
    const started = Date.now();
    const response = await POST(new Request("https://example.test/api/mobile/v1/maintenance", { method: "POST", headers: { Authorization: AUTH } }));
    expect(response.status).toBe(200);
    const deadline = calls.deliver[0];
    expect(deadline - started).toBeLessThanOrEqual(45_000 + 50);
    expect(calls.deletions[0]).toBe(deadline - 25_000);
    expect(sales).toHaveBeenCalledWith(deadline - 35_000);
    expect(calls.billing[0]).toBe(deadline - 15_000);
    expect(calls.enqueue[0]).toBe(deadline - 5_000);
    expect(maxDuration).toBe(60);
  });
});
