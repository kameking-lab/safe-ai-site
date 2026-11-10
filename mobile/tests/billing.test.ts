import { beforeEach,describe,expect,it,vi } from 'vitest';
const preferences=vi.hoisted(()=>new Map<string,string>());
vi.mock('@capacitor/preferences',()=>({Preferences:{get:async({key}:{key:string})=>({value:preferences.get(key)??null}),set:async({key,value}:{key:string;value:string})=>{preferences.set(key,value);},remove:async({key}:{key:string})=>{preferences.delete(key);}}}));
beforeEach(()=>preferences.clear());
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { BillingController,isVerifiedPro,canResumeApplePurchase,type BillingConfig } from '../src/lib/billing';
import product from '@/lib/mobile/product-policy.json';
const appUserId='88888888-1111-4111-8111-111111111111';const intentId='88888888-2222-4222-8222-222222222222';
const free=()=>({plan:'free',source:null,syncState:'verified',expiresAt:null,appUserId,verifiedAt:new Date().toISOString(),limits:product.limits.free,purchasePending:false,purchaseIntentId:null});
const pro=()=>({...free(),plan:'pro',source:'stripe',expiresAt:new Date(Date.now()+86400000).toISOString(),limits:product.limits.pro});
const config:BillingConfig={ready:true,publicKey:'mock_public_sdk',productId:'mock_monthly',offeringId:'mock_offering',policy:product,login:{apple:true,google:true},terms:'https://example.test/terms',privacy:'https://example.test/privacy',manage:'https://apps.apple.com/account/subscriptions'};
function setup(options:{paid?:boolean;syncPending?:boolean;cancelled?:boolean;storePending?:boolean;unknown?:boolean;cancelFlagOnly?:boolean;startOffline?:boolean;startPaused?:boolean;wrongPrice?:boolean;usd?:boolean;switchAccount?:boolean;pendingStage?:string}={}){
  let reserved=!!options.pendingStage;let reads=0;let stage=options.pendingStage??'prepared';
  const send=vi.fn(async(path:string,_body?:unknown)=>{
    if(path==='/api/billing/store-started')stage='store_started';
    if(path==='/api/billing/store-outcome'){
      stage=(_body as {outcome:string}).outcome==='deferred'?'store_deferred':'store_cancelled_reported';
      return {...free(),purchasePending:true,purchaseIntentId:intentId,purchaseSource:'app_store',purchaseStage:stage};
    }
    if(path==='/api/billing/store-started'&&options.startOffline)throw new Error('offline');
    if(path==='/api/billing/store-started'&&options.startPaused)throw new Error('PRO_SALES_PAUSED');
    if(path==='/api/me/entitlements'){reads++;return options.paid?pro():{...free(),syncState:options.syncPending?'pending':'verified',...(reserved?{purchasePending:true,purchaseIntentId:intentId,purchaseSource:'app_store',purchaseStage:stage}:{}),...(options.switchAccount&&reads>1?{appUserId:'other-member-id-value'}:{})};}
    if(path==='/api/billing/purchase-intents'){reserved=true;return {id:intentId};}
    if(path==='/api/billing/reconcile')return {...free(),purchasePending:true,purchaseIntentId:intentId};
    return {};
  });
  const packageFixture={identifier:'mock_package',packageType:'MONTHLY',product:{identifier:'mock_monthly',price:options.usd?5.99:options.wrongPrice?981:product.monthlyPrice,priceString:options.usd?'$5.99':'¥980',currencyCode:options.usd?'USD':'JPY',subscriptionPeriod:'P1M'}} as unknown as PurchasesPackage;
  const sdk={configure:vi.fn(async()=>{}),logIn:vi.fn(async()=>({}) as never),logOut:vi.fn(async()=>({}) as never),getOfferings:vi.fn(async()=>({all:{mock_offering:{availablePackages:[packageFixture]}}}) as never),
    purchasePackage:vi.fn(async()=>{if(options.cancelled)throw {userCancelled:true,code:'1'};if(options.storePending)throw {code:'20'};if(options.cancelFlagOnly)throw {userCancelled:true};if(options.unknown)throw {code:'10'};return {customerInfo:{entitlements:{active:{anzen_pro:{isActive:true}}}}} as never;}),restorePurchases:vi.fn(async()=>({customerInfo:{entitlements:{active:{anzen_pro:{isActive:true}}}}}) as never)};
  return {send,sdk,controller:new BillingController(send,sdk,()=>true)};
}
describe('iOS IAP uses server rights before StoreKit',()=>{
  it('permits another purchase after a cancelled StoreKit result using the same reservation',async()=>{
    const s=setup({cancelled:true});await expect(s.controller.purchase(config)).rejects.toThrow('STORE_CANCELLED');
    s.sdk.purchasePackage.mockResolvedValueOnce({} as never);await s.controller.purchase(config);
    expect(s.sdk.purchasePackage).toHaveBeenCalledTimes(2);
    const attempts=s.send.mock.calls.filter(c=>c[0]==='/api/billing/store-started').map(c=>c[1]);
    expect(attempts).toEqual([expect.objectContaining({id:intentId,attemptId:expect.any(String)}),expect.objectContaining({id:intentId,attemptId:expect.any(String)})]);
    expect(attempts[0]).not.toEqual(attempts[1]);
  });
  it('replays a cancelled outcome after network loss and app restart, only for the same member',async()=>{
    const s=setup({cancelled:true});const original=s.send.getMockImplementation()!;let offline=true;
    s.send.mockImplementation(async(path,body)=>{if(path==='/api/billing/store-outcome'&&offline)throw new Error('offline');return original(path,body);});
    await expect(s.controller.purchase(config)).rejects.toThrow('STORE_CANCELLED');expect(preferences.size).toBe(1);
    const saved=JSON.parse([...preferences.values()][0]);expect(saved).toMatchObject({id:intentId,outcome:'cancelled',attemptId:expect.any(String)});
    offline=false;
    const another=setup({pendingStage:'store_started'});
    const differentSend=async(path:string,body?:unknown)=>({...await another.send(path,body),appUserId:'another-member-identifier'});
    await new BillingController(differentSend,another.sdk,()=>true).entitlement();expect(preferences.size).toBe(1);
    const restarted=new BillingController(s.send,s.sdk,()=>true);
    const checked=await restarted.entitlement();expect(checked.purchaseStage).toBe('store_cancelled_reported');expect(preferences.size).toBe(0);
    expect(s.send).toHaveBeenCalledWith('/api/billing/store-outcome',saved);
    s.sdk.purchasePackage.mockResolvedValueOnce({} as never);await restarted.purchase(config);expect(s.sdk.purchasePackage).toHaveBeenCalledTimes(2);
  });
  it('keeps deferred approval and an in-flight purchase blocked',async()=>{
    for(const pendingStage of ['store_deferred','store_started']){
      const s=setup({pendingStage});expect(canResumeApplePurchase(await s.controller.entitlement())).toBe(false);
      await expect(s.controller.purchase(config)).rejects.toThrow('PURCHASE_PENDING');expect(s.sdk.purchasePackage).not.toHaveBeenCalled();
    }
  });
  it('blocks only new sales during a budget pause and continues restoring existing purchases',async()=>{
    const s=setup();const paused={...config,salesPaused:true,salesMessage:'今月のPro新規受付は終了しました。来月1日に再開します。'};
    await expect(s.controller.purchase(paused)).rejects.toThrow('PRO_SALES_PAUSED');expect(s.sdk.purchasePackage).not.toHaveBeenCalled();
    await s.controller.restore(paused);expect(s.sdk.restorePurchases).toHaveBeenCalledTimes(1);
    const race=setup({startPaused:true});await expect(race.controller.purchase(config)).rejects.toThrow('PRO_SALES_PAUSED');expect(race.sdk.purchasePackage).not.toHaveBeenCalled();
  });
  it('never opens RevenueCat or a purchase sheet for an existing paid website member',async()=>{const s=setup({paid:true});await expect(s.controller.purchase(config)).rejects.toThrow('ALREADY_SUBSCRIBED');expect(s.sdk.configure).not.toHaveBeenCalled();expect(s.sdk.purchasePackage).not.toHaveBeenCalled();expect(s.send).toHaveBeenCalledTimes(1);});
  it('blocks unresolved rights, changed accounts and an incorrect product price',async()=>{
    for(const options of [{syncPending:true},{switchAccount:true},{wrongPrice:true}]){const s=setup(options);await expect(s.controller.purchase(config)).rejects.toThrow();expect(s.sdk.purchasePackage).not.toHaveBeenCalled();}
  });
  it('sells on a non-Japanese storefront (sandbox / App Review) at the price App Store shows',async()=>{const s=setup({usd:true});await s.controller.purchase(config);expect(s.sdk.purchasePackage).toHaveBeenCalledTimes(1);const p=await s.controller.offering(config,await s.controller.entitlement());expect(p.product.priceString).toBe('$5.99');});
  it('reserves on the server, purchases once, then trusts only the reconciliation result',async()=>{const s=setup();const result=await s.controller.purchase(config);expect(s.sdk.purchasePackage).toHaveBeenCalledTimes(1);expect(s.sdk.configure).toHaveBeenCalledWith({apiKey:'mock_public_sdk',appUserID:appUserId});expect(result.plan).toBe('free');expect(result.purchasePending).toBe(true);expect(isVerifiedPro(result)).toBe(false);expect(s.send.mock.calls.map(c=>c[0])).toEqual(['/api/me/entitlements','/api/billing/purchase-intents','/api/me/entitlements','/api/billing/store-started','/api/billing/reconcile']);});
  it('distinguishes cancelled, deferred and unknown without authorizing release from client reports',async()=>{
    for(const [options,error,outcome] of [[{cancelled:true},'STORE_CANCELLED','cancelled'],[{storePending:true},'STORE_DEFERRED','deferred'],[{unknown:true},'STORE_UNKNOWN','unknown'],[{cancelFlagOnly:true},'STORE_UNKNOWN','unknown']] as const){
      const s=setup(options);await expect(s.controller.purchase(config)).rejects.toThrow(error);expect(s.send).toHaveBeenCalledWith('/api/billing/store-outcome',expect.objectContaining({id:intentId,outcome,attemptId:expect.any(String)}));expect(s.send.mock.calls.map(c=>c[0])).not.toContain('/api/billing/cancel-intent');
    }
  });
  it('reports pre-SDK network failure separately and never invokes StoreKit',async()=>{const s=setup({startOffline:true});await expect(s.controller.purchase(config)).rejects.toThrow('STORE_NOT_OPENED');expect(s.sdk.purchasePackage).not.toHaveBeenCalled();expect(s.send).toHaveBeenCalledWith('/api/billing/cancel-intent',{id:intentId,source:'app_store'});expect(s.send).toHaveBeenCalledWith('/api/billing/store-outcome',expect.objectContaining({id:intentId,outcome:'not_opened',attemptId:expect.any(String)}));});
  it('restores through the SDK and rechecks the server rather than granting from customerInfo',async()=>{const s=setup();const result=await s.controller.restore(config);expect(s.sdk.restorePurchases).toHaveBeenCalledTimes(1);expect(result.plan).toBe('free');await s.controller.forget();expect(s.sdk.logOut).toHaveBeenCalledTimes(1);});
  it('does not allow an expired or stale Pro display',async()=>{const s=setup({paid:true});const result=await s.controller.entitlement();expect(isVerifiedPro(result)).toBe(true);expect(isVerifiedPro({...result,expiresAt:new Date(Date.now()-1).toISOString()})).toBe(false);expect(isVerifiedPro({...result,verifiedAt:new Date(Date.now()-300001).toISOString()})).toBe(false);});
});
