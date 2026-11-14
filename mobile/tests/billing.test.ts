import { beforeEach,describe,expect,it,vi } from 'vitest';
const preferences=vi.hoisted(()=>new Map<string,string>());
vi.mock('@capacitor/preferences',()=>({Preferences:{get:async({key}:{key:string})=>({value:preferences.get(key)??null}),set:async({key,value}:{key:string;value:string})=>{preferences.set(key,value);},remove:async({key}:{key:string})=>{preferences.delete(key);}}}));
beforeEach(()=>preferences.clear());
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { BillingController,isVerifiedPro,canResumeApplePurchase,type BillingConfig } from '../src/lib/billing';
import product from '@/lib/mobile/product-policy.json';
import { invalidateMemberReads, StaleMemberResponseError } from '../src/lib/member-generation';
const appUserId='88888888-1111-4111-8111-111111111111';const intentId='88888888-2222-4222-8222-222222222222';
const free=()=>({plan:'free',source:null,syncState:'verified',expiresAt:null,appUserId,verifiedAt:new Date().toISOString(),limits:product.limits.free,purchasePending:false,purchaseIntentId:null});
const pro=()=>({...free(),plan:'pro',source:'stripe',expiresAt:new Date(Date.now()+86400000).toISOString(),limits:product.limits.pro});
const config:BillingConfig={ready:true,publicKey:'mock_public_sdk',productId:'jp.anzenaiportal.pro.monthly',offeringId:'mock_offering',policy:product,login:{apple:true,google:true},terms:'https://example.test/terms',privacy:'https://example.test/privacy',manage:'https://apps.apple.com/account/subscriptions'};
function setup(options:{atomic?:boolean;paid?:boolean;syncPending?:boolean;cancelled?:boolean;storePending?:boolean;unknown?:boolean;cancelFlagOnly?:boolean;startOffline?:boolean;startPaused?:boolean;wrongPrice?:boolean;usd?:boolean;switchAccount?:boolean;pendingStage?:string}={}){
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
    if(path==='/api/billing/purchase-intents'){
      reserved=true;
      if(options.atomic){
        if(options.startOffline)throw new Error('offline');if(options.startPaused)throw new Error('PRO_SALES_PAUSED');if(options.switchAccount)throw new Error('ENTITLEMENT_SYNC_PENDING');
        stage='store_started';return {id:intentId,appUserId,attemptId:(_body as {attemptId:string}).attemptId};
      }
      return {id:intentId};
    }
    if(path==='/api/billing/reconcile')return {...free(),purchasePending:true,purchaseIntentId:intentId};
    return {};
  });
  const packageFixture={identifier:'mock_package',packageType:'MONTHLY',product:{identifier:'jp.anzenaiportal.pro.monthly',price:options.usd?5.99:options.wrongPrice?981:product.monthlyPrice,priceString:options.usd?'$5.99':'¥980',currencyCode:options.usd?'USD':'JPY',subscriptionPeriod:'P1M'}} as unknown as PurchasesPackage;
  const sdk={configure:vi.fn(async()=>{}),logIn:vi.fn(async()=>({}) as never),logOut:vi.fn(async()=>({}) as never),getOfferings:vi.fn(async()=>({all:{mock_offering:{availablePackages:[packageFixture]}}}) as never),
    purchasePackage:vi.fn(async()=>{if(options.cancelled)throw {userCancelled:true,code:'1'};if(options.storePending)throw {code:'20'};if(options.cancelFlagOnly)throw {userCancelled:true};if(options.unknown)throw {code:'10'};return {customerInfo:{entitlements:{active:{anzen_pro:{isActive:true}}}}} as never;}),restorePurchases:vi.fn(async()=>({customerInfo:{entitlements:{active:{anzen_pro:{isActive:true}}}}}) as never)};
  return {send,sdk,controller:new BillingController(send,sdk,()=>true)};
}

