import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({vault:new Map<string,string>(),prefs:new Map<string,string>(),storage:vi.fn(async(_operation:string)=>{}),request:vi.fn(),open:vi.fn(),close:vi.fn(),recover:vi.fn(async()=>{}),forget:vi.fn(async()=>{}),restore:vi.fn(async()=>({})),config:vi.fn(async()=>({ready:true}))}));
vi.mock('../src/lib/billing',()=>({billing:{recoverSession:mock.recover,forget:mock.forget,restore:mock.restore,config:mock.config}}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true},CapacitorHttp:{request:(r:{url:string})=>r.url.endsWith('/diagnostics')?Promise.resolve({status:200,data:{ok:true}}):mock.request(r)},registerPlugin:()=>({
  get:vi.fn(async(options?:{purpose?:string})=>{await mock.storage('vault.get');return {value:mock.vault.get(options?.purpose??'session')};}),
  set:vi.fn(async({purpose,value}:{purpose?:string;value:string})=>{await mock.storage('vault.set');mock.vault.set(purpose??'session',value);}),
  clear:vi.fn(async(options?:{purpose?:string})=>{await mock.storage('vault.clear');mock.vault.delete(options?.purpose??'session');}),
})}));
vi.mock('@capacitor/preferences',()=>({Preferences:{get:async({key}:{key:string})=>{await mock.storage('preferences.get');return {value:mock.prefs.get(key)};},set:async({key,value}:{key:string;value:string})=>{await mock.storage('preferences.set');mock.prefs.set(key,value);}}}));
vi.mock('@capacitor/browser',()=>({Browser:{open:mock.open,close:mock.close}}));
const site='https://www.anzen-ai-portal.jp';const flow='88888888-1111-4111-8111-111111111111';const code='a'.repeat(43);const token='b'.repeat(43);
beforeEach(()=>{
  mock.storage.mockReset().mockResolvedValue(undefined);
  vi.resetModules();vi.clearAllMocks();mock.vault.clear();mock.prefs.clear();mock.open.mockResolvedValue(undefined);mock.close.mockResolvedValue(undefined);vi.stubGlobal('window',{dispatchEvent:vi.fn()});
  mock.request.mockImplementation(async({url})=>({url,status:200,data:url.endsWith('/start')?{flow,authorizeUrl:`${site}/api/mobile/v1/auth/authorize?flow=${flow}`}:{token}}));
});
it('shares one cold Keychain read and retries a transient read before returning a credential',async()=>{
 const session=await import('../src/lib/session');mock.prefs.set('anzen.install.session-initialized','1');mock.vault.set('session',token);
 let failed=false;mock.storage.mockImplementation(async name=>{if(name==='vault.get'&&!failed){failed=true;throw new Error('device activation');}});
 expect(await Promise.all([session.sessionToken(),session.sessionToken(),session.sessionToken()])).toEqual([token,token,token]);
 expect(mock.storage.mock.calls.filter(([name])=>name==='vault.get')).toHaveLength(2);
});
it('uses the persisted login credential for the first chat without another Keychain read',async()=>{
 const session=await import('../src/lib/session');await session.setSessionToken(token);mock.storage.mockClear();
 mock.storage.mockRejectedValue(new Error('Keychain temporarily unavailable'));
 expect(await session.sessionToken()).toBe(token);expect(await session.sessionToken()).toBe(token);
 expect(mock.storage).not.toHaveBeenCalled();
});
it('waits for a concurrent login write before exposing the session to a request',async()=>{
 const session=await import('../src/lib/session');let release!:()=>void;
 mock.storage.mockImplementation(async name=>{if(name==='vault.set')await new Promise<void>(resolve=>{release=resolve;});});
 const write=session.setSessionToken(token);await vi.waitFor(()=>expect(release).toBeTypeOf('function'));
 let returned=false;const read=session.sessionToken().then(value=>{returned=true;return value;});await Promise.resolve();expect(returned).toBe(false);
 release();await write;expect(await read).toBe(token);
});
it.each(['vault.get','vault.set','preferences.set'])('releases login exchange when %s never returns',async operation=>{
 vi.useFakeTimers();const session=await import('../src/lib/session');await session.startLogin();
 mock.storage.mockImplementation(async name=>{if(name===operation)await new Promise(()=>{});});
 const failed=expect(session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).rejects.toThrow('OPERATION_TIMEOUT');
 await vi.advanceTimersByTimeAsync(16001);await failed;expect(session.isLoginExchanging()).toBe(false);
 expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'anzen-login-failed'}));
});
it('releases member reads after a stalled Keychain clear during logout',async()=>{
 vi.useFakeTimers();const session=await import('../src/lib/session');const generation=await import('../src/lib/member-generation');await session.setSessionToken(token);
 mock.storage.mockImplementation(async name=>{if(name==='vault.clear')await new Promise(()=>{});});
 const failed=expect(session.logout()).rejects.toThrow('OPERATION_TIMEOUT');
 await vi.advanceTimersByTimeAsync(8001);await failed;
 expect(()=>generation.assertCurrentMember(generation.memberGeneration())).not.toThrow();
});
it('allows retry after a stalled session-incarnation read',async()=>{
 vi.useFakeTimers();const session=await import('../src/lib/session');
 mock.storage.mockImplementationOnce(()=>new Promise(()=>{}));
 const failed=expect(session.sessionBinding()).rejects.toThrow('OPERATION_TIMEOUT');await vi.advanceTimersByTimeAsync(8001);await failed;
 expect(await session.sessionBinding()).toMatch(/^[0-9a-f-]{36}$/);
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('completes login and clears its pending flag while RevenueCat never returns',async()=>{
 vi.useFakeTimers();const session=await import('../src/lib/session');await session.startLogin();
 mock.recover.mockImplementationOnce(()=>new Promise(()=>{}));mock.close.mockImplementationOnce(()=>new Promise(()=>{}));
 expect(await session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).toBe(true);
 expect(await session.hasPendingLogin()).toBe(false);expect(await session.sessionToken()).toBe(token);
 await vi.advanceTimersByTimeAsync(8001);
});
it('clears the local login and read suspension without waiting for native logout',async()=>{
 vi.useFakeTimers();const session=await import('../src/lib/session');const generation=await import('../src/lib/member-generation');await session.setSessionToken(token);
 mock.forget.mockImplementationOnce(()=>new Promise(()=>{}));let settled=false;void session.logout().then(()=>{settled=true;});
 await vi.advanceTimersByTimeAsync(8001);
 let readsSuspended=false;try{generation.assertCurrentMember(generation.memberGeneration());}catch{readsSuspended=true;}
 console.info('LOGOUT_EVIDENCE',JSON.stringify({settled,credentialRetained:await session.sessionToken()===token,readsSuspended}));
 expect(settled).toBe(true);
 expect(await session.sessionToken()).toBeNull();expect(()=>generation.assertCurrentMember(generation.memberGeneration())).not.toThrow();
});
it('times out an exchange and releases login state for another attempt',async()=>{
 vi.useFakeTimers();const session=await import('../src/lib/session');await session.startLogin();
 mock.request.mockImplementationOnce(()=>new Promise(()=>{}));const failed=expect(session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).rejects.toThrow('OPERATION_TIMEOUT');
 await vi.advanceTimersByTimeAsync(8001);await failed;expect(await session.hasPendingLogin()).toBe(false);
 expect(await session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).toBe(true);
});
it('releases login when the native browser open call never returns',async()=>{
 vi.useFakeTimers();const session=await import('../src/lib/session');mock.open.mockImplementationOnce(()=>new Promise(()=>{}));
 const failed=expect(session.startLogin()).rejects.toThrow('OPERATION_TIMEOUT');for(let i=0;i<4;i++)await vi.advanceTimersByTimeAsync(8001);await failed;
 expect(await session.hasPendingLogin()).toBe(false);expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'anzen-login-failed'}));
});
it('keeps a newer login when the earlier server logout responds late',async()=>{
 vi.useFakeTimers();const session=await import('../src/lib/session');await session.setSessionToken('a'.repeat(43));
 let finish!:(value:unknown)=>void;mock.request.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const signingOut=session.logout();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
 const signingIn=session.setSessionToken(token);await vi.advanceTimersByTimeAsync(1);
 finish({url:site+'/api/mobile/v1/auth/logout',status:200,data:{ok:true}});await Promise.all([signingOut,signingIn]);
 expect(await session.sessionToken()===token).toBe(true);
});
it('keeps a login started while the preceding server logout is still pending',async()=>{
 vi.useFakeTimers();const session=await import('../src/lib/session');await session.setSessionToken(token);
 let finish!:(value:unknown)=>void;mock.request.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const signingOut=session.logout();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
 const opening=session.startLogin();await vi.waitFor(()=>expect(mock.request.mock.calls.some(([request])=>request.url.endsWith('/start'))).toBe(true));await vi.advanceTimersByTimeAsync(1);
 finish({url:site+'/api/mobile/v1/auth/logout',status:200,data:{ok:true}});await Promise.all([signingOut,opening]);
 expect(await session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).toBe(true);
 expect(await session.sessionToken()===token).toBe(true);
});
describe('secure OAuth across native process restarts',()=>{
  it('restores PKCE from Keychain after the JS runtime is recreated and consumes duplicate callbacks once',async()=>{
    const first=await import('../src/lib/session');await first.startLogin();expect(mock.vault.get('login')).toMatch(new RegExp('^'+flow+':[A-Za-z0-9_-]{43}:\\d{13}$'));expect([...mock.prefs.values()]).toEqual(['1']);
    vi.resetModules();const restarted=await import('../src/lib/session');const callback=`anzenai://auth/callback?flow=${flow}&code=${code}`;
    expect(await Promise.all([restarted.completeLogin(callback),restarted.completeLogin(callback)])).toEqual([true,true]);
    expect(mock.request.mock.calls.filter(([r])=>r.url.endsWith('/exchange'))).toHaveLength(1);expect(mock.recover).toHaveBeenCalledOnce();expect(await restarted.sessionToken()).toBe(token);expect(mock.vault.has('login')).toBe(false);expect(await restarted.completeLogin(callback)).toBe(false);
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
 expect(session.isLoginExchanging()).toBe(false);await session.dismissLogin();expect(await session.hasPendingLogin()).toBe(false);
 expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'anzen-login-dismissed'}));
 expect(await session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`)).toBe(true);
 vi.mocked(window.dispatchEvent).mockClear();await session.dismissLogin();expect(window.dispatchEvent).not.toHaveBeenCalled();
});
it('does not dismiss an exchange already in progress',async()=>{
 const session=await import('../src/lib/session');await session.startLogin();
 let release!:(value:unknown)=>void;mock.request.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const completing=session.completeLogin(`anzenai://auth/callback?flow=${flow}&code=${code}`);
 await vi.waitFor(()=>expect(release).toBeTypeOf('function'));await session.dismissLogin();
 expect(await session.hasPendingLogin()).toBe(true);expect(session.isLoginExchanging()).toBe(true);
 release({url:site+'/api/mobile/v1/auth/exchange',status:200,data:{token}});expect(await completing).toBe(true);
});

