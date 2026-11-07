// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  row: null as null | { userId: string; stripeCustomerId: string; stripeSubscriptionId?: string; planName?: string; status?: string; billingHold?: boolean }, tail: Promise.resolve() as Promise<unknown>,
  create: vi.fn(), checkout: vi.fn(), retrieve: vi.fn(), grants: vi.fn(), lock: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "member", email: "member@example.test" } }) }));
vi.mock("@/lib/stripe-price-policy", () => ({ isPaidModeReady: () => true, resolveStripePlan: (id: string) => id === "price_pro" ? "pro" : null }));
vi.mock("stripe", () => ({ default: class {
  customers = { create: mocks.create };
  checkout = { sessions: { create: mocks.checkout } };
  subscriptions = { retrieve: mocks.retrieve };
} }));
vi.mock("@/lib/prisma", () => {
  const tx = {
    $executeRaw: mocks.lock,
    subscription: {
      findUnique: async () => mocks.row ? { ...mocks.row } : null,
      findMany: async () => mocks.row ? [{ userId: mocks.row.userId }] : [],
      updateMany: async ({ data }: { data: Record<string, unknown> }) => { Object.assign(mocks.row!, data); return { count: 1 }; },
      upsert: async ({ create, update }: { create: { userId: string; stripeCustomerId: string }; update: { stripeCustomerId: string } }) => {
        mocks.row = mocks.row ? { ...mocks.row, ...update } : create;
        return mocks.row;
      },
    },
    mobileGrant: { updateMany: mocks.grants },
  };
  mocks.transaction.mockImplementation((run: (client: typeof tx) => Promise<unknown>) => {
    const result = mocks.tail.then(() => run(tx)); mocks.tail = result.catch(() => undefined); return result;
  });
  return { prisma: { ...tx, $transaction: mocks.transaction } };
});
import { POST } from "./route";
import { handleSubscriptionDeleted } from "@/lib/stripe-webhook-handlers";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

beforeEach(() => {
  vi.clearAllMocks(); mocks.row = null; mocks.tail = Promise.resolve();
  vi.stubEnv("STRIPE_SECRET_KEY", "synthetic-key");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PRO", "price_pro");
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
    // The winning mapping must still allow cancellation to revoke paid rights.
    Object.assign(mocks.row!, { stripeSubscriptionId: "sub_member", planName: "pro", status: "active" });
    const canceled = { id: "sub_member", customer: mocks.row!.stripeCustomerId, status: "canceled", items: { data: [{ price: { id: "price_pro" } }] } } as unknown as Stripe.Subscription;
    mocks.retrieve.mockResolvedValue(canceled);
    await handleSubscriptionDeleted(prisma!, canceled);
    expect(mocks.row).toMatchObject({ planName: "free", status: "canceled" });
  });
});
