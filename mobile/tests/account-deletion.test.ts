import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const state=vi.hoisted(()=>({prefs:new Map<string,string>(),vault:new Map<string,string>(),local:new Map<string,string>(),content:new Map<string,string>(),status:'completed',fetch:vi.fn(),remove:vi.fn(),forget:vi.fn(async()=>{})}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true},CapacitorHttp:{request:async({url,data}:any)=>{const r=await state.fetch(url,{body:JSON.stringify(data)});return {url,status:r.status,data:await r.json()};}},registerPlugin:()=>({get:async(options?:{purpose?:string})=>({value:state.vault.get(options?.purpose??'session')}),set:async({purpose,value}:any)=>{state.vault.set(purpose??'session',value);},clear:async(options?:{purpose?:string})=>{state.vault.delete(options?.purpose??'session');}})}));
vi.mock('@capacitor/push-notifications',()=>({PushNotifications:{unregister:vi.fn(async()=>{})}}));
vi.mock('@capacitor/preferences',()=>({Preferences:{get:async({key}:any)=>({value:state.prefs.get(key)??null}),set:async({key,value}:any)=>{state.prefs.set(key,value);},remove:async({key}:any)=>{state.prefs.delete(key);}}}));
vi.mock('../src/lib/billing',()=>({billing:{forget:state.forget}}));
vi.mock('../src/lib/native',()=>({settingsStore:{get:async(k:string)=>state.prefs.get('anzen.'+k)??null,set:async(k:string,v:string)=>{state.prefs.set('anzen.'+k,v);},remove:async(k:string)=>{state.prefs.delete('anzen.'+k);}},contentStore:{remove:state.remove}}));
vi.mock('@/lib/local-data-registry',()=>({collectAppLocalStorageKeys:()=>[...state.local.keys()]}));
beforeEach(()=>{
  vi.resetModules();vi.clearAllMocks();state.prefs.clear();state.vault.clear();state.local.clear();state.content.clear();state.status='completed';
  vi.stubGlobal('window',{dispatchEvent:vi.fn()});vi.stubGlobal('localStorage',{removeItem:(k:string)=>state.local.delete(k)});
  state.remove.mockImplementation(async(k:string)=>{state.content.delete(k);});
  state.fetch.mockImplementation(async(_url:string,options:any)=>{const body=JSON.parse(options.body);return {status:200,json:async()=>body.action==='prepare'?{id:'deletion-a',receipt:'r'.repeat(43),confirmation:'c'.repeat(43),expiresAt:new Date().toISOString(),subject:'member-a'}:{status:state.status,completedAt:null}};});vi.stubGlobal('fetch',state.fetch);
});
afterEach(()=>vi.unstubAllGlobals());
async function start(){const session=await import('../src/lib/session');await session.setSessionToken('session-a');const deletion=await import('../src/lib/account-deletion');const preparation=await deletion.prepareDeletion();return {session,deletion,preparation};}
function saveB(){state.local.set('company-profile','member-b');state.content.set('saved','member-b');}
it('erases A once, then only queries on remount, restart and manual checks after B login',async()=>{
  const {session,deletion,preparation}=await start();state.local.set('company-profile','member-a');await deletion.confirmDeletion(preparation);expect(state.local.size).toBe(0);expect(state.forget).toHaveBeenCalledTimes(1);
  await session.setSessionToken('session-b');saveB();await deletion.checkDeletion();await deletion.checkDeletion();
  vi.resetModules();const restarted=await import('../src/lib/account-deletion');await restarted.checkDeletion();await restarted.checkDeletion();
  const restartedSession=await import('../src/lib/session');expect(await restartedSession.sessionToken()).toBe('session-b');
  expect(state.local.get('company-profile')).toBe('member-b');expect(state.content.get('saved')).toBe('member-b');expect(state.forget).toHaveBeenCalledTimes(1);expect(JSON.parse(state.prefs.get('anzen.deletion-receipt')!).erased).toBe(true);
});
it('never erases B when A is pending and its confirmation response is lost',async()=>{
  const {session,deletion,preparation}=await start();state.fetch.mockRejectedValueOnce(new Error('offline'));await expect(deletion.confirmDeletion(preparation)).rejects.toThrow('offline');
  await session.setSessionToken('session-b');saveB();state.status='pending';await deletion.checkDeletion();state.status='completed';await deletion.checkDeletion();
  expect(await session.sessionToken()).toBe('session-b');expect(state.local.get('company-profile')).toBe('member-b');expect(state.forget).not.toHaveBeenCalled();
});
it('checks the current incarnation again after an in-flight status response',async()=>{
  const {session,deletion,preparation}=await start();state.fetch.mockRejectedValueOnce(new Error('offline'));await expect(deletion.confirmDeletion(preparation)).rejects.toThrow();
  let resolve!:(value:unknown)=>void;state.fetch.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const checking=deletion.checkDeletion();await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));
  await session.setSessionToken('session-b');saveB();resolve({status:200,json:async()=>({status:'completed',completedAt:null})});await checking;
  expect(await session.sessionToken()).toBe('session-b');expect(state.content.get('saved')).toBe('member-b');
});
it('requires reauthentication if a prepared deletion belongs to an earlier session',async()=>{const {session,deletion,preparation}=await start();await session.setSessionToken('session-b');await expect(deletion.confirmDeletion(preparation)).rejects.toThrow('REAUTH_REQUIRED');expect(state.fetch).toHaveBeenCalledTimes(1);});
it('uses legacy unbound receipts for inquiry only',async()=>{const {session,deletion}=await start();state.prefs.set('anzen.deletion-receipt','r'.repeat(43));saveB();await deletion.checkDeletion();expect(await session.sessionToken()).toBe('session-a');expect(state.local.size).toBe(1);expect(state.forget).not.toHaveBeenCalled();});
it('waits for every removal after a disk error before installing another member session',async()=>{
  const {session,deletion,preparation}=await start();let finish!:()=>void;
  state.remove.mockImplementation(async(k:string)=>{if(k==='news')throw new Error('disk');if(k==='saved')await new Promise<void>(r=>{finish=r;});state.content.delete(k);});
  const deleting=deletion.confirmDeletion(preparation).catch(e=>(e as Error).message);await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
  let installed=false;const login=session.setSessionToken('session-b').then(()=>{installed=true;saveB();});await Promise.resolve();expect(installed).toBe(false);expect(await session.sessionToken()).toBe('session-a');
  finish();expect(await deleting).toBe('disk');await login;await deletion.checkDeletion();expect(await session.sessionToken()).toBe('session-b');expect(state.content.get('saved')).toBe('member-b');
});
