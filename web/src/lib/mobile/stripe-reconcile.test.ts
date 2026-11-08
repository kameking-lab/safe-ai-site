// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose test doubles for the Prisma delegate surface */
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const state=vi.hoisted(()=>({sub:null as any,grants:[] as any[],imported:0,verified:0}));
vi.mock('stripe',()=>({default:class{subscriptions={retrieve:async()=>state.sub};}}));
vi.mock('../stripe-webhook-handlers',()=>({handleSubscriptionUpdated:async()=>{}}));
vi.mock('./revenuecat',()=>({importStripePurchase:async()=>{state.imported++;},verifyStripeOwnership:async()=>{state.verified++;return 'si_from_revenuecat';}}));
import { reconcileStripe,revenueCatStripeLinked } from './stripe-reconcile';
const tx:any={
  subscription:{findUnique:async()=>({userId:'member',stripeSubscriptionId:'sub_live',billingHold:false})},
  mobileIdentity:{findUnique:async()=>({appUserId:'app-user',billingEnvironment:'PRODUCTION'})},
  mobileGrant:{updateMany:async()=>({count:0}),findUnique:async({where}:any)=>state.grants.find(g=>g.originalTransactionId===where.provider_originalTransactionId_environment.originalTransactionId)??null,
    upsert:async({create}:any)=>{state.grants.push(create);return create;}},
};
beforeEach(()=>{state.grants=[];state.imported=0;state.verified=0;vi.stubEnv('SAFE_AI_STAGING_MODE','false');vi.stubEnv('VERCEL_ENV','development');vi.stubEnv('STRIPE_SECRET_KEY','synthetic-not-real');
  for(const k of ['REVENUECAT_STRIPE_PUBLIC_API_KEY','REVENUECAT_STRIPE_V2_PRODUCT_ID'])vi.stubEnv(k,'');
  state.sub={id:'sub_live',livemode:true,status:'active',metadata:{userId:'member'},items:{data:[{id:'si_1',price:{id:'price_pro'},current_period_end:Math.floor(Date.now()/1000)+86400*30}]}};});
afterEach(()=>vi.unstubAllEnvs());
it('grants Pro from the Stripe subscription itself when RevenueCat is not linked to Stripe',async()=>{
  expect(revenueCatStripeLinked()).toBe(false);
  await reconcileStripe(tx,'member');
  expect(state.imported).toBe(0);expect(state.verified).toBe(0);
  expect(state.grants).toEqual([expect.objectContaining({userId:'member',provider:'stripe',originalTransactionId:'sub_live',environment:'PRODUCTION',productId:'price_pro',revoked:false})]);
});
it('refuses a subscription already granted to another member',async()=>{
  state.grants.push({userId:'someone-else',originalTransactionId:'sub_live'});
  await expect(reconcileStripe(tx,'member')).rejects.toThrow('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
});
it('does not grant an inactive or test-mode subscription in production',async()=>{
  state.sub={...state.sub,status:'past_due'};await reconcileStripe(tx,'member');expect(state.grants).toHaveLength(0);
  state.sub={...state.sub,status:'active',livemode:false};await expect(reconcileStripe(tx,'member')).rejects.toThrow('ENTITLEMENT_SYNC_PENDING');
});
it('keeps using RevenueCat ownership when the Stripe link is configured',async()=>{
  for(const k of ['REVENUECAT_STRIPE_PUBLIC_API_KEY','REVENUECAT_STRIPE_V2_PRODUCT_ID','REVENUECAT_V2_SECRET_API_KEY','REVENUECAT_PROJECT_ID'])vi.stubEnv(k,'fixture');
  await reconcileStripe(tx,'member');
  expect(state.imported).toBe(1);expect(state.verified).toBe(1);expect(state.grants[0].originalTransactionId).toBe('si_from_revenuecat');
});