describe('purchase without registration (App Store 5.1.1(v))',()=>{
  const guestToken='g'.repeat(43);const callback=`anzenai://auth/callback?flow=${flow}&code=${code}`;
  const respond=(exchange:Record<string,unknown>)=>mock.request.mockImplementation(async({url})=>({url,status:200,data:url.endsWith('/guest')?{token:guestToken,guest:true}:url.endsWith('/start')?{flow,authorizeUrl:`${site}/api/mobile/v1/auth/authorize?flow=${flow}`}:exchange}));
  it('creates one guest session without sending any credential and marks it as a guest',async()=>{
    const session=await import('../src/lib/session');respond({token});
    const [first,second]=await Promise.all([session.ensureSession(),session.ensureSession()]);
    expect(first).toBe(guestToken);expect(second).toBe(guestToken);
    const calls=mock.request.mock.calls.filter(([r])=>r.url===`${site}/api/mobile/v1/auth/guest`);
    expect(calls).toHaveLength(1);expect(calls[0][0].method).toBe('POST');expect(calls[0][0].headers.Authorization).toBeUndefined();
    expect(await session.isGuestSession()).toBe(true);expect(mock.prefs.get('anzen.session-guest')).toBe('1');
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'anzen-session-changed',detail:{signedIn:true,guest:true}}));
    // An existing session is reused; no further guest is created.
    expect(await session.ensureSession()).toBe(guestToken);expect(mock.request.mock.calls.filter(([r])=>r.url.endsWith('/guest'))).toHaveLength(1);
  });
  it('sends the guest credential when the guest signs in, clears the guest flag and restores when asked',async()=>{
    const session=await import('../src/lib/session');respond({token,restoreRecommended:true});
    await session.ensureSession();await session.startLogin();
    expect(await session.completeLogin(callback)).toBe(true);
    const exchange=mock.request.mock.calls.find(([r])=>r.url.endsWith('/exchange'))![0];
    expect(exchange.data).toMatchObject({flow,code,guestToken});expect(exchange.headers.Authorization).toBeUndefined();
    expect(await session.sessionToken()).toBe(token);expect(await session.isGuestSession()).toBe(false);expect(mock.prefs.get('anzen.session-guest')).toBe('0');
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'anzen-session-changed',detail:{signedIn:true,guest:false}}));
    await vi.waitFor(()=>expect(mock.restore).toHaveBeenCalledWith({ready:true}));expect(mock.recover).not.toHaveBeenCalled();
  });
  it('never sends a signed-in member credential as a guest token',async()=>{
    const session=await import('../src/lib/session');respond({token});
    await session.setSessionToken('m'.repeat(43));await session.startLogin();
    expect(await session.completeLogin(callback)).toBe(true);
    const exchange=mock.request.mock.calls.find(([r])=>r.url.endsWith('/exchange'))![0];
    expect(exchange.data).not.toHaveProperty('guestToken');
    expect(mock.recover).toHaveBeenCalledOnce();expect(mock.restore).not.toHaveBeenCalled();
  });
});