describe('membership response ordering',()=>{
  for(const operation of ['sync','purchase','restore','refresh'] as const)it(`discards a pre-${operation} free response after confirmed Pro`,async()=>{
    const s=setup({atomic:true});const original=s.send.getMockImplementation()!;
    let release!:(value:ReturnType<typeof free>)=>void;
    s.send.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
    const old=s.controller.entitlement();const rejected=expect(old).rejects.toBeInstanceOf(StaleMemberResponseError);
    s.send.mockImplementation(async(path,body)=>path==='/api/billing/reconcile'||path.includes('refresh=1')?pro():original(path,body));
    const events:string[]=[];vi.stubGlobal('window',{dispatchEvent:(event:CustomEvent)=>{events.push(event.detail.plan);}});
    try{
      const result=operation==='refresh'?await s.controller.entitlement(false,true):operation==='sync'?await s.controller.sync():await s.controller[operation](config);
      expect(result.plan).toBe('pro');release(free());await rejected;
      expect(events.at(-1)).toBe('pro');expect(events.slice(events.lastIndexOf('pro')+1)).toEqual([]);
    }finally{vi.unstubAllGlobals();}
  });
  for(const operation of ['entitlement','sync'] as const)it(`does not return or publish late Pro from ${operation} after logout`,async()=>{
    const s=setup();let release!:(value:ReturnType<typeof pro>)=>void;
    s.send.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
    const events:unknown[]=[];vi.stubGlobal('window',{dispatchEvent:(event:CustomEvent)=>{events.push(event.detail);}});
    try{
      const pending=s.controller[operation]();const rejected=expect(pending).rejects.toBeInstanceOf(StaleMemberResponseError);
      await s.controller.forget();release(pro());await rejected;expect(events).toEqual([]);
    }finally{vi.unstubAllGlobals();}
  });
  it('does not reconcile a purchase that finishes StoreKit after logout',async()=>{
    const s=setup({atomic:true});let release!:()=>void;
    s.sdk.purchasePackage.mockImplementationOnce(()=>new Promise(resolve=>{release=()=>resolve({} as never);}));
    const purchase=s.controller.purchase(config);const rejected=expect(purchase).rejects.toBeInstanceOf(StaleMemberResponseError);
    await vi.waitFor(()=>expect(release).toBeTypeOf('function'));invalidateMemberReads();release();await rejected;
    expect(s.send.mock.calls.some(([path])=>path==='/api/billing/reconcile')).toBe(false);
  });
  it('discards a delayed outcome response after a newer reconciliation',async()=>{
    const s=setup({pendingStage:'store_started'});const report={id:intentId,attemptId:crypto.randomUUID(),outcome:'cancelled'};
    preferences.set(`anzen.apple-outcome.${encodeURIComponent(appUserId)}`,JSON.stringify(report));
    const original=s.send.getMockImplementation()!;let release!:(value:ReturnType<typeof free>)=>void;
    s.send.mockImplementation(async(path,body)=>path==='/api/billing/store-outcome'?new Promise(resolve=>{release=resolve;}):path==='/api/billing/reconcile'?pro():original(path,body));
    const old=s.controller.entitlement();const rejected=expect(old).rejects.toBeInstanceOf(StaleMemberResponseError);
    await vi.waitFor(()=>expect(release).toBeTypeOf('function'));expect((await s.controller.sync()).plan).toBe('pro');release(free());await rejected;
  });
});

