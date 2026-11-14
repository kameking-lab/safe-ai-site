// @vitest-environment node
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {POST} from './route';
import {allowBillingDiagnostic} from '@/lib/mobile/billing-diagnostics';
const event={version:1,traceId:'88888888-1111-4111-8111-111111111111',sequence:1,operation:'getCustomerInfo',result:'timeout',elapsedMs:8000};
const request=(body:unknown=event,headers:Record<string,string>={})=>new Request('https://www.anzen-ai-portal.jp/api/mobile/v1/diagnostics',{method:'POST',headers:{origin:'https://www.anzen-ai-portal.jp','content-type':'application/json',...headers},body:JSON.stringify(body)});
let time=Date.now();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(time+=60001);vi.spyOn(console,'warn').mockImplementation(()=>{});});
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('accepts fixed transition data before login, without emitting headers or credentials',async()=>{
 const response=await POST(request(event,{authorization:'Bearer synthetic-token','x-forwarded-for':'192.0.2.10'}));
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');
 expect(console.warn).toHaveBeenCalledWith('[mobile-billing]',JSON.stringify(event));
 expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/synthetic-token|192\.0\.2\.10/);
});
it.each(['capacitor://localhost','https://localhost',''])('accepts native diagnostics with origin %s and no authentication',async origin=>{
 const headers=new Headers({'content-type':'application/json','x-anzen-native':'1'});if(origin)headers.set('origin',origin);
 const input={...event,operation:'chat',result:'failed',stage:'headers',httpStatus:401,code:'UNAUTHORIZED'};
 expect((await POST(new Request(request().url,{method:'POST',headers,body:JSON.stringify(input)}))).status).toBe(200);
 expect(console.warn).toHaveBeenCalledWith('[mobile-billing]',JSON.stringify(input));
});
it.each([{...event,email:'synthetic@example.test'},{...event,error:'secret text'},{...event,appUserId:'member'},{...event,operation:'arbitrary'},{...event,elapsedMs:180001}])('rejects unapproved fields and values without logging the body',async input=>{
 expect((await POST(request(input))).status).toBe(400);expect(console.warn).not.toHaveBeenCalledWith('[mobile-billing]',expect.anything());
 expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/synthetic@example|secret text|appUserId/);
});
it('rejects foreign origins, non-JSON and oversized input including chunked bodies',async()=>{
 expect((await POST(request(event,{origin:'https://other.test'}))).status).toBe(403);
 expect((await POST(request(event,{'content-type':'text/plain'}))).status).toBe(415);
 expect((await POST(request(event,{'content-length':'1025'}))).status).toBe(413);
 expect((await POST(request({...event,padding:'x'.repeat(2000)}))).status).toBe(413);
 expect(console.warn).not.toHaveBeenCalledWith('[mobile-billing]',expect.anything());
});
it('limits each client to 60 and the entire instance to 120 per minute, then resets',()=>{
 const now=Date.now();const first=request(event,{'x-vercel-forwarded-for':'192.0.2.1'});const second=request(event,{'x-vercel-forwarded-for':'192.0.2.2'});
 for(let n=0;n<60;n++)expect(allowBillingDiagnostic(first,now)).toBe(true);
 expect(allowBillingDiagnostic(first,now)).toBe(false);
 for(let n=0;n<60;n++)expect(allowBillingDiagnostic(second,now)).toBe(true);
 expect(allowBillingDiagnostic(request(event,{'x-vercel-forwarded-for':'192.0.2.3'}),now)).toBe(false);
 expect(allowBillingDiagnostic(first,now+60000)).toBe(true);
});
it.each(['never','trickle','oversized'] as const)('bounds %s body handling even when cancellation never resolves',async mode=>{
 let stream!:ReadableStreamDefaultController<Uint8Array>;
 const cancel=vi.fn(()=>new Promise<void>(()=>{}));
 const body=new ReadableStream<Uint8Array>({start(controller){stream=controller;},cancel});
 const input=new Request(request().url,{method:'POST',headers:request().headers,body,duplex:'half'} as RequestInit);
 let response:Response|undefined;const pending=POST(input).then(value=>{response=value;});
 if(mode==='oversized')stream.enqueue(new Uint8Array(1025));
 if(mode==='trickle'){stream.enqueue(new TextEncoder().encode('{'));await vi.advanceTimersByTimeAsync(1500);stream.enqueue(new TextEncoder().encode(' '));}
 await vi.advanceTimersByTimeAsync(2001);
 expect(response?.status).toBe(mode==='oversized'?413:408);await pending;
 expect(cancel).toHaveBeenCalledOnce();expect(console.warn).not.toHaveBeenCalledWith('[mobile-billing]',expect.anything());
});
