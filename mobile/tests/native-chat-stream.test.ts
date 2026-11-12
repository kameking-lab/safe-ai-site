import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('@capacitor/core',()=>({registerPlugin:vi.fn()}));
import {nativeChatResponse} from '../src/lib/native-chat-stream';
beforeEach(()=>vi.stubGlobal('window',{dispatchEvent:vi.fn()}));
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
 let receive!:(e:Record<string,unknown>)=>void;let id='';
 const remove=vi.fn(async()=>{});
 const sdk={addListener:vi.fn(async(_n:string,callback:typeof receive)=>{receive=callback;return {remove};}),start:vi.fn(async(options:{id:string})=>{id=options.id;}),cancel:vi.fn(async()=>{})};
 return {sdk,remove,event:(e:Record<string,unknown>)=>receive({id,...e}),getId:()=>id};
}
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
