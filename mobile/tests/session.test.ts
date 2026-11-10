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
