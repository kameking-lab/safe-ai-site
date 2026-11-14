import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({native:true,request:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>mock.native},CapacitorHttp:{request:mock.request}}));
vi.mock('../src/lib/api',()=>({SITE:'https://www.anzen-ai-portal.jp'}));
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();mock.native=true;vi.stubGlobal('window',{});vi.spyOn(console,'warn').mockImplementation(()=>{});});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
const ok={status:200,url:'https://www.anzen-ai-portal.jp/api/mobile/v1/diagnostics',data:{ok:true}};
it('retries a transient delivery failure and sends fixed data without a session dependency',async()=>{
 mock.request.mockResolvedValueOnce({...ok,status:503}).mockResolvedValueOnce(ok);
 const {billingDiagnostic}=await import('../src/lib/billing-diagnostics');billingDiagnostic({operation:'chat',result:'failed',stage:'headers',httpStatus:401,code:'UNAUTHORIZED'});
 await vi.waitFor(()=>expect(mock.request).toHaveBeenCalledTimes(2));
 const input=mock.request.mock.calls[0][0];expect(input.headers).toEqual({'Content-Type':'application/json',Origin:'https://www.anzen-ai-portal.jp','X-Anzen-Native':'1'});expect(input.disableRedirects).toBe(true);
 expect(input.data).toMatchObject({operation:'chat',httpStatus:401,code:'UNAUTHORIZED'});expect(JSON.stringify(input)).not.toContain('Bearer');
});
it('reports a permanent rejection locally without retrying or leaking the body',async()=>{
 mock.request.mockResolvedValue({...ok,status:403,data:{private:'do not log'}});
 const {billingDiagnostic}=await import('../src/lib/billing-diagnostics');billingDiagnostic({operation:'login',result:'start'});
 await vi.waitFor(()=>expect(console.warn).toHaveBeenCalled());expect(mock.request).toHaveBeenCalledOnce();expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('do not log');
});
it('bounds stalled delivery independently of application operations',async()=>{
 vi.useFakeTimers();mock.request.mockImplementation(()=>new Promise(()=>{}));
 const {billingDiagnostic}=await import('../src/lib/billing-diagnostics');expect(billingDiagnostic({operation:'chat',result:'start',stage:'listener'})).toBeUndefined();
 await vi.advanceTimersByTimeAsync(17001);expect(mock.request).toHaveBeenCalledTimes(2);expect(console.warn).toHaveBeenCalledTimes(2);
});
it('does not send native diagnostics from the web',async()=>{
 mock.native=false;const {billingDiagnostic}=await import('../src/lib/billing-diagnostics');billingDiagnostic({operation:'login',result:'start'});expect(mock.request).not.toHaveBeenCalled();
});
