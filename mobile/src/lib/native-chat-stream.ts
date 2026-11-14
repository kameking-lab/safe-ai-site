import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { billingDiagnostic, diagnosticCodes } from './billing-diagnostics';

type StreamEvent = { id: string; kind: 'headers' | 'chunk' | 'end' | 'error'; status?: number; headers?: Record<string,string>; data?: string };
interface ChatStream {
  addListener(name: 'response', listener: (event: StreamEvent) => void): Promise<PluginListenerHandle>;
  start(options: { id: string; body: string; headers: Record<string,string> }): Promise<void>;
  cancel(options: { id: string }): Promise<void>;
};
const native = registerPlugin<ChatStream>('NativeChatStream');

/** URLSession delivers bytes as they arrive; CapacitorHttp buffers until completion. */
export async function nativeChatResponse(body: string, headers: Headers, signal: AbortSignal, sdk: ChatStream = native): Promise<Response> {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const id = crypto.randomUUID();
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let finished = false;
  let responseStarted = false;
  let listener: PluginListenerHandle | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let status: number | undefined;
  let tail = '';
  const decoder = new TextDecoder();
  let pendingEvent = '';
  let oversizedEvent = false;
  let seenMeta = false;
  let seenStreamError = false;
  let stage: 'listener'|'start'|'headers'|'stream'|'complete' = 'listener';
  const started = Date.now();
  const report = (result: 'start'|'ok'|'failed'|'timeout', code?: typeof diagnosticCodes[number]) => billingDiagnostic({operation:'chat',result,stage,httpStatus:status,code,elapsedMs:Math.min(180000,Date.now()-started)});
  report('start');
  let resolveResponse!: (response: Response) => void;
  let rejectResponse!: (error: Error) => void;
  const response = new Promise<Response>((resolve, reject) => { resolveResponse=resolve; rejectResponse=reject; });
  // Listener registration itself can stall; attach rejection handling immediately.
  void response.catch(()=>{});
  const stream = new ReadableStream<Uint8Array>({
    start(value) { controller=value; },
    cancel() { finish(undefined, false); void sdk.cancel({id}).catch(()=>{}); },
  });
  // Inspect complete SSE frames only. A meta header can arrive before its JSON,
  // including when the connection closes mid-answer. Never log the payload.
  function inspectEvents(text: string) {
    pendingEvent += text;
    let separator: RegExpExecArray | null;
    while ((separator = /\r?\n\r?\n/.exec(pendingEvent))) {
      const frame = pendingEvent.slice(0, separator.index);
      pendingEvent = pendingEvent.slice(separator.index + separator[0].length);
      if (!oversizedEvent) {
        const lines = frame.split(/\r?\n/);
        const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
        if (event === 'error') seenStreamError = true;
        if (event === 'meta') {
          seenMeta = false;
          try {
            const value = JSON.parse(lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n'));
            seenMeta = typeof value?.answer === 'string' && value.answer.trim().length > 0;
          } catch { /* An incomplete/invalid answer is not a successful delivery. */ }
        }
      }
      oversizedEvent = false;
    }
    // Bound diagnostic parsing independently of the response consumed by the UI.
    if (pendingEvent.length > 262144) { oversizedEvent = true; pendingEvent = pendingEvent.slice(-3); }
  }
  function finish(error?: Error, closeStream = true) {
    if (finished) return;
    finished=true;
    clearTimeout(deadline);
    signal.removeEventListener('abort', abort);
    void listener?.remove().catch(()=>{});
    if (error) { report(error.message==='TIMEOUT'?'timeout':'failed',error.message==='TIMEOUT'?'TIMEOUT':error.message==='INVALID_RESPONSE'?'INVALID_RESPONSE':'TRANSPORT_ERROR');controller.error(error); if (!responseStarted) rejectResponse(error); }
    else if (closeStream) controller.close();
    window.dispatchEvent(new Event('anzen-usage-changed'));
  }
  function abort() { finish(new DOMException('Aborted','AbortError')); void sdk.cancel({id}).catch(()=>{}); }
  signal.addEventListener('abort', abort, {once:true});
  const armDeadline = () => { clearTimeout(deadline);deadline=setTimeout(()=>{finish(new Error('TIMEOUT'));void sdk.cancel({id}).catch(()=>{});},35000); };
  armDeadline();
  const registering = sdk.addListener('response', event => {
    if (event.id !== id || finished) return;
    if (event.kind === 'headers') {
      stage='headers';status=event.status;report(status&&status<400?'ok':'failed',status&&status>=400?'REQUEST_REJECTED':undefined);armDeadline();
      responseStarted=true;
      resolveResponse(new Response(stream,{status:event.status,headers:event.headers}));
    } else if (event.kind === 'chunk' && event.data) {
      stage='stream';armDeadline();
      const bytes=Uint8Array.from(atob(event.data), c=>c.charCodeAt(0));
      const text=decoder.decode(bytes,{stream:true});
      const recent=tail+text;
      inspectEvents(text);
      tail=recent.slice(-4096);
      controller.enqueue(bytes);
    } else if (event.kind === 'end') {
      inspectEvents(decoder.decode());
      if (!responseStarted) finish(new Error('INVALID_RESPONSE'));
      else {
        if(status&&status>=400){
          let code:unknown;try{code=JSON.parse(tail)?.error?.code;}catch{}
          report('failed',diagnosticCodes.includes(code as typeof diagnosticCodes[number])?code as typeof diagnosticCodes[number]:'REQUEST_REJECTED');
        }else if(seenStreamError)report('failed','STREAM_ERROR');
        else if(!seenMeta)report('failed','INVALID_RESPONSE');
        else {stage='complete';report('ok');}
        finish();
      }
    } else if (event.kind === 'error') finish(new Error('Chat connection failed'));
  });
  void registering.then(handle=>{if(finished)void handle.remove().catch(()=>{});},()=>{});
  try {listener=await Promise.race([registering,response.then(()=>undefined)]);}
  catch(error){finish(error instanceof Error?error:new Error('Chat connection failed'));return response;}
  if(finished)return response;
  if (signal.aborted) abort();
  else {stage='start';void sdk.start({id,body,headers:Object.fromEntries(headers)}).catch(error=>finish(error instanceof Error?error:new Error('Chat connection failed')));}
  return response;
}
