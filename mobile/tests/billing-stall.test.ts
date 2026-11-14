import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {BillingController,type BillingConfig} from '../src/lib/billing';
import product from '@/lib/mobile/product-policy.json';
const prefs=vi.hoisted(()=>new Map<string,string>());
vi.mock('@capacitor/preferences',()=>({Preferences:{get:async({key}:{key:string})=>({value:prefs.get(key)??null}),set:async({key,value}:{key:string;value:string})=>{prefs.set(key,value);},remove:async({key}:{key:string})=>{prefs.delete(key);}}}));
const config:BillingConfig={ready:true,publicKey:'synthetic-public-sdk',productId:'jp.anzenaiportal.pro.monthly',offeringId:'fixture',policy:product,login:{apple:true,google:true},terms:'https://example.test/terms',privacy:'https://example.test/privacy',manage:'https://apps.apple.com/account/subscriptions'};
const pro=()=>({plan:'pro',source:'app_store',syncState:'verified',expiresAt:new Date(Date.now()+86400000).toISOString(),appUserId:'synthetic-member-identifier',verifiedAt:new Date().toISOString(),limits:product.limits.pro});
const never=()=>new Promise<never>(()=>{});
function setup(){
 const send=vi.fn(async(path:string)=>path.endsWith('/billing/config')?config:pro());
 const sdk={configure:vi.fn(async()=>{}),logIn:vi.fn(async()=>({}) as never),logOut:vi.fn(async()=>({}) as never),invalidateCustomerInfoCache:vi.fn(async()=>{}),getCustomerInfo:vi.fn(async()=>({}) as never),getOfferings:vi.fn(async()=>({all:{fixture:{availablePackages:[]}}}) as never),purchasePackage:vi.fn(async()=>({}) as never),restorePurchases:vi.fn(async()=>({}) as never)};
 return {send,sdk,controller:new BillingController(send,sdk,()=>true)};
}
beforeEach(()=>{vi.useFakeTimers();prefs.clear();});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const stages=['configure','logIn','logOut','invalidateCustomerInfoCache','getCustomerInfo','getOfferings','restorePurchases','config','entitlement','reconcile'] as const;
it.each(stages.flatMap(stage=>(['never','failed','slow'] as const).map(mode=>({stage,mode}))))('$stage / $mode releases callers and flags',async({stage,mode})=>{
 const s=setup();
 if(['logIn','logOut'].includes(stage))await s.controller.identify(config,pro() as never);
 if(stage==='logIn')await s.controller.forget();
 const fault=async()=>{if(mode==='never')return never();if(mode==='failed')throw new Error('synthetic failure');await new Promise(resolve=>setTimeout(resolve,7500));};
 if(stage in s.sdk){const original=s.sdk[stage as keyof typeof s.sdk].getMockImplementation()!;s.sdk[stage as keyof typeof s.sdk].mockImplementationOnce(async()=>{await fault();return original() as never;});}
 else s.send.mockImplementation(async path=>{if(stage==='config'&&path.endsWith('/billing/config')||stage==='entitlement'&&path.startsWith('/api/me/entitlements')||stage==='reconcile'&&path==='/api/billing/reconcile')await fault();return path.endsWith('/billing/config')?config:pro();});
 let settled=false;
 const work=stage==='logOut'?s.controller.forget():stage==='getOfferings'?s.controller.offering(config,pro() as never):stage==='restorePurchases'?s.controller.restore(config):s.controller.recoverSession();
 void work.then(()=>{settled=true;},()=>{settled=true;});
 await vi.advanceTimersByTimeAsync(8001);
 const state=s.controller as unknown as {busy:boolean;recovery:Map<string,unknown>};
 console.info('FIX_EVIDENCE',JSON.stringify({stage,mode,elapsedMs:8001,settled,busy:state.busy,recoveries:state.recovery.size}));
 expect(settled).toBe(true);expect(state.busy).toBe(false);expect(state.recovery.size).toBe(0);
 // The ledger remains independently readable even while native identity is fenced.
 if(stage!=='entitlement')expect((await s.controller.entitlement()).limits.law_chat).toBe(50);
});
it.each(['configure','getCustomerInfo','config'] as const)('publishes ledger Pro before stalled %s finishes',async stage=>{
 const s=setup();const published:string[]=[];vi.stubGlobal('window',{dispatchEvent:(event:CustomEvent)=>{if(event.type==='anzen-entitlement-changed')published.push(event.detail.plan);}});
 if(stage==='config')s.send.mockImplementation(async path=>path.endsWith('/billing/config')?never():pro());else s.sdk[stage].mockImplementationOnce(never);
 const recovery=s.controller.recoverSession().catch(()=>{});await vi.advanceTimersByTimeAsync(1);
 expect(published).toContain('pro');await vi.advanceTimersByTimeAsync(8001);await recovery;
});
it('fences a late native logout before any new identity while server Pro stays available',async()=>{
 const s=setup();await s.controller.identify(config,pro() as never);let finish!:()=>void;
 s.sdk.logOut.mockImplementationOnce(()=>new Promise(resolve=>{finish=()=>resolve({} as never);}));
 const logout=s.controller.forget().catch(()=>{});await vi.advanceTimersByTimeAsync(8001);await logout;
 expect((await s.controller.entitlement()).plan).toBe('pro');
 const identity=s.controller.identify(config,{...pro(),appUserId:'another-synthetic-member'} as never).catch(()=>{});
 await vi.advanceTimersByTimeAsync(1);expect(s.sdk.logIn).not.toHaveBeenCalled();
 finish();await identity;expect(s.sdk.logIn).toHaveBeenLastCalledWith({appUserID:'another-synthetic-member'});
});
it.each(['syncPurchases','restorePurchases'] as const)('fences a late %s receipt transfer before another store identity',async stage=>{
 const s=setup();await s.controller.identify(config,pro() as never);let finish!:()=>void;
 const pending=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve;}));
 if(stage==='syncPurchases')Object.assign(s.sdk,{syncPurchases:pending});else s.sdk.restorePurchases.mockImplementationOnce(async()=>{await pending();return {} as never;});
 const operation=(stage==='syncPurchases'?s.controller.recoverSession():s.controller.restore(config)).catch(()=>{});
 await vi.advanceTimersByTimeAsync(8001);await operation;expect(finish).toBeTypeOf('function');
 const blocked=s.controller.identify(config,{...pro(),appUserId:'replacement-member-id'} as never).catch(()=>{});
 await vi.advanceTimersByTimeAsync(8001);await blocked;expect(s.sdk.logIn).not.toHaveBeenCalled();
 finish();await Promise.resolve();await s.controller.identify(config,{...pro(),appUserId:'replacement-member-id'} as never);
 expect(s.sdk.logIn).toHaveBeenLastCalledWith({appUserID:'replacement-member-id'});
});
it('reidentifies A after a timed-out login to B completes late',async()=>{
 const s=setup();const a=pro();const b={...a,appUserId:'another-synthetic-member'};
 await s.controller.identify(config,a as never);
 let finish!:()=>void;
 s.sdk.logIn.mockImplementationOnce(()=>new Promise(resolve=>{finish=()=>resolve({} as never);}));
 const switching=s.controller.identify(config,b as never).catch(()=>{});
 await vi.advanceTimersByTimeAsync(8001);await switching;
 finish();await vi.advanceTimersByTimeAsync(1);
 await s.controller.identify(config,a as never);
 expect(s.sdk.logIn).toHaveBeenLastCalledWith({appUserID:a.appUserId});
});
