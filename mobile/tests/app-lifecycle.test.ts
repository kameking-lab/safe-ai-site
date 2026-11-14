import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({callbacks:new Map<string,(data:never)=>void>(),remove:vi.fn(),complete:vi.fn(),dismiss:vi.fn(async()=>{}),launch:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true}}));
vi.mock('@capacitor/app',()=>({App:{addListener:vi.fn(async(name,callback)=>{mock.callbacks.set(name,callback);return {remove:mock.remove};}),getLaunchUrl:mock.launch}}));
vi.mock('@capacitor/browser',()=>({Browser:{addListener:vi.fn(async(name,callback)=>{mock.callbacks.set(name,callback);return {remove:mock.remove};})}}));
vi.mock('../src/lib/session',()=>({completeLogin:mock.complete,dismissLogin:mock.dismiss,sessionToken:async()=>null}));
vi.mock('../src/lib/billing',()=>({billing:{recoverSession:vi.fn(async()=>{})}}));
import { installAppLifecycle } from '../src/lib/app-lifecycle';
beforeEach(()=>{vi.clearAllMocks();mock.callbacks.clear();mock.complete.mockResolvedValue(true);mock.launch.mockResolvedValue({url:'anzenai://auth/callback?mock=1'});vi.stubGlobal('window',{dispatchEvent:vi.fn()});});
afterEach(()=>vi.unstubAllGlobals());
describe('app-wide login and resume lifecycle',()=>{
  it('handles a cold launch and warm URL without an account screen mounted',async()=>{
    const cleanup=installAppLifecycle();await vi.waitFor(()=>expect(mock.complete).toHaveBeenCalledWith('anzenai://auth/callback?mock=1'));
    mock.callbacks.get('appUrlOpen')!({url:'anzenai://auth/callback?mock=2'} as never);expect(mock.complete).toHaveBeenCalledWith('anzenai://auth/callback?mock=2');
    mock.callbacks.get('appStateChange')!({isActive:true} as never);expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'anzen-app-active'}));
    mock.callbacks.get('browserFinished')!(undefined as never);expect(mock.dismiss).toHaveBeenCalledTimes(1);
    cleanup();expect(mock.remove).toHaveBeenCalledTimes(3);
  });
  it('removes late listeners when unmounted before registration and skips stale launch URLs',async()=>{
    const cleanup=installAppLifecycle();cleanup();await vi.waitFor(()=>expect(mock.remove).toHaveBeenCalledTimes(3));expect(mock.launch).not.toHaveBeenCalled();expect(mock.complete).not.toHaveBeenCalled();
  });
});
