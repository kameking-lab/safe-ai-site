import { afterEach,describe,expect,it,vi } from 'vitest';
vi.mock('../src/lib/session',()=>({siteApi:vi.fn()}));
import { registerWeatherPush } from '../src/lib/push-registration';
function setup(){
  const callbacks=new Map<string,(value:unknown)=>void>();const remove=vi.fn(async()=>{});
  const push={addListener:vi.fn(async(name:string,callback:(value:unknown)=>void)=>{callbacks.set(name,callback);return {remove};}),register:vi.fn(async()=>{})};
  const send=vi.fn(async()=>({ok:true}));
  return {push,send,callbacks,remove,run:()=>registerWeatherPush(push as unknown as NonNullable<Parameters<typeof registerWeatherPush>[0]>,send,1000)};
}
afterEach(()=>vi.useRealTimers());
describe('native push registration cleanup',()=>{
  it('registers with the server once and removes both listeners after success',async()=>{const s=setup();const result=s.run();await vi.waitFor(()=>expect(s.push.register).toHaveBeenCalled());s.callbacks.get('registration')!({value:'mock-apns-token'});await result;expect(s.send).toHaveBeenCalledWith('/api/me/push-devices',{token:'mock-apns-token'});expect(s.remove).toHaveBeenCalledTimes(2);});
  it('reports asynchronous listener setup failures without an unhandled promise',async()=>{const s=setup();s.push.addListener.mockRejectedValueOnce(new Error('plugin unavailable'));await expect(s.run()).rejects.toThrow('plugin unavailable');expect(s.push.register).not.toHaveBeenCalled();});
  it('cleans listeners after registration or server errors',async()=>{const s=setup();s.send.mockRejectedValueOnce(new Error('offline'));const result=s.run();const check=expect(result).rejects.toThrow('サーバーの通知設定が準備中です。');await vi.waitFor(()=>expect(s.push.register).toHaveBeenCalled());s.callbacks.get('registration')!({value:'mock'});await check;expect(s.remove).toHaveBeenCalledTimes(2);});
  it('times out even when the native registration call never finishes and ignores late tokens',async()=>{vi.useFakeTimers();const s=setup();s.push.register.mockImplementation(()=>new Promise(()=>{}));const result=s.run();const check=expect(result).rejects.toThrow('タイムアウト');await vi.advanceTimersByTimeAsync(1001);await check;expect(s.remove).toHaveBeenCalledTimes(2);s.callbacks.get('registration')!({value:'late'});expect(s.send).not.toHaveBeenCalled();});
});
