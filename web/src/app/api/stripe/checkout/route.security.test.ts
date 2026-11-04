// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  row: null as null | { userId: string; stripeCustomerId: string }, tail: Promise.resolve() as Promise<unknown>,
  create: vi.fn(), checkout: vi.fn(), lock: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "member", email: "member@example.test" } }) }));
vi.mock("@/lib/stripe-price-policy", () => ({ isPaidModeReady: () => true, resolveStripePlan: (id: string) => id === "price_pro" ? "pro" : null }));
vi.mock("stripe", () => ({ default: class {
  customers = { create: mocks.create };
  checkout = { sessions: { create: mocks.checkout } };
} }));
vi.mock("@/lib/prisma", () => {
  const tx = {
    $executeRaw: mocks.lock,
    subscription: {
      findUnique: async () => mocks.row ? { ...mocks.row } : null,
      upsert: async ({ create, update }: { create: { userId: string; stripeCustomerId: string }; update: { stripeCustomerId: string } }) => {
        mocks.row = mocks.row ? { ...mocks.row, ...update } : create;
        return mocks.row;
      },
    },
  };
  mocks.transaction.mockImplementation((run: (client: typeof tx) => Promise<unknown>) => {
    const result = mocks.tail.then(() => run(tx)); mocks.tail = result.catch(() => undefined); return result;
  });
  return { prisma: { ...tx, $transaction: mocks.transaction } };
});
import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks(); mocks.row = null; mocks.tail = Promise.resolve();
  vi.stubEnv("STRIPE_SECRET_KEY", "synthetic-key");
  mocks.create.mockImplementation(async () => { await Promise.resolve(); return { id: `cus_${mocks.create.mock.calls.length}` }; });
  mocks.checkout.mockResolvedValue({ url: "https://checkout.stripe.com/synthetic" });
});
afterEach(() => vi.unstubAllEnvs());
const request = () => new Request("https://example.test/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: '{"priceId":"price_pro"}' });

describe("SEC3-H3 concurrent customer mapping", () => {
  it("creates one customer for simultaneous starts and uses the same member lock as webhooks", async () => {
    const responses = await Promise.all([POST(request()), POST(request())]);
    expect(responses.map(response => response.status)).toEqual([200, 200]);
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.lock).toHaveBeenCalled();
    expect(mocks.lock.mock.calls[0][1]).toBe("stripe-member:member");
    const customers = mocks.checkout.mock.calls.map(call => call[0].customer);
    expect(new Set(customers).size).toBe(1);
    expect(customers[0]).toBe(mocks.row?.stripeCustomerId);
    expect(mocks.create.mock.calls[0][1]).toMatchObject({ idempotencyKey: expect.any(String) });
  });
});
