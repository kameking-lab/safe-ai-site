// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose test doubles for the Prisma delegate surface */
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
vi.mock('./pro-sales-gate',()=>({assertProSalesOpen:vi.fn(async()=>{})}));
import { assertProSalesOpen } from './pro-sales-gate';
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
import { reservePurchase,prepareApplePurchase,cancelPurchase,markStoreStarted,reportAppleOutcome,reconcile,getEntitlement } from './billing-service';
import { prisma } from '@/lib/prisma';
import { releaseReviewedApplePurchase,type AppleReview } from './apple-purchase-review';
beforeEach(()=>{state.intent=null;state.created=0;state.tail=Promise.resolve();state.grantAvailable=false;state.sandboxGrant=false;state.env='PRODUCTION';state.grants=[];state.fetches=0;state.fetchFails=false;state.stripeFetches=0;state.stripeFails=false;state.legacy=null;vi.stubEnv('MOBILE_LEDGER_ENABLED','true');vi.stubEnv('REVENUECAT_IOS_PRODUCT_ID','fixture-product');});afterEach(()=>vi.unstubAllEnvs());
it('resumes the identical reservation after app termination or network loss',async()=>{const first=await reservePurchase('member','app_store');const results=await Promise.all(Array.from({length:20},()=>reservePurchase('member','app_store')));expect(results.every(result=>result.id===first.id)).toBe(true);expect(state.created).toBe(1);});
it('atomically reserves and starts Apple with one provider reconciliation and rejects duplicate starts',async()=>{
 const attemptId=crypto.randomUUID();const prepared=await prepareApplePurchase('member','immutable-member-id',attemptId);
 expect(prepared).toEqual({id:state.intent.id,appUserId:'immutable-member-id',attemptId});expect(state.fetches).toBe(1);expect(state.stripeFetches).toBe(1);
 expect(state.intent.stage).toBe('store_started');expect(state.intent.providerRequest.attemptId).toBe(attemptId);
 await expect(prepareApplePurchase('member','immutable-member-id',crypto.randomUUID())).rejects.toThrow('PURCHASE_PENDING');expect(state.created).toBe(1);
});
it('blocks an atomic purchase for another account or an existing paid member',async()=>{
 await expect(prepareApplePurchase('member','another-member-id',crypto.randomUUID())).rejects.toThrow('ENTITLEMENT_SYNC_PENDING');expect(state.created).toBe(0);
 state.grantAvailable=true;await expect(prepareApplePurchase('member','immutable-member-id',crypto.randomUUID())).rejects.toThrow('ALREADY_SUBSCRIBED');expect(state.created).toBe(0);
});
it('retries a reported not-opened atomic attempt only after fresh authoritative reconciliation',async()=>{
 const first=await prepareApplePurchase('member','immutable-member-id',crypto.randomUUID());
 await reportAppleOutcome('member',first.id,'not_opened',first.attemptId);
 const retry=await prepareApplePurchase('member','immutable-member-id',crypto.randomUUID());expect(retry.id).toBe(first.id);expect(retry.attemptId).not.toBe(first.attemptId);expect(state.created).toBe(1);
});
it('recovers a lost atomic response by attempt ID and does not overwrite a newer attempt',async()=>{
 const first=await prepareApplePurchase('member','immutable-member-id',crypto.randomUUID());
 await reportAppleOutcome('member',undefined,'not_opened',first.attemptId);expect(state.intent.stage).toBe('store_not_opened_reported');
 const next=await prepareApplePurchase('member','immutable-member-id',crypto.randomUUID());
 await reportAppleOutcome('member',undefined,'not_opened',first.attemptId);expect(state.intent.stage).toBe('store_started');expect(state.intent.providerRequest.attemptId).toBe(next.attemptId);
});
it('serializes competing website and iOS starts without a second reservation',async()=>{const results=await Promise.allSettled([reservePurchase('member','stripe'),reservePurchase('member','app_store')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(state.created).toBe(1);});
it('allows release before dispatch but rejects a foreign purchase source',async()=>{const first=await reservePurchase('member','app_store');await expect(cancelPurchase('member',first.id,'stripe')).rejects.toThrow('INVALID_REQUEST');await cancelPurchase('member',first.id,'app_store');expect(state.intent.status).toBe('cancelled');const next=await reservePurchase('member','stripe');expect(next.id).not.toBe(first.id);});
it('does not reopen a dispatched purchase before a result or switch its provider',async()=>{const first=await reservePurchase('member','app_store');await markStoreStarted('member',first.id);state.intent.createdAt=new Date(0);await expect(cancelPurchase('member',first.id,'app_store')).rejects.toThrow('PURCHASE_PENDING');expect(state.intent.status).toBe('pending');await expect(reservePurchase('member','app_store')).rejects.toThrow('PURCHASE_PENDING');await expect(reservePurchase('member','stripe')).rejects.toThrow('PURCHASE_PENDING');});
it('automatically verifies evidence and reuses a cancelled Apple purchase without an operator',async()=>{
  const first=await reservePurchase('member','app_store');await markStoreStarted('member',first.id);
  await reportAppleOutcome('member',first.id,'cancelled');
  const retry=await reservePurchase('member','app_store');expect(retry.id).toBe(first.id);expect(state.created).toBe(1);
  expect(state.intent.providerRequest).toMatchObject({source:'server_reconciliation',plan:'free',syncState:'verified'});
  await markStoreStarted('member',first.id);
  await expect(markStoreStarted('member',first.id)).rejects.toThrow('PURCHASE_PENDING');
  state.grantAvailable=true;expect((await reconcile('member')).plan).toBe('pro');
});
it('ignores delayed outcomes from an earlier StoreKit attempt on the same reservation',async()=>{
  const first=await reservePurchase('member');const oldAttempt=crypto.randomUUID(),newAttempt=crypto.randomUUID();
  await markStoreStarted('member',first.id,oldAttempt);await reportAppleOutcome('member',first.id,'cancelled',oldAttempt);
  await reservePurchase('member');await markStoreStarted('member',first.id,newAttempt);
  await reportAppleOutcome('member',first.id,'cancelled',oldAttempt);expect(state.intent.stage).toBe('store_started');
  await reportAppleOutcome('member',first.id,'cancelled');expect(state.intent.stage).toBe('store_started');
  await reportAppleOutcome('member',first.id,'cancelled',newAttempt);expect(state.intent.stage).toBe('store_cancelled_reported');
});
it('blocks cancelled-purchase retries during a provider outage or a sales pause',async()=>{
  const first=await reservePurchase('member');await markStoreStarted('member',first.id);await reportAppleOutcome('member',first.id,'cancelled');
  state.fetchFails=true;await expect(reservePurchase('member')).rejects.toThrow('offline');
  state.fetchFails=false;vi.mocked(assertProSalesOpen).mockRejectedValueOnce(new Error('PRO_SALES_PAUSED'));
  await expect(reservePurchase('member')).rejects.toThrow('PRO_SALES_PAUSED');expect(state.created).toBe(1);
});
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
it('verifies overlapping entitlement reads independently without caching completed reads',async()=>{
 state.grants=[{userId:'member',provider:'app_store',environment:'PRODUCTION',expiresAt:new Date(0),checkedAt:new Date(0),revoked:false}];state.grantAvailable=true;
 const rights=await Promise.all(Array.from({length:5},()=>getEntitlement('member')));
 expect(rights.every(r=>r.plan==='pro')).toBe(true);expect(state.fetches).toBe(5);
 state.grants=[];expect((await getEntitlement('member')).plan).toBe('free');
});
it('identifies reconciliation failure before preparing or opening a store transaction',async()=>{
 state.fetchFails=true;
 await expect(prepareApplePurchase('member','immutable-member-id',crypto.randomUUID())).rejects.toThrow('BILLING_RECONCILE_UNAVAILABLE');
 expect(state.created).toBe(0);
});
it('manual refresh verifies even a recently checked Apple grant and never reuses a completed read',async()=>{
 state.grants=[{userId:'member',provider:'app_store',environment:'PRODUCTION',expiresAt:new Date(Date.now()+86400000),checkedAt:new Date(),revoked:false}];
 expect((await getEntitlement('member')).plan).toBe('pro');expect(state.fetches).toBe(0);
 expect((await getEntitlement('member',{refresh:true})).plan).toBe('free');expect(state.fetches).toBe(1);
});
it('manual refresh also verifies recently checked Stripe rights',async()=>{
 state.legacy={planName:'pro',status:'active',stripeSubscriptionId:'sub_fixture',currentPeriodEnd:new Date(Date.now()+86400000),updatedAt:new Date()};
 state.grants=[{provider:'stripe',environment:'PRODUCTION',expiresAt:new Date(Date.now()+86400000),checkedAt:new Date(),revoked:false}];
 await getEntitlement('member');expect(state.stripeFetches).toBe(0);
 await getEntitlement('member',{refresh:true});expect(state.stripeFetches).toBe(1);
});
it('manual refresh discovers an Apple purchase even before a grant webhook has arrived',async()=>{
 state.grantAvailable=true;
 expect((await getEntitlement('member')).plan).toBe('free');expect(state.fetches).toBe(0);
 expect((await getEntitlement('member',{refresh:true})).plan).toBe('pro');expect(state.fetches).toBe(1);
});
it('rejects reconciliation for an SDK identity from a previous login before querying providers',async()=>{
 state.grantAvailable=true;
 await expect(reconcile('member',{appUserId:'previous-member-identifier'})).rejects.toThrow('UNAUTHORIZED');
 expect(state.fetches).toBe(0);expect(state.grants).toHaveLength(0);
});
it('reconciles the same returning identity and reads its completed rights without another purchase',async()=>{
 state.sandboxGrant=true;state.intent={id:crypto.randomUUID(),userId:'member',source:'app_store',status:'pending',stage:'store_started'};
 const rights=await reconcile('member',{appUserId:'immutable-member-id'});
 expect(rights.plan).toBe('pro');expect(rights.limits.law_chat).toBe(50);expect(rights.purchasePending).toBe(false);
 expect((await getEntitlement('member')).plan).toBe('pro');expect(state.created).toBe(0);expect(state.env).toBe('SANDBOX');
});
it.each([false,true])('does not reuse a pre-mutation in-flight read (previously paid: %s)',async(wasPaid)=>{
 const grant={userId:'member',provider:'app_store',environment:'PRODUCTION',expiresAt:new Date(Date.now()+86400000),checkedAt:new Date(),revoked:false};
 state.grants=wasPaid?[grant]:[];
 let release!:()=>void;state.tail=new Promise<void>(resolve=>{release=resolve;});
 const read=vi.spyOn(prisma!.mobileGrant,'findMany');
 // Real Prisma reads return snapshots, not mutable references to later database changes.
 read.mockResolvedValueOnce(structuredClone(state.grants));
 const beforePurchaseOrRevocation=getEntitlement('member');
 state.grants=wasPaid?[]:[grant];
 const afterPurchaseOrRevocation=getEntitlement('member');
 release();
 try {
  expect((await beforePurchaseOrRevocation).plan).toBe(wasPaid?'pro':'free');
  expect((await afterPurchaseOrRevocation).plan).toBe(wasPaid?'free':'pro');
 } finally {read.mockRestore();}
});
it('each explicit refresh performs its own provider verification even while another is pending',async()=>{
 let release!:()=>void;state.tail=new Promise<void>(resolve=>{release=resolve;});
 const first=getEntitlement('member',{refresh:true});
 const second=getEntitlement('member',{refresh:true});
 release();await Promise.all([first,second]);
 expect(state.fetches).toBe(2);
});
