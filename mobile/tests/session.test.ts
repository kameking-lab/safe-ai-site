import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({vault:new Map<string,string>(),prefs:new Map<string,string>(),request:vi.fn(),open:vi.fn(),close:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true},CapacitorHttp:{request:mock.request},registerPlugin:()=>({
  get:vi.fn(async(options?:{purpose?:string})=>({value:mock.vault.get(options?.purpose??'session')})),
  set:vi.fn(async({purpose,value}:{purpose?:string;value:string})=>{mock.vault.set(purpose??'session',value);}),
  clear:vi.fn(async(options?:{purpose?:string})=>{mock.vault.delete(options?.purpose??'session');}),
})}));
vi.mock('@capacitor/preferences',()=>({Preferences:{get:async({key}:{key:string})=>({value:mock.prefs.get(key)}),set:async({key,value}:{key:string;value:string})=>{mock.prefs.set(key,value);}}}));
vi.mock('@capacitor/browser',()=>({Browser:{open:mock.open,close:mock.close}}));
const site='https://www.anzen-ai-portal.jp';const flow='88888888-1111-4111-8111-111111111111';const code='a'.repeat(43);const token='b'.repeat(43);
beforeEach(()=>{
  vi.resetModules();vi.clearAllMocks();mock.vault.clear();mock.prefs.clear();mock.open.mockResolvedValue(undefined);mock.close.mockResolvedValue(undefined);vi.stubGlobal('window',{dispatchEvent:vi.fn()});
  mock.request.mockImplementation(async({url})=>({url,status:200,data:url.endsWith('/start')?{flow,authorizeUrl:`${site}/api/mobile/v1/auth/authorize?flow=${flow}`}:{token}}));
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('secure OAuth across native process restarts',()=>{
  it('restores PKCE from Keychain after the JS runtime is recreated and consumes duplicate callbacks once',async()=>{
    const first=await import('../src/lib/session');await first.startLogin();expect(mock.vault.get('login')).toMatch(new RegExp('^'+flow+':[A-Za-z0-9_-]{43}:\\d{13}$'));expect([...mock.prefs.values()]).toEqual(['1']);
    vi.resetModules();const restarted=await import('../src/lib/session');const callback=`anzenai://auth/callback?flow=${flow}&code=${code}`;
    expect(await Promise.all([restarted.completeLogin(callback),restarted.completeLogin(callback)])).toEqual([true,true]);
    expect(mock.request.mock.calls.filter(([r])=>r.url.endsWith('/exchange'))).toHaveLength(1);expect(await restarted.sessionToken()).toBe(token);expect(mock.vault.has('login')).toBe(false);expect(await restarted.completeLogin(callback)).toBe(false);
  });
  it('refuses a mismatched flow or expired proof without exchanging credentials',async()=>{
    const session=await import('../src/lib/session');await session.startLogin();
    await expect(session.completeLogin(`anzenai://auth/callback?flow=99999999-1111-4111-8111-111111111111&code=${code}`)).rejects.toThrow('AUTH_FLOW_EXPIRED');expect(mock.vault.has('login')).toBe(true);
    vi.useFakeTimers();vi.setSystemTime(Date.now()+600001);await expect(session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).rejects.toThrow('AUTH_FLOW_EXPIRED');expect(mock.vault.has('login')).toBe(false);expect(mock.request).toHaveBeenCalledTimes(1);
  });
  it('clears surviving Keychain credentials on a fresh install and rejects unrelated links',async()=>{
    mock.vault.set('session',token);mock.vault.set('login','old');const session=await import('../src/lib/session');expect(await session.sessionToken()).toBeNull();expect(mock.vault.size).toBe(0);expect(await session.completeLogin('https://example.test/auth/callback')).toBe(false);expect(await session.completeLogin('broken')).toBe(false);expect(mock.request).not.toHaveBeenCalled();
  });
  it('retains the proof on transient API failure and clears it when the browser cannot open',async()=>{
    const session=await import('../src/lib/session');await session.startLogin();mock.request.mockRejectedValueOnce(new Error('offline'));
    await expect(session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).rejects.toThrow('offline');expect(mock.vault.has('login')).toBe(true);
    mock.open.mockRejectedValueOnce(new Error('browser'));await expect(session.startLogin()).rejects.toThrow('browser');expect(mock.vault.has('login')).toBe(false);
  });
});

it('reports failed offline logout without claiming the credential was cleared',async()=>{
 const session=await import('../src/lib/session');await session.setSessionToken(token);
 mock.request.mockRejectedValueOnce(new Error('offline'));
 await expect(session.logout()).rejects.toThrow('offline');
 expect(await session.sessionToken()).toBe(token);
});
it('shares only overlapping GETs for the same session, without caching subsequent rights reads',async()=>{
 const session=await import('../src/lib/session');await session.setSessionToken(token);
 let release!:(value:unknown)=>void;mock.request.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const first=session.siteApi('/api/me/entitlements');const second=session.siteApi('/api/me/entitlements');
 await vi.waitFor(()=>expect(mock.request).toHaveBeenCalledTimes(1));
 release({url:site+'/api/me/entitlements',status:200,data:{plan:'free'}});
 expect(await first).toEqual(await second);await session.siteApi('/api/me/entitlements');expect(mock.request).toHaveBeenCalledTimes(2);
});
it('does not join a GET started before or during a mutation, even with the same token',async()=>{
 const session=await import('../src/lib/session');await session.setSessionToken(token);
 const releases:Array<(value:unknown)=>void>=[];
 mock.request.mockImplementation(()=>new Promise(resolve=>{releases.push(resolve);}));
 const old=session.siteApi('/api/me/entitlements');await vi.waitFor(()=>expect(releases).toHaveLength(1));
 const change=session.siteApi('/api/billing/reconcile',{});await vi.waitFor(()=>expect(releases).toHaveLength(2));
 const during=session.siteApi('/api/me/entitlements');await vi.waitFor(()=>expect(releases).toHaveLength(3));
 releases[1]({url:site+'/api/billing/reconcile',status:200,data:{plan:'pro'}});await change;
 const fresh=session.siteApi('/api/me/entitlements');await vi.waitFor(()=>expect(releases).toHaveLength(4));
 releases[3]({url:site+'/api/me/entitlements',status:200,data:{plan:'pro'}});expect(await fresh).toEqual({plan:'pro'});
 for(const i of [0,2])releases[i]({url:site+'/api/me/entitlements',status:200,data:{plan:'free'}});
 await Promise.all([old,during]);
});
it('invalidates membership from logout start until completion and permits fresh reads after failure',async()=>{
 const session=await import('../src/lib/session');const generation=await import('../src/lib/member-generation');await session.setSessionToken(token);
 const before=generation.memberGeneration();let fail!:(error:Error)=>void;
 mock.request.mockImplementationOnce(()=>new Promise((_,reject)=>{fail=reject;}));
 const logout=session.logout();const rejected=expect(logout).rejects.toThrow('offline');
 expect(()=>generation.assertCurrentMember(before)).toThrow('STALE_MEMBER_RESPONSE');
 expect(()=>generation.assertCurrentMember(generation.memberGeneration())).toThrow('STALE_MEMBER_RESPONSE');
 await vi.waitFor(()=>expect(fail).toBeTypeOf('function'));fail(new Error('offline'));await rejected;
 expect(()=>generation.assertCurrentMember(generation.memberGeneration())).not.toThrow();expect(await session.sessionToken()).toBe(token);
});
it('separates overlapping GETs across a same-member login incarnation',async()=>{
 const session=await import('../src/lib/session');await session.setSessionToken(token);
 let release!:(value:unknown)=>void;mock.request.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const old=session.siteApi('/api/me/entitlements');await vi.waitFor(()=>expect(release).toBeTypeOf('function'));
 await session.setSessionToken(token);await session.siteApi('/api/me/entitlements');expect(mock.request).toHaveBeenCalledTimes(2);
 release({url:site+'/api/me/entitlements',status:200,data:{plan:'free'}});await old;
});
it('ends loading on exchange failure and preserves the proof for retry',async()=>{
 const session=await import('../src/lib/session');await session.startLogin();
 mock.request.mockRejectedValueOnce(new Error('offline'));
 await expect(session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).rejects.toThrow('offline');
 expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'anzen-login-failed'}));
 expect(await session.hasPendingLogin()).toBe(false);expect(mock.vault.has('login')).toBe(true);
 expect(await session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).toBe(true);
 vi.mocked(window.dispatchEvent).mockClear();
 expect(await session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).toBe(false);
 expect(window.dispatchEvent).not.toHaveBeenCalled();
});
it('allows a dismissed login to restart without losing a late callback',async()=>{
 const session=await import('../src/lib/session');await session.startLogin();
 await session.dismissLogin();expect(await session.hasPendingLogin()).toBe(false);
 expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'anzen-login-dismissed'}));
 expect(await session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).toBe(true);
 vi.mocked(window.dispatchEvent).mockClear();await session.dismissLogin();expect(window.dispatchEvent).not.toHaveBeenCalled();
});
it('does not dismiss an exchange already in progress',async()=>{
 const session=await import('../src/lib/session');await session.startLogin();
 let release!:(value:unknown)=>void;mock.request.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const completing=session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`);
 await vi.waitFor(()=>expect(release).toBeTypeOf('function'));await session.dismissLogin();
 expect(await session.hasPendingLogin()).toBe(true);
 release({url:site+'/api/mobile/v1/auth/exchange',status:200,data:{token}});expect(await completing).toBe(true);
});
