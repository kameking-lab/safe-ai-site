import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

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
  let resolveResponse!: (response: Response) => void;
  let rejectResponse!: (error: Error) => void;
  const response = new Promise<Response>((resolve, reject) => { resolveResponse=resolve; rejectResponse=reject; });
  const stream = new ReadableStream<Uint8Array>({
    start(value) { controller=value; },
    cancel() { finish(undefined, false); void sdk.cancel({id}).catch(()=>{}); },
  });
  function finish(error?: Error, closeStream = true) {
    if (finished) return;
    finished=true;
    signal.removeEventListener('abort', abort);
    void listener?.remove().catch(()=>{});
    if (error) { controller.error(error); if (!responseStarted) rejectResponse(error); }
    else if (closeStream) controller.close();
    window.dispatchEvent(new Event('anzen-usage-changed'));
  }
  function abort() { finish(new DOMException('Aborted','AbortError')); void sdk.cancel({id}).catch(()=>{}); }
  const listener = await sdk.addListener('response', event => {
    if (event.id !== id || finished) return;
    if (event.kind === 'headers') {
      responseStarted=true;
      resolveResponse(new Response(stream,{status:event.status,headers:event.headers}));
    } else if (event.kind === 'chunk' && event.data) {
      controller.enqueue(Uint8Array.from(atob(event.data), c=>c.charCodeAt(0)));
    } else if (event.kind === 'end') {
      if (!responseStarted) finish(new Error('Missing response headers'));
      else finish();
    } else if (event.kind === 'error') finish(new Error('Chat connection failed'));
  });
  signal.addEventListener('abort', abort, {once:true});
  if (signal.aborted) abort();
  else void sdk.start({id,body,headers:Object.fromEntries(headers)}).catch(error=>finish(error instanceof Error?error:new Error('Chat connection failed')));
  return response;
}