it('queues a new StoreKit identity after background logout completes',async()=>{
  const s=setup();const member=await s.controller.entitlement();await s.controller.identify(config,member);
  let release!:()=>void;s.sdk.logOut.mockImplementationOnce(()=>new Promise(resolve=>{release=()=>resolve({} as never);}));
  const logout=s.controller.forget();const login=s.controller.identify(config,{...member,appUserId:'another-member-identifier'});
  await vi.waitFor(()=>expect(s.sdk.logOut).toHaveBeenCalledOnce());expect(s.sdk.logIn).not.toHaveBeenCalled();
  release();await Promise.all([logout,login]);expect(s.sdk.logIn).toHaveBeenLastCalledWith({appUserID:'another-member-identifier'});
});
it('re-identifies even the same member after an ambiguous SDK logout failure',async()=>{
  const s=setup();const member=await s.controller.entitlement();await s.controller.identify(config,member);
  s.sdk.logOut.mockRejectedValueOnce(new Error('offline'));await expect(s.controller.forget()).rejects.toThrow('offline');
  await s.controller.identify(config,member);expect(s.sdk.logIn).toHaveBeenCalledWith({appUserID:member.appUserId});
});
describe('iOS IAP uses server rights before StoreKit',()=>{
  it('publishes the final server rights recovered by a durable outcome report',async()=>{
    const dispatchEvent=vi.fn();vi.stubGlobal('window',{dispatchEvent});
    try{
      const s=setup();const original=s.send.getMockImplementation()!;
      preferences.set(`anzen.apple-outcome.${appUserId}`,JSON.stringify({attemptId:crypto.randomUUID(),outcome:'not_opened'}));
      s.send.mockImplementation(async(path,body)=>path==='/api/billing/store-outcome'?pro():original(path,body));
      expect((await s.controller.entitlement()).plan).toBe('pro');
      expect(dispatchEvent.mock.calls.map(([event])=>event.detail.plan)).toEqual(['free','pro']);
    }finally{vi.unstubAllGlobals();}
  });
  it('coalesces the failed-start report with an immediate account refresh and permits retry',async()=>{
    const s=setup({atomic:true,startOffline:true});
    const original=s.send.getMockImplementation()!;
    let release!:()=>void;
    const pending=new Promise<void>(resolve=>{release=resolve;});
    s.send.mockImplementation(async(path,body)=>{if(path==='/api/billing/store-outcome')await pending;return original(path,body);});
    await expect(s.controller.purchase(config)).rejects.toThrow('STORE_NOT_OPENED');
    const refresh=s.controller.entitlement();
    await vi.waitFor(()=>expect(s.send.mock.calls.filter(c=>c[0]==='/api/me/entitlements')).toHaveLength(2));
    release();await refresh;
    expect(s.send.mock.calls.filter(c=>c[0]==='/api/billing/store-outcome')).toHaveLength(1);
    expect([...preferences.keys()].filter(key=>key.startsWith('anzen.apple-outcome.'))).toHaveLength(0);
    expect(s.sdk.purchasePackage).not.toHaveBeenCalled();
    s.send.mockImplementation(async(path,body)=>path==='/api/billing/purchase-intents'?{id:intentId,appUserId,attemptId:(body as {attemptId:string}).attemptId}:original(path,body));
    await s.controller.purchase(config);
    expect(s.sdk.purchasePackage).toHaveBeenCalledTimes(1);
  });
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
  it('reports pre-SDK network failure separately without waiting on another network request',async()=>{const s=setup({startOffline:true});await expect(s.controller.purchase(config)).rejects.toThrow('STORE_NOT_OPENED');expect(s.sdk.purchasePackage).not.toHaveBeenCalled();expect(s.send).not.toHaveBeenCalledWith('/api/billing/cancel-intent',expect.anything());expect(s.send).toHaveBeenCalledWith('/api/billing/store-outcome',expect.objectContaining({id:intentId,outcome:'not_opened',attemptId:expect.any(String)}));});
  it('opens StoreKit after one atomic preparation without another rights read or start request',async()=>{
    const s=setup({atomic:true});await s.controller.purchase(config);
    expect(s.send.mock.calls.map(c=>c[0])).toEqual(['/api/me/entitlements','/api/billing/purchase-intents','/api/billing/reconcile']);
    expect(s.send).toHaveBeenCalledWith('/api/billing/purchase-intents',{appUserId,attemptId:expect.any(String)});
    expect(s.sdk.purchasePackage).toHaveBeenCalledTimes(1);
  });
  it('requires the exact monthly product and never silently substitutes a different explicit offering',async()=>{
    for(const override of [{productId:'another.product'},{offeringId:'missing'}]){
      const s=setup({atomic:true});await expect(s.controller.purchase({...config,...override})).rejects.toThrow();
      expect(s.sdk.purchasePackage).not.toHaveBeenCalled();expect(s.send.mock.calls.some(c=>c[0]==='/api/billing/purchase-intents')).toBe(false);
    }
    const s=setup({atomic:true});const offerings=await s.sdk.getOfferings() as unknown as {all:Record<string,{availablePackages:PurchasesPackage[]}>};
    s.sdk.getOfferings.mockResolvedValueOnce({all:offerings.all,current:offerings.all.mock_offering} as never);
    await s.controller.purchase({...config,offeringId:null});expect(s.sdk.purchasePackage).toHaveBeenCalledTimes(1);
  });
  it('deduplicates simultaneous SDK setup and reuses the warmed exact product',async()=>{
    const s=setup({atomic:true});const member=await s.controller.entitlement();
    await Promise.all([s.controller.offering(config,member),s.controller.offering(config,member)]);
    await s.controller.purchase(config);
    expect(s.sdk.configure).toHaveBeenCalledTimes(1);expect(s.sdk.getOfferings).toHaveBeenCalledTimes(1);
  });
  it('does not replay a queued preparation outcome while another refresh overlaps the purchase',async()=>{
    const s=setup({atomic:true});const send=s.send.getMockImplementation()!;
    s.send.mockImplementation(async(path,body)=>{
      if(path==='/api/billing/purchase-intents'){
        await s.controller.entitlement();
        const member=await s.controller.entitlement();
        await expect(s.controller.offering(config,{...member,appUserId:'another-account-member-id'})).rejects.toThrow('PURCHASE_PENDING');
        expect(s.send.mock.calls.some(c=>c[0]==='/api/billing/store-outcome')).toBe(false);
      }
      return send(path,body);
    });
    await s.controller.purchase(config);expect(s.sdk.purchasePackage).toHaveBeenCalledTimes(1);expect(preferences.size).toBe(0);
  });
  it('retains the exact un-dispatched attempt durably if preparation and outcome responses are lost',async()=>{
    const s=setup({atomic:true,startOffline:true});const send=s.send.getMockImplementation()!;
    s.send.mockImplementation(async(path,body)=>{if(path==='/api/billing/store-outcome')throw new Error('offline');return send(path,body);});
    await expect(s.controller.purchase(config)).rejects.toThrow('STORE_NOT_OPENED');expect(s.sdk.purchasePackage).not.toHaveBeenCalled();
    const report=JSON.parse([...preferences.values()][0]);expect(report).toEqual({attemptId:expect.any(String),outcome:'not_opened'});
    const retry=setup();await retry.controller.entitlement();expect(retry.send).toHaveBeenCalledWith('/api/billing/store-outcome',report);expect(preferences.size).toBe(0);
  });
  it('blocks an atomic preparation with unresolved rights or a switched account',async()=>{
    for(const options of [{startPaused:true},{switchAccount:true},{startOffline:true}]){
      const s=setup({atomic:true,...options});await expect(s.controller.purchase(config)).rejects.toThrow();expect(s.sdk.purchasePackage).not.toHaveBeenCalled();
    }
  });
  it('restores through the SDK and rechecks the server rather than granting from customerInfo',async()=>{const s=setup();const result=await s.controller.restore(config);expect(s.sdk.restorePurchases).toHaveBeenCalledTimes(1);expect(result.plan).toBe('free');await s.controller.forget();expect(s.sdk.logOut).toHaveBeenCalledTimes(1);});
  it('does not allow an expired or stale Pro display',async()=>{const s=setup({paid:true});const result=await s.controller.entitlement();expect(isVerifiedPro(result)).toBe(true);expect(isVerifiedPro({...result,expiresAt:new Date(Date.now()-1).toISOString()})).toBe(false);expect(isVerifiedPro({...result,verifiedAt:new Date(Date.now()-300001).toISOString()})).toBe(false);});
  it('ends a stalled offering lookup and lets the next attempt fetch products again',async()=>{
    vi.useFakeTimers();
    try{
      const s=setup();const member=await s.controller.entitlement();s.sdk.getOfferings.mockImplementationOnce(()=>new Promise(()=>{}));
      const check=expect(s.controller.offering(config,member)).rejects.toThrow('STORE_PRODUCT_TIMEOUT');
      await vi.advanceTimersByTimeAsync(12000);await check;
      expect((await s.controller.offering(config,member)).product.identifier).toBe(config.productId);
      expect(s.sdk.getOfferings).toHaveBeenCalledTimes(2);expect(s.sdk.purchasePackage).not.toHaveBeenCalled();
    }finally{vi.useRealTimers();}
  });
});
