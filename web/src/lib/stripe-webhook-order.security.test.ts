// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const provider = vi.hoisted(() => ({ retrieve: vi.fn() }));
vi.mock("stripe", () => ({ default: class { subscriptions = { retrieve: provider.retrieve }; } }));
import {
  handleCheckoutCompleted, handleSubscriptionUpdated, handleSubscriptionDeleted,
  handleInvoicePaymentSucceeded, handleInvoicePaymentFailed,
} from "./stripe-webhook-handlers";

const future = Math.floor(Date.now() / 1000) + 86_400;
function subscription(status = "active", id = "sub_current", customer = "cus_owner") {
  return { id, customer, status, created: 100, items: { data: [{ price: { id: "price_pro" }, current_period_end: future }] } } as unknown as Stripe.Subscription;
}
function database() {
  const row = { userId: "owner", stripeCustomerId: "cus_owner", stripeSubscriptionId: "sub_current" as string | null, planName: "pro", status: "active" };
  const updateMany = vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
    if (Object.entries(where).some(([key, value]) => row[key as keyof typeof row] !== value)) return { count: 0 };
    Object.assign(row, data); return { count: 1 };
  });
  const findUnique = vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
    Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value) ? { ...row } : null);
  const upsert = vi.fn(async ({ update }: { update: Record<string, unknown> }) => { Object.assign(row, update); return row; });
  const lock = vi.fn().mockResolvedValue(1);
  const client = { $executeRaw: lock, subscription: { findUnique, updateMany, upsert } };
  return { row, updateMany, upsert, lock, client: client as unknown as Parameters<typeof handleSubscriptionUpdated>[0] };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "synthetic-provider-key");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PRO", "price_pro");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PRICE_PREMIUM", "price_standard");
});
afterEach(() => vi.unstubAllEnvs());

describe("SEC3-H3 authoritative Stripe reconciliation", () => {
  it("does not restore a canceled subscription from a delayed active event", async () => {
    const db = database();
    provider.retrieve.mockResolvedValue(subscription("canceled"));
    await handleSubscriptionDeleted(db.client, subscription("canceled"));
    await handleSubscriptionUpdated(db.client, subscription("active"));
    expect(db.row).toMatchObject({ planName: "free", status: "canceled" });
    expect(provider.retrieve).toHaveBeenCalled();
    expect(db.lock.mock.invocationCallOrder[0]).toBeLessThan(provider.retrieve.mock.invocationCallOrder[0]);
  });

  it("never replaces the current binding with an obsolete subscription", async () => {
    const db = database();
    provider.retrieve.mockImplementation(async (id: string) => subscription(id === "sub_current" ? "active" : "canceled", id));
    await handleSubscriptionUpdated(db.client, subscription("active", "sub_old"));
    expect(db.row).toMatchObject({ stripeSubscriptionId: "sub_current", status: "active" });
  });

  it("does not revoke the current subscription on deletion of an older one", async () => {
    const db = database(); provider.retrieve.mockResolvedValue(subscription());
    await handleSubscriptionDeleted(db.client, subscription("canceled", "sub_old"));
    expect(db.row).toMatchObject({ planName: "pro", status: "active", stripeSubscriptionId: "sub_current" });
  });

  it("rejects a canonical subscription whose customer does not own the local binding", async () => {
    const db = database(); provider.retrieve.mockResolvedValue(subscription("active", "sub_current", "cus_other"));
    await expect(handleSubscriptionUpdated(db.client, subscription())).rejects.toThrow();
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it("keeps the event retryable when authoritative provider lookup fails", async () => {
    const db = database(); provider.retrieve.mockRejectedValue(new Error("synthetic outage"));
    await expect(handleSubscriptionUpdated(db.client, subscription())).rejects.toThrow();
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it("removes stale paid rights when the canonical price is outside the server allowlist", async () => {
    const db = database();
    const canonical = subscription();
    canonical.items.data[0].price.id = "price_unrecognized";
    provider.retrieve.mockResolvedValue(canonical);
    await handleSubscriptionUpdated(db.client, subscription());
    expect(db.row).toMatchObject({ planName: "free", status: "active" });
  });

  it("still revokes when a delayed event contains a retired price", async () => {
    const db = database(); provider.retrieve.mockResolvedValue(subscription("canceled"));
    const stale = subscription(); stale.items.data[0].price.id = "price_retired";
    await handleSubscriptionUpdated(db.client, stale);
    expect(db.row).toMatchObject({ planName: "free", status: "canceled" });
  });

  it.each(["past_due", "unpaid", "incomplete", "incomplete_expired", "paused", "canceled"])("does not grant a paid plan for %s", async (status) => {
    const db = database(); provider.retrieve.mockResolvedValue(subscription(status));
    await handleSubscriptionUpdated(db.client, subscription());
    expect(db.row).toMatchObject({ planName: "free", status });
  });

  it("does not activate a canceled subscription from a delayed paid checkout", async () => {
    const db = database(); provider.retrieve.mockResolvedValue(subscription("canceled"));
    await handleCheckoutCompleted(db.client, { id: "cs_old", mode: "subscription", payment_status: "paid", customer: "cus_owner", subscription: "sub_current", metadata: { userId: "owner" } } as unknown as Stripe.Checkout.Session);
    expect(db.row).toMatchObject({ planName: "free", status: "canceled" });
  });

  it("does not grant access for an unpaid completed checkout", async () => {
    const db = database();
    await handleCheckoutCompleted(db.client, { mode: "subscription", payment_status: "unpaid", customer: "cus_owner", subscription: "sub_current", metadata: { userId: "owner" } } as unknown as Stripe.Checkout.Session);
    expect(db.upsert).not.toHaveBeenCalled(); expect(db.updateMany).not.toHaveBeenCalled();
    expect(provider.retrieve).not.toHaveBeenCalled();
  });

  it.each([handleInvoicePaymentSucceeded, handleInvoicePaymentFailed])("reconciles current invoice subscription rather than trusting event payment status", async (handler) => {
    const db = database(); provider.retrieve.mockResolvedValue(subscription("canceled"));
    await handler(db.client, { parent: { subscription_details: { subscription: "sub_current" } } } as unknown as Stripe.Invoice);
    expect(db.row).toMatchObject({ planName: "free", status: "canceled" });
  });

  it("refuses checkout metadata that names another customer's local account", async () => {
    const db = database(); provider.retrieve.mockResolvedValue(subscription("active", "sub_current", "cus_other"));
    await expect(handleCheckoutCompleted(db.client, { mode: "subscription", payment_status: "paid", customer: "cus_other", subscription: "sub_current", metadata: { userId: "owner" } } as unknown as Stripe.Checkout.Session)).rejects.toThrow();
    expect(db.upsert).not.toHaveBeenCalled(); expect(db.updateMany).not.toHaveBeenCalled();
  });
});
