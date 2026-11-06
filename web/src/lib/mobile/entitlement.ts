import product from './product-policy';
export { product };
export type Plan = 'free' | 'pro';
export type EntitlementSnapshot = {
  plan: Plan; source: 'stripe' | 'app_store' | null; syncState: 'verified' | 'pending' | 'unavailable';
  expiresAt: string | null; appUserId: string; verifiedAt: string;
  limits: typeof product.limits.free | typeof product.limits.pro;
  purchasePending?: boolean; purchaseIntentId?: string | null;
  purchaseSource?: string | null; purchaseStage?: string | null;
};
export type Grant = { provider: string; expiresAt: Date; revoked: boolean; environment: string;checkedAt?:Date };
export type LegacySubscription = { planName: string; status: string; currentPeriodEnd: Date | null; stripeSubscriptionId: string | null;updatedAt?:Date;billingHold?:boolean };
/** Pure shared projection. Paid website membership wins; client SDK flags are never inputs. */
export function projectEntitlement(appUserId: string, legacy: LegacySubscription | null, grants: Grant[], now = new Date(),environment:'PRODUCTION'|'SANDBOX'='PRODUCTION'): EntitlementSnapshot {
  const staleStripe=!!legacy?.updatedAt && now.getTime()-legacy.updatedAt.getTime()>86400000;
  const stripe = !staleStripe && legacy && !legacy.billingHold && legacy.stripeSubscriptionId && ['standard','pro','business','custom'].includes(legacy.planName) &&
    ['active','canceled','canceling'].includes(legacy.status) && legacy.currentPeriodEnd && legacy.currentPeriodEnd > now;
  const activeApple=grants.filter(g=>g.provider==='app_store' && g.environment===environment && !g.revoked && g.expiresAt>now);
  const apple = activeApple.filter(g=>!g.checkedAt || now.getTime()-g.checkedAt.getTime()<=86400000).sort((a,b)=>b.expiresAt.getTime()-a.expiresAt.getTime())[0];
  const uncertainLegacy = !!legacy?.stripeSubscriptionId && legacy.planName !== 'free' && (legacy.billingHold || staleStripe || !legacy.currentPeriodEnd || ['past_due','unpaid','incomplete'].includes(legacy.status) || (legacy.status==='active' && legacy.currentPeriodEnd<=now) || !['active','canceled','canceling','incomplete_expired'].includes(legacy.status));
  const plan = stripe || apple ? 'pro' : 'free';
  return { plan, source:stripe ? 'stripe' : apple ? 'app_store' : null, syncState:(uncertainLegacy || activeApple.length>0) && !stripe && !apple ? 'pending' : 'verified',
    expiresAt:stripe ? legacy.currentPeriodEnd!.toISOString() : apple?.expiresAt.toISOString() ?? null,
    appUserId, verifiedAt:now.toISOString(), limits:product.limits[plan] };
}
export function assertPurchasable(snapshot: EntitlementSnapshot) {
  if (snapshot.syncState !== 'verified') throw new Error('ENTITLEMENT_SYNC_PENDING');
  if (snapshot.plan === 'pro') throw new Error('ALREADY_SUBSCRIBED');
}
