// @vitest-environment node
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {POST} from './route';
import {allowBillingDiagnostic} from '@/lib/mobile/billing-diagnostics';
const event={version:1,traceId:'88888888-1111-4111-8111-111111111111',sequence:1,operation:'getCustomerInfo',result:'timeout',elapsedMs:8000};
const request=(body:unknown=event,headers:Record<string,string>={})=>new Request('https://www.anzen-ai-portal.jp/api/mobile/v1/diagnostics',{method:'POST',headers:{origin:'https://www.anzen-ai-portal.jp','content-type':'application/json',...headers},body:JSON.stringify(body)});
let time=Date.now();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(time+=60001);vi.spyOn(console,'info').mockImplementation(()=>{});});
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('accepts fixed transition data before login, without emitting headers or credentials',async()=>{
 const response=await POST(request(event,{authorization:'Bearer synthetic-token','x-forwarded-for':'192.0.2.10'}));
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');
 expect(console.info).toHaveBeenCalledWith('[mobile-billing]',JSON.stringify(event));
 expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toMatch(/synthetic-token|192\.0\.2\.10/);
});
it.each([{...event,email:'synthetic@example.test'},{...event,error:'secret text'},{...event,appUserId:'member'},{...event,operation:'arbitrary'},{...event,elapsedMs:180001}])('rejects unapproved fields and values without logging the body',async input=>{
 expect((await POST(request(input))).status).toBe(400);expect(console.info).not.toHaveBeenCalled();
});
it('rejects foreign origins, non-JSON and oversized input including chunked bodies',async()=>{
 expect((await POST(request(event,{origin:'https://other.test'}))).status).toBe(403);
 expect((await POST(request(event,{'content-type':'text/plain'}))).status).toBe(415);
 expect((await POST(request(event,{'content-length':'1025'}))).status).toBe(413);
 expect((await POST(request({...event,padding:'x'.repeat(2000)}))).status).toBe(413);
 expect(console.info).not.toHaveBeenCalled();
});
it('limits each client to 60 and the entire instance to 120 per minute, then resets',()=>{
 const now=Date.now();const first=request(event,{'x-vercel-forwarded-for':'192.0.2.1'});const second=request(event,{'x-vercel-forwarded-for':'192.0.2.2'});
 for(let n=0;n<60;n++)expect(allowBillingDiagnostic(first,now)).toBe(true);
 expect(allowBillingDiagnostic(first,now)).toBe(false);
 for(let n=0;n<60;n++)expect(allowBillingDiagnostic(second,now)).toBe(true);
 expect(allowBillingDiagnostic(request(event,{'x-vercel-forwarded-for':'192.0.2.3'}),now)).toBe(false);
 expect(allowBillingDiagnostic(first,now+60000)).toBe(true);
});
