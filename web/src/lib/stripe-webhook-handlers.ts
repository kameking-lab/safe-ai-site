// Webhook payloads are authenticated notifications, not current entitlement state.
// Callers must wrap the handler and StripeEvent insert in one DB transaction.
import type Stripe from "stripe";
import type { Prisma, PrismaClient } from "@prisma/client";
import { resolveStripePlan } from "@/lib/stripe-price-policy";

type StripeDb = PrismaClient | Prisma.TransactionClient;
type Owner = {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

function objectId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  const end = typeof top === "number" ? top : sub.items?.data?.[0]?.current_period_end;
  return typeof end === "number" && Number.isFinite(end) ? new Date(end * 1000) : null;
}

async function retrieveSubscription(id: string): Promise<Stripe.Subscription> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe subscription lookup unavailable");
  const Stripe = (await import("stripe")).default;
  return new Stripe(key, { timeout: 4_000, maxNetworkRetries: 0 }).subscriptions.retrieve(id);
}

async function lockOwner(database: StripeDb, userId: string): Promise<void> {
  // Same transaction as the event record: serialize lookup + provider read +
  // mutation for this member, so an older fetch cannot overwrite a newer one.
  await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`stripe-member:${userId}`}, 0))`;
}

function verifiedData(sub: Stripe.Subscription, expectedId: string, customerId: string) {
  if (sub.id !== expectedId || objectId(sub.customer) !== customerId) {
    throw new Error("Stripe subscription ownership mismatch");
  }
  const priceId = sub.items.data[0]?.price.id ?? null;
  const configuredPlan = resolveStripePlan(priceId);
  const currentPeriodEnd = periodEnd(sub);
  const entitled =
    (sub.status === "active" || sub.status === "trialing") &&
    currentPeriodEnd !== null && currentPeriodEnd.getTime() > Date.now();
  return {
    stripePriceId: priceId,
    // Unknown canonical prices cannot grant a plan, including retaining an
    // older paid grant. Do not abort before revoking that stale entitlement.
    planName: entitled && configuredPlan ? configuredPlan : "free",
    status: sub.status,
    currentPeriodEnd,
  };
}

async function reconcileBoundSubscription(database: StripeDb, triggerId: string, customerId?: string | null) {
  let owner: Owner | null = await database.subscription.findUnique({ where: { stripeSubscriptionId: triggerId } });
  if (!owner && customerId) owner = await database.subscription.findUnique({ where: { stripeCustomerId: customerId } });
  // Unknown ownership is never inferred from subscription metadata or email.
  if (!owner) return;
  await lockOwner(database, owner.userId);
  owner = await database.subscription.findUnique({ where: { userId: owner.userId } });
  if (!owner?.stripeCustomerId) throw new Error("Stripe customer mapping unavailable");
  if (customerId && owner.stripeCustomerId !== customerId) throw new Error("Stripe customer mismatch");
  const subscriptionId = owner.stripeSubscriptionId ?? triggerId;
  const canonical = await retrieveSubscription(subscriptionId);
  const data = verifiedData(canonical, subscriptionId, owner.stripeCustomerId);
  // Customer-only recovery may fill a missing binding, never replace one.
  const changed = await database.subscription.updateMany({
    where: { userId: owner.userId, stripeCustomerId: owner.stripeCustomerId, stripeSubscriptionId: owner.stripeSubscriptionId },
    data: { ...data, stripeSubscriptionId: subscriptionId },
  });
  if (changed.count !== 1) throw new Error("Stripe mapping changed during reconciliation");
}

export async function handleCheckoutCompleted(database: StripeDb, session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription" || !["paid", "no_payment_required"].includes(session.payment_status)) return;
  const userId = session.metadata?.userId;
  const customerId = objectId(session.customer);
  const subscriptionId = objectId(session.subscription);
  if (!userId || !customerId || !subscriptionId) throw new Error("Stripe checkout mapping unavailable");
  await lockOwner(database, userId);
  const owner = await database.subscription.findUnique({ where: { userId } });
  // Checkout creation persists the customer mapping before contacting Stripe.
  if (!owner || owner.stripeCustomerId !== customerId) throw new Error("Stripe checkout ownership mismatch");
  const canonical = await retrieveSubscription(subscriptionId);
  const data = verifiedData(canonical, subscriptionId, customerId);
  if (owner.stripeSubscriptionId && owner.stripeSubscriptionId !== subscriptionId) {
    const current = await retrieveSubscription(owner.stripeSubscriptionId);
    if (current.id !== owner.stripeSubscriptionId || objectId(current.customer) !== customerId) {
      throw new Error("Stripe subscription ownership mismatch");
    }
    // A delayed checkout must not replace a newer contract or an active one.
    if (!["canceled", "incomplete_expired"].includes(current.status) || canonical.created <= current.created) return;
  }
  const changed = await database.subscription.updateMany({
    where: { userId, stripeCustomerId: customerId, stripeSubscriptionId: owner.stripeSubscriptionId },
    data: { ...data, stripeSubscriptionId: subscriptionId },
  });
  if (changed.count !== 1) throw new Error("Stripe mapping changed during checkout");
}

export async function handleSubscriptionUpdated(database: StripeDb, sub: Stripe.Subscription): Promise<void> {
  await reconcileBoundSubscription(database, sub.id, objectId(sub.customer));
}

export async function handleSubscriptionDeleted(database: StripeDb, sub: Stripe.Subscription): Promise<void> {
  await reconcileBoundSubscription(database, sub.id, objectId(sub.customer));
}

function invoiceSubscription(invoice: Stripe.Invoice): string | null {
  // Current Stripe API uses parent.subscription_details; retain legacy event compatibility.
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  return objectId(invoice.parent?.subscription_details?.subscription) ?? objectId(legacy);
}

export async function handleInvoicePaymentFailed(database: StripeDb, invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoiceSubscription(invoice);
  if (subscriptionId) await reconcileBoundSubscription(database, subscriptionId, objectId(invoice.customer));
}

export async function handleInvoicePaymentSucceeded(database: StripeDb, invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoiceSubscription(invoice);
  if (subscriptionId) await reconcileBoundSubscription(database, subscriptionId, objectId(invoice.customer));
}
