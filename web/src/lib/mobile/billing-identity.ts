import type { Prisma } from '@prisma/client';
import { APP_REVIEW_USER_ID } from '../app-review';

type Db = Pick<Prisma.TransactionClient, 'user' | 'mobileIdentity' | 'mobileGrant' | 'subscription' | '$queryRaw'>;
export const normalizeBillingEmail = (email: string) => email.trim().toLowerCase();
const relay = (email: string) => email.endsWith('@privaterelay.appleid.com');
// Match JavaScript trim(), including tab/newline and Unicode boundary whitespace in old rows.
const emailWhitespace = '\u0009\u000a\u000b\u000c\u000d \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';

/** Called only with the provider profile from Auth.js's verified OAuth exchange. */
export function providerVerifiedEmail(provider: string | undefined, profile: unknown, email: string | null | undefined) {
  if (!['google', 'apple'].includes(provider ?? '') || !email || !profile || typeof profile !== 'object') return false;
  const claims = profile as { email?: unknown; email_verified?: unknown };
  return (claims.email_verified === true || claims.email_verified === 'true') && typeof claims.email === 'string' &&
    normalizeBillingEmail(claims.email) === normalizeBillingEmail(email);
}

async function emailPeers(db: Db, userId: string, requireVerified: boolean) {
  const user = await db.user.findUnique({where:{id:userId},select:{email:true,emailVerified:true,accounts:{select:{provider:true}}}});
  if (!user) throw new Error('UNAUTHORIZED');
  const providers = user.accounts.filter(a => a.provider === 'google' || a.provider === 'apple');
  // Guests have neither an email nor an OAuth identity. Review credentials are separate.
  if (userId === APP_REVIEW_USER_ID || (!user.email && !user.accounts.length)) return [];
  if (!providers.length) return [];
  if (requireVerified && (!user.email || !user.emailVerified)) throw new Error('BILLING_EMAIL_UNVERIFIED');
  if (!user.email || relay(normalizeBillingEmail(user.email))) return [];
  // Prisma's case-insensitive equality does not trim historical addresses. Values stay bound.
  return db.$queryRaw<{id:string;provider:string}[]>`
    SELECT DISTINCT u.id, a.provider FROM "User" u JOIN "Account" a ON a."userId" = u.id
    WHERE lower(btrim(u.email, ${emailWhitespace})) = ${normalizeBillingEmail(user.email)}
      AND u.id <> ${userId} AND a.provider IN ('google', 'apple')`;
}

async function activeSources(db: Db, userId: string, environment: string, now: Date) {
  const [sub, grants] = await Promise.all([
    db.subscription.findUnique({where:{userId}}),
    db.mobileGrant.findMany({where:{userId,environment,revoked:false,expiresAt:{gt:now}}}),
  ]);
  const sources = new Set<string>();
  // Conservative purchase guard: an unexpired paid contract also blocks when a scheduled refresh is late.
  // The member's Apple/TestFlight environment does not invalidate a website contract.
  if (sub && !sub.billingHold && sub.stripeSubscriptionId &&
    ['standard','pro','business','custom'].includes(sub.planName) && ['active','trialing','canceled','canceling'].includes(sub.status) &&
    sub.currentPeriodEnd && sub.currentPeriodEnd > now) sources.add('stripe');
  for (const grant of grants) if (['stripe','app_store'].includes(grant.provider)) sources.add(grant.provider);
  return sources;
}

/** Must run after the existing own-account guard, inside the purchase transaction. */
export async function assertNoDuplicateSubscription(db: Db, userId: string) {
  try {
    const peers = await emailPeers(db,userId,true);
    if (!peers.length) return;
    const member = await db.mobileIdentity.findUnique({where:{userId}});
    const now = new Date(); const paidProviders = new Set<string>();
    for (const id of new Set(peers.map(p=>p.id))) {
      // A former TestFlight member can open the production store next. Real paid rights
      // must block in either client environment; sandbox-only peers cannot block production.
      const paid=(await activeSources(db,id,'PRODUCTION',now)).size || member?.billingEnvironment==='SANDBOX'&&(await activeSources(db,id,'SANDBOX',now)).size;
      if (paid) for (const peer of peers.filter(p=>p.id===id)) paidProviders.add(peer.provider);
    }
    if (paidProviders.size) throw new Error(paidProviders.size>1?'DUPLICATE_SUBSCRIPTION_GOOGLE_APPLE':paidProviders.has('google')?'DUPLICATE_SUBSCRIPTION_GOOGLE':'DUPLICATE_SUBSCRIPTION_APPLE');
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('DUPLICATE_SUBSCRIPTION_') || ['BILLING_EMAIL_UNVERIFIED','UNAUTHORIZED'].includes(error.message))) throw error;
    throw new Error('BILLING_IDENTITY_UNAVAILABLE');
  }
}

/** Observe committed rights only. An audit failure must not roll back an existing paid entitlement. */
export async function warnDuplicateSubscriptions(db: Db, userId: string) {
  try {
    const peers = await emailPeers(db,userId,false);
    // Sandbox receipts never represent a real double payment.
    const environment = 'PRODUCTION';
    const now = new Date(); const own = await activeSources(db,userId,environment,now);
    if(own.has('stripe')&&own.has('app_store')){
      console.warn('[mobile-billing]', 'DUPLICATE_EMAIL_STRIPE_APP_STORE');
      return;
    }
    for (const id of new Set(peers.map(p=>p.id))) {
      const other = await activeSources(db,id,environment,now);
      if (own.has('stripe')&&other.has('app_store') || own.has('app_store')&&other.has('stripe')) {
        console.warn('[mobile-billing]', 'DUPLICATE_EMAIL_STRIPE_APP_STORE');
        return;
      }
    }
  } catch { console.warn('[mobile-billing]', 'DUPLICATE_EMAIL_AUDIT_UNAVAILABLE'); }
}
