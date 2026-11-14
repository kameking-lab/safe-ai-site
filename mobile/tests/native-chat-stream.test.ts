import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('@capacitor/core',()=>({registerPlugin:vi.fn()}));
vi.mock('../src/lib/billing-diagnostics',()=>({billingDiagnostic:vi.fn(),diagnosticCodes:['UNAUTHORIZED','DAILY_LIMIT_REACHED']}));
import {billingDiagnostic} from '../src/lib/billing-diagnostics';
import {nativeChatResponse} from '../src/lib/native-chat-stream';
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('window',{dispatchEvent:vi.fn()});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function fixture(){
 let receive!:(e:Record<string,unknown>)=>void;let id='';
 const remove=vi.fn(async()=>{});
 const sdk={addListener:vi.fn(async(_n:string,callback:typeof receive)=>{receive=callback;return {remove};}),start:vi.fn(async(options:{id:string})=>{id=options.id;}),cancel:vi.fn(async()=>{})};
 return {sdk,remove,event:(e:Record<string,unknown>)=>receive({id,...e}),getId:()=>id};
}
it('records HTTP status and fixed rejection code without response text or credentials',async()=>{
 const f=fixture();const pending=nativeChatResponse('{}',new Headers(),new AbortController().signal,f.sdk);
 await vi.waitFor(()=>expect(f.sdk.start).toHaveBeenCalledOnce());
 f.event({kind:'headers',status:401});const response=await pending;
 f.event({kind:'chunk',data:Buffer.from(JSON.stringify({error:{code:'UNAUTHORIZED',message:'private message'}})).toString('base64')});f.event({kind:'end'});
 expect(response.status).toBe(401);await response.text();
 expect(billingDiagnostic).toHaveBeenCalledWith(expect.objectContaining({operation:'chat',result:'failed',httpStatus:401,code:'UNAUTHORIZED'}));
 expect(JSON.stringify(vi.mocked(billingDiagnostic).mock.calls)).not.toContain('private message');
});
it('times out even when native listener registration never returns',async()=>{
 vi.useFakeTimers();const sdk={addListener:vi.fn(()=>new Promise<never>(()=>{})),start:vi.fn(),cancel:vi.fn(async()=>{})};
 const pending=nativeChatResponse('{}',new Headers(),new AbortController().signal,sdk);
 const rejected=expect(pending).rejects.toThrow('TIMEOUT');await vi.advanceTimersByTimeAsync(35001);await rejected;
 expect(sdk.start).not.toHaveBeenCalled();expect(sdk.cancel).toHaveBeenCalledOnce();
 expect(billingDiagnostic).toHaveBeenCalledWith(expect.objectContaining({result:'timeout',stage:'listener',code:'TIMEOUT'}));
});
it('diagnoses HTTP 200 without a final SSE answer as an invalid response',async()=>{
 const f=fixture();const pending=nativeChatResponse('{}',new Headers(),new AbortController().signal,f.sdk);
 await vi.waitFor(()=>expect(f.sdk.start).toHaveBeenCalledOnce());f.event({kind:'headers',status:200});const response=await pending;f.event({kind:'end'});await response.text();
 expect(billingDiagnostic).toHaveBeenCalledWith(expect.objectContaining({result:'failed',httpStatus:200,code:'INVALID_RESPONSE'}));
});
it.each(['event: meta\n','event: meta\ndata: {"answer":"cut off','event: meta\ndata: {}\n\n','event: meta\ndata: {"answer":"   "}\n\n'])('does not report completion for incomplete or empty meta: %s',async payload=>{
 const f=fixture();const pending=nativeChatResponse('{}',new Headers(),new AbortController().signal,f.sdk);
 await vi.waitFor(()=>expect(f.sdk.start).toHaveBeenCalled());f.event({kind:'headers',status:200});const response=await pending;
 f.event({kind:'chunk',data:Buffer.from(payload).toString('base64')});f.event({kind:'end'});expect(await response.text()).toBe(payload);
 expect(billingDiagnostic).toHaveBeenCalledWith(expect.objectContaining({result:'failed',code:'INVALID_RESPONSE'}));
 expect(billingDiagnostic).not.toHaveBeenCalledWith(expect.objectContaining({stage:'complete',result:'ok'}));
});
it('recognizes a complete answer across UTF-8 and SSE chunk boundaries without logging it',async()=>{
 const f=fixture();const pending=nativeChatResponse('{}',new Headers(),new AbortController().signal,f.sdk);
 await vi.waitFor(()=>expect(f.sdk.start).toHaveBeenCalled());f.event({kind:'headers',status:200});const response=await pending;
 const payload='event: meta\r\ndata: '+JSON.stringify({answer:'安全を確認してください'})+'\r\n\r\n';
 for(const byte of Buffer.from(payload))f.event({kind:'chunk',data:Buffer.from([byte]).toString('base64')});
 f.event({kind:'end'});expect(await response.text()).toBe(payload);
 expect(billingDiagnostic).toHaveBeenCalledWith(expect.objectContaining({stage:'complete',result:'ok'}));
 expect(JSON.stringify(vi.mocked(billingDiagnostic).mock.calls)).not.toContain('安全');
});
it('resolves on headers and delivers the first UTF-8 bytes before stream completion',async()=>{
 const f=fixture();const pending=nativeChatResponse('{}',new Headers({'Authorization':'Bearer mock-session','X-Operation-ID':'op-fixture'}),new AbortController().signal,f.sdk);
 await vi.waitFor(()=>expect(f.sdk.start).toHaveBeenCalledTimes(1));
 f.event({kind:'headers',status:200,headers:{'Content-Type':'text/event-stream'}});
 const response=await pending;const reader=response.body!.getReader();const bytes=new TextEncoder().encode('event: text\ndata: {"chunk":"安全"}\n\n');
 f.event({kind:'chunk',data:Buffer.from(bytes.subarray(0,29)).toString('base64')});
 const first=await reader.read();expect(first.done).toBe(false);expect(first.value).toEqual(bytes.subarray(0,29));expect(f.remove).not.toHaveBeenCalled();
 f.event({kind:'chunk',data:Buffer.from(bytes.subarray(29)).toString('base64')});const second=await reader.read();
 expect(new TextDecoder().decode(Buffer.concat([first.value!,second.value!]))).toContain('安全');
 f.event({kind:'end'});expect((await reader.read()).done).toBe(true);expect(f.remove).toHaveBeenCalledTimes(1);
 expect(f.sdk.start).toHaveBeenCalledWith(expect.objectContaining({headers:{authorization:'Bearer mock-session','x-operation-id':'op-fixture'}}));
});
it('aborts the native request and removes its listener before headers',async()=>{
 const f=fixture();const abort=new AbortController();const pending=nativeChatResponse('{}',new Headers(),abort.signal,f.sdk);const rejected=expect(pending).rejects.toMatchObject({name:'AbortError'});
 await vi.waitFor(()=>expect(f.sdk.start).toHaveBeenCalled());abort.abort();await rejected;
 expect(f.sdk.cancel).toHaveBeenCalledWith({id:f.getId()});expect(f.remove).toHaveBeenCalledTimes(1);
});
it('keeps HTTP errors readable and cancels a reader without closing an already cancelled stream',async()=>{
 const f=fixture();const pending=nativeChatResponse('{}',new Headers(),new AbortController().signal,f.sdk);
 await vi.waitFor(()=>expect(f.sdk.start).toHaveBeenCalled());f.event({kind:'headers',status:429,headers:{'Content-Type':'application/json'}});
 const response=await pending;expect(response.status).toBe(429);await response.body!.cancel();expect(f.sdk.cancel).toHaveBeenCalledWith({id:f.getId()});
});
