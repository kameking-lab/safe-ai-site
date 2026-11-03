// @vitest-environment node
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const state=vi.hoisted(()=>({intent:null as any,tail:Promise.resolve() as Promise<unknown>,created:0}));
vi.mock('./revenuecat',()=>({fetchSubscriber:async()=>({}),verifiedAppleGrant:()=>null,fetchAppleOwnership:vi.fn()}));
vi.mock('./stripe-reconcile',()=>({reconcileStripe:async()=>{}}));
vi.mock('@/lib/prisma',()=>{
 const tx={$executeRaw:async()=>1,mobileIdentity:{upsert:async()=>({appUserId:'immutable-member-id',billingEnvironment:'PRODUCTION'})},subscription:{findUnique:async()=>null},mobileGrant:{findMany:async()=>[],updateMany:async()=>({count:0})},mobilePurchaseIntent:{
  findUnique:async()=>state.intent,
  upsert:async({create,update}:any)=>{state.created++;state.intent=state.intent?{...state.intent,...update}:{id:crypto.randomUUID(),status:'pending',stage:'prepared',providerSessionId:null,createdAt:new Date(),...create};return {...state.intent};},
  updateMany:async({where,data}:any)=>{if(!state.intent)return{count:0};for(const key of ['userId','id','status','source','stage'])if(where[key]!==undefined&&state.intent[key]!==where[key])return{count:0};Object.assign(state.intent,data);return{count:1};}
 }};
 return {prisma:{...tx,$transaction:<T>(run:(db:typeof tx)=>Promise<T>)=>{const next=state.tail.then(()=>run(tx));state.tail=next.catch(()=>{});return next;}}};
});
import { reservePurchase,cancelPurchase,markStoreStarted } from './billing-service';
beforeEach(()=>{state.intent=null;state.created=0;state.tail=Promise.resolve();vi.stubEnv('MOBILE_LEDGER_ENABLED','true');vi.stubEnv('REVENUECAT_IOS_PRODUCT_ID','fixture-product');});afterEach(()=>vi.unstubAllEnvs());
it('resumes the identical reservation after app termination or network loss',async()=>{const first=await reservePurchase('member','app_store');const results=await Promise.all(Array.from({length:20},()=>reservePurchase('member','app_store')));expect(results.every(result=>result.id===first.id)).toBe(true);expect(state.created).toBe(1);});
it('serializes competing website and iOS starts without a second reservation',async()=>{const results=await Promise.allSettled([reservePurchase('member','stripe'),reservePurchase('member','app_store')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(state.created).toBe(1);});
it('allows release before dispatch but rejects a foreign purchase source',async()=>{const first=await reservePurchase('member','app_store');await expect(cancelPurchase('member',first.id,'stripe')).rejects.toThrow('INVALID_REQUEST');await cancelPurchase('member',first.id,'app_store');expect(state.intent.status).toBe('cancelled');const next=await reservePurchase('member','stripe');expect(next.id).not.toBe(first.id);});
it('does not unlock an old StoreKit or Ask to Buy reservation on client cancellation',async()=>{const first=await reservePurchase('member','app_store');await markStoreStarted('member',first.id);state.intent.createdAt=new Date(0);await expect(cancelPurchase('member',first.id,'app_store')).rejects.toThrow('PURCHASE_PENDING');expect(state.intent.status).toBe('pending');expect((await reservePurchase('member','app_store')).id).toBe(first.id);await expect(reservePurchase('member','stripe')).rejects.toThrow('PURCHASE_PENDING');});
