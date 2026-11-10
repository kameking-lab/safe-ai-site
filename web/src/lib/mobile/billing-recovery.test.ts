// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose test doubles for the Prisma delegate surface */
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const state=vi.hoisted(()=>({intent:null as any,tail:Promise.resolve() as Promise<unknown>,created:0,grantAvailable:false,sandboxGrant:false,env:'PRODUCTION' as string,fetchFails:false,fetches:0,stripeFetches:0,stripeFails:false,legacy:null as any,grants:[] as any[]}));
vi.mock('./revenuecat',()=>({fetchSubscriber:async()=>{state.fetches++;if(state.fetchFails)throw new Error('offline');return {};},verifiedAppleGrant:(_raw:unknown,_p:string,_n:Date,environment='PRODUCTION')=>(environment==='SANDBOX'?state.sandboxGrant:state.grantAvailable)?{productId:'fixture-product',expiresAt:new Date(Date.now()+86400000)}:null,fetchAppleOwnership:async()=>'original-transaction-fixture'}));
vi.mock('./stripe-reconcile',()=>({reconcileStripe:async()=>{state.stripeFetches++;if(state.stripeFails)throw new Error('stripe offline');if(state.legacy){state.legacy.currentPeriodEnd=new Date(Date.now()+86400000);state.legacy.updatedAt=new Date();state.grants.filter(g=>g.provider==='stripe').forEach(g=>{g.checkedAt=new Date();g.expiresAt=new Date(Date.now()+86400000);});}}}));
vi.mock('@/lib/prisma',()=>{
 const tx={$executeRaw:async()=>1,mobileIdentity:{upsert:async()=>({appUserId:'immutable-member-id',billingEnvironment:state.env}),update:async({data}:any)=>{state.env=data.billingEnvironment;return {appUserId:'immutable-member-id',billingEnvironment:state.env};},findUnique:async()=>({appUserId:'immutable-member-id',billingEnvironment:'PRODUCTION'})},subscription:{findUnique:async()=>state.legacy},mobileGrant:{findMany:async()=>state.grants,findUnique:async({where}:any)=>state.grants.find(g=>g.environment===where.provider_originalTransactionId_environment.environment)??null,updateMany:async({where,data}:any)=>{const rows=state.grants.filter(g=>g.environment===where.environment);rows.forEach(g=>Object.assign(g,data));return{count:rows.length};},upsert:async({create,update}:any)=>{const row=state.grants.find(g=>g.environment===create.environment);if(row)Object.assign(row,update);else state.grants.push({...create,revoked:false});return row??state.grants.at(-1);}},mobilePurchaseIntent:{
  findUnique:async()=>state.intent,
  upsert:async({create,update}:any)=>{state.created++;state.intent=state.intent?{...state.intent,...update}:{id:crypto.randomUUID(),status:'pending',stage:'prepared',providerSessionId:null,createdAt:new Date(),...create};return {...state.intent};},
  updateMany:async({where,data}:any)=>{if(!state.intent)return{count:0};for(const key of ['userId','id','status','source','stage'])if(where[key]!==undefined&&state.intent[key]!==where[key])return{count:0};Object.assign(state.intent,data);return{count:1};}
 }};
 return {prisma:{...tx,$transaction:<T>(run:(db:typeof tx)=>Promise<T>)=>{const next=state.tail.then(()=>run(tx));state.tail=next.catch(()=>{});return next;}}};
});
import { reservePurchase,cancelPurchase,markStoreStarted,reportAppleOutcome,reconcile,getEntitlement } from './billing-service';
import { releaseReviewedApplePurchase,type AppleReview } from './apple-purchase-review';
beforeEach(()=>{state.intent=null;state.created=0;state.tail=Promise.resolve();state.grantAvailable=false;state.sandboxGrant=false;state.env='PRODUCTION';state.grants=[];state.fetches=0;state.fetchFails=false;state.stripeFetches=0;state.stripeFails=false;state.legacy=null;vi.stubEnv('MOBILE_LEDGER_ENABLED','true');vi.stubEnv('REVENUECAT_IOS_PRODUCT_ID','fixture-product');});afterEach(()=>vi.unstubAllEnvs());
it('resumes the identical reservation after app termination or network loss',async()=>{const first=await reservePurchase('member','app_store');const results=await Promise.all(Array.from({length:20},()=>reservePurchase('member','app_store')));expect(results.every(result=>result.id===first.id)).toBe(true);expect(state.created).toBe(1);});
it('serializes competing website and iOS starts without a second reservation',async()=>{const results=await Promise.allSettled([reservePurchase('member','stripe'),reservePurchase('member','app_store')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(state.created).toBe(1);});
it('allows release before dispatch but rejects a foreign purchase source',async()=>{const first=await reservePurchase('member','app_store');await expect(cancelPurchase('member',first.id,'stripe')).rejects.toThrow('INVALID_REQUEST');await cancelPurchase('member',first.id,'app_store');expect(state.intent.status).toBe('cancelled');const next=await reservePurchase('member','stripe');expect(next.id).not.toBe(first.id);});
it('does not unlock or reopen an old StoreKit or Ask to Buy reservation on client cancellation',async()=>{const first=await reservePurchase('member','app_store');await markStoreStarted('member',first.id);state.intent.createdAt=new Date(0);await expect(cancelPurchase('member',first.id,'app_store')).rejects.toThrow('PURCHASE_PENDING');expect(state.intent.status).toBe('pending');await expect(reservePurchase('member','app_store')).rejects.toThrow('PURCHASE_REVIEW_REQUIRED');await expect(reservePurchase('member','stripe')).rejects.toThrow('PURCHASE_PENDING');});
it('distinguishes all reports but never treats a report or negative lookup as store closure',async()=>{
  const first=await reservePurchase('member','app_store');await markStoreStarted('member',first.id);
  for(const outcome of ['cancelled','unknown','not_opened','deferred'] as const){const rights=await reportAppleOutcome('member',first.id,outcome);expect(rights.purchasePending).toBe(true);await expect(cancelPurchase('member',first.id,'app_store')).rejects.toThrow('PURCHASE_PENDING');await expect(reservePurchase('member','stripe')).rejects.toThrow('PURCHASE_PENDING');}
  await reportAppleOutcome('member',first.id,'cancelled');expect(state.intent.stage).toBe('store_deferred');
});
function evidence(id:string):AppleReview{return {userId:'member',intentId:id,appUserId:'immutable-member-id',environment:'PRODUCTION',productId:'fixture-product',checkedAt:new Date().toISOString(),evidenceSource:'apple_support',evidenceReference:'support-case-fixture',evidenceSha256:'a'.repeat(64),resolution:'cancelled',originalAppleAccountConfirmed:true,pendingTransactionsClosed:true,activeSubscriptionAbsent:true};}
it('releases only after independent closure evidence and fresh server reconciliation, then permits web purchase',async()=>{
  const first=await reservePurchase('member','app_store');await markStoreStarted('member',first.id);const review=evidence(first.id);
  const rights=await releaseReviewedApplePurchase(review,'operator');expect(rights.purchasePending).toBe(false);expect(state.intent.providerRequest.reviewerId).toBe('operator');expect(state.intent.stage).toBe('store_closed_verified');expect((await reservePurchase('member','stripe')).source).toBe('stripe');
});
it('rejects stale evidence, another Apple identity/environment and sandbox evidence in production',async()=>{
  const first=await reservePurchase('member','app_store');await markStoreStarted('member',first.id);
  for(const change of [{checkedAt:new Date(0).toISOString()},{appUserId:'another-account-identity'},{environment:'SANDBOX'},{evidenceSource:'storekit_test_session'},{intentId:crypto.randomUUID()}])await expect(releaseReviewedApplePurchase({...evidence(first.id),...change} as AppleReview,'operator')).rejects.toThrow('PURCHASE_REVIEW_REQUIRED');
  expect(state.intent.status).toBe('pending');
});
it('recovers an approved deferred purchase from authoritative store rights and rejects manual release of paid rights',async()=>{
  const first=await reservePurchase('member','app_store');await markStoreStarted('member',first.id);await reportAppleOutcome('member',first.id,'deferred');state.grantAvailable=true;
  const rights=await reconcile('member');expect(rights.plan).toBe('pro');expect(rights.purchasePending).toBe(false);expect(state.intent.status).toBe('completed');
  await expect(releaseReviewedApplePurchase(evidence(first.id),'operator')).rejects.toThrow('PURCHASE_REVIEW_REQUIRED');await expect(reservePurchase('member','stripe')).rejects.toThrow('ALREADY_SUBSCRIBED');
});
it('grants an App Review / unlisted TestFlight sandbox purchase by moving that member to SANDBOX',async()=>{
  const first=await reservePurchase('member','app_store');await markStoreStarted('member',first.id);state.sandboxGrant=true;
  const rights=await reconcile('member');expect(state.env).toBe('SANDBOX');expect(rights.plan).toBe('pro');expect(state.intent.status).toBe('completed');
});
it('keeps a member in PRODUCTION when there is no sandbox purchase either',async()=>{await reconcile('member');expect(state.env).toBe('PRODUCTION');});

it('recovers a former TestFlight member to verified production without relabeling sandbox grants',async()=>{
 state.sandboxGrant=true;await reconcile('member');expect(state.env).toBe('SANDBOX');
 state.sandboxGrant=false;state.grantAvailable=true;
 const rights=await reconcile('member');expect(state.env).toBe('PRODUCTION');expect(rights.plan).toBe('pro');
 expect(state.grants.map(g=>g.environment).sort()).toEqual(['PRODUCTION','SANDBOX']);
});
it('automatically refreshes expired grants when a renewal webhook is missing',async()=>{
 state.grants=[{userId:'member',provider:'app_store',environment:'PRODUCTION',expiresAt:new Date(0),checkedAt:new Date(0),revoked:false}];
 state.grantAvailable=true;expect((await getEntitlement('member')).plan).toBe('pro');expect(state.fetches).toBe(1);
});
it('recovers a purchase interrupted before the first grant and never confirms free on a failed refresh',async()=>{
 state.intent={id:'intent',userId:'member',source:'app_store',status:'pending',stage:'store_started'};
 state.fetchFails=true;expect((await getEntitlement('member')).syncState).toBe('pending');
 state.fetchFails=false;state.grantAvailable=true;expect((await getEntitlement('member')).plan).toBe('pro');expect(state.intent.status).toBe('completed');
});

it('recovers an expired Stripe renewal independently of an Apple outage and missing webhook',async()=>{
 state.legacy={planName:'pro',status:'active',stripeSubscriptionId:'sub_fixture',currentPeriodEnd:new Date(0),updatedAt:new Date(0)};
 state.grants=['stripe','app_store'].map(provider=>({userId:'member',provider,environment:'PRODUCTION',expiresAt:new Date(0),checkedAt:new Date(0),revoked:false}));
 state.fetchFails=true;
 const rights=await getEntitlement('member');expect(rights.plan).toBe('pro');expect(rights.syncState).toBe('verified');expect(state.stripeFetches).toBe(1);expect(state.fetches).toBe(1);
});
it('does not call Apple for a Stripe-only renewal or historical sandbox grants',async()=>{
 state.legacy={planName:'pro',status:'active',stripeSubscriptionId:'sub_fixture',currentPeriodEnd:new Date(0),updatedAt:new Date(0)};
 state.grants=[{provider:'stripe',environment:'PRODUCTION',expiresAt:new Date(0),checkedAt:new Date(0),revoked:false},{provider:'app_store',environment:'SANDBOX',expiresAt:new Date(0),checkedAt:new Date(0),revoked:false}];
 state.fetchFails=true;
 for(let i=0;i<3;i++)expect((await getEntitlement('member')).plan).toBe('pro');
 expect(state.stripeFetches).toBe(1);expect(state.fetches).toBe(0);
});
it('refreshes production Apple once while leaving historical sandbox checks untouched',async()=>{
 state.grantAvailable=true;state.grants=['SANDBOX','PRODUCTION'].map(environment=>({userId:'member',provider:'app_store',environment,expiresAt:new Date(0),checkedAt:new Date(0),revoked:false}));
 for(let i=0;i<3;i++)expect((await getEntitlement('member')).plan).toBe('pro');
 expect(state.fetches).toBe(1);expect(state.grants.find(g=>g.environment==='SANDBOX').checkedAt.getTime()).toBe(0);
});
it('retains an Apple recovery even when a separate Stripe refresh fails',async()=>{
 state.legacy={planName:'pro',status:'past_due',stripeSubscriptionId:'sub_fixture',currentPeriodEnd:new Date(0),updatedAt:new Date(0)};
 state.grants=[{userId:'member',provider:'app_store',environment:'PRODUCTION',expiresAt:new Date(0),checkedAt:new Date(0),revoked:false}];state.stripeFails=true;state.grantAvailable=true;
 expect((await getEntitlement('member')).source).toBe('app_store');expect(state.fetches).toBe(1);expect(state.stripeFetches).toBe(1);
});
