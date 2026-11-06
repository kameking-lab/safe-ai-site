// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose test doubles for the Prisma delegate surface */
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const state=vi.hoisted(()=>({intent:null as any,tail:Promise.resolve() as Promise<unknown>,created:0,grantAvailable:false,grants:[] as any[]}));
vi.mock('./revenuecat',()=>({fetchSubscriber:async()=>({}),verifiedAppleGrant:()=>state.grantAvailable?{productId:'fixture-product',expiresAt:new Date(Date.now()+86400000)}:null,fetchAppleOwnership:async()=>'original-transaction-fixture'}));
vi.mock('./stripe-reconcile',()=>({reconcileStripe:async()=>{}}));
vi.mock('@/lib/prisma',()=>{
 const tx={$executeRaw:async()=>1,mobileIdentity:{upsert:async()=>({appUserId:'immutable-member-id',billingEnvironment:'PRODUCTION'}),findUnique:async()=>({appUserId:'immutable-member-id',billingEnvironment:'PRODUCTION'})},subscription:{findUnique:async()=>null},mobileGrant:{findMany:async()=>state.grants,findUnique:async()=>state.grants[0]??null,updateMany:async({data}:any)=>{state.grants.forEach(g=>Object.assign(g,data));return{count:state.grants.length};},upsert:async({create,update}:any)=>{if(state.grants.length)Object.assign(state.grants[0],update);else state.grants.push({...create,revoked:false});return state.grants[0];}},mobilePurchaseIntent:{
  findUnique:async()=>state.intent,
  upsert:async({create,update}:any)=>{state.created++;state.intent=state.intent?{...state.intent,...update}:{id:crypto.randomUUID(),status:'pending',stage:'prepared',providerSessionId:null,createdAt:new Date(),...create};return {...state.intent};},
  updateMany:async({where,data}:any)=>{if(!state.intent)return{count:0};for(const key of ['userId','id','status','source','stage'])if(where[key]!==undefined&&state.intent[key]!==where[key])return{count:0};Object.assign(state.intent,data);return{count:1};}
 }};
 return {prisma:{...tx,$transaction:<T>(run:(db:typeof tx)=>Promise<T>)=>{const next=state.tail.then(()=>run(tx));state.tail=next.catch(()=>{});return next;}}};
});
import { reservePurchase,cancelPurchase,markStoreStarted,reportAppleOutcome,reconcile } from './billing-service';
import { releaseReviewedApplePurchase,type AppleReview } from './apple-purchase-review';
beforeEach(()=>{state.intent=null;state.created=0;state.tail=Promise.resolve();state.grantAvailable=false;state.grants=[];vi.stubEnv('MOBILE_LEDGER_ENABLED','true');vi.stubEnv('REVENUECAT_IOS_PRODUCT_ID','fixture-product');});afterEach(()=>vi.unstubAllEnvs());
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
