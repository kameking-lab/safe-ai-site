import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { SITE } from './api';
import { sessionToken } from './session';
import { installNativeDownloads } from './native-download';
import { installNativeSpeech } from './native-speech';
import { PushNotifications } from '@capacitor/push-notifications';
import { signageLocations } from '@/data/signage-locations';
let installed=false;
export function createSiteFetch(original:typeof fetch):typeof fetch {
  return async (input, init) => {
    const req = new Request(input instanceof Request ? input : new URL(input, location.href), init);
    const url = new URL(req.url);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return original(input, init);
    const target = SITE + url.pathname + url.search;
    if (!Capacitor.isNativePlatform()) return original(new Request(target, req), { credentials:'include', redirect:'error' });
    if (req.signal.aborted) throw new DOMException('Aborted','AbortError');
    // Keychain failure: continue anonymously so shared pages and public APIs keep working.
    const token=await sessionToken().catch(()=>null);
    const headers=new Headers(req.headers);
    headers.set('Origin',SITE);headers.set('X-Anzen-Native','1');
    headers.delete('Authorization');
    if(token)headers.set('Authorization',`Bearer ${token}`);
    if(!['GET','HEAD'].includes(req.method) && !headers.has('X-Operation-ID'))headers.set('X-Operation-ID',crypto.randomUUID());
    let body:unknown=undefined;let dataType:'formData'|undefined;
    if(!['GET','HEAD'].includes(req.method)) {
      if(req.headers.get('content-type')?.includes('multipart/form-data')){
        const parts=await req.formData();const fields=[];
        for(const [key,value] of parts){if(typeof value==='string')fields.push({key,value,type:'string'});else{const bytes=new Uint8Array(await value.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));fields.push({key,value:btoa(binary),type:'base64File',contentType:value.type,fileName:value.name});}}
        body=fields;dataType='formData';
      }else body=await req.text();
    }
    const r = await CapacitorHttp.request({ url:target, method:req.method, headers:Object.fromEntries(headers), data:body, ...(dataType?{dataType}:{}), responseType:'arraybuffer', disableRedirects:true, connectTimeout:15000, readTimeout:60000 });
    if (new URL(r.url).origin !== SITE) throw new Error('Redirect refused');
    if (req.signal.aborted) throw new DOMException('Aborted','AbortError');
    if(['/api/chatbot','/api/chatbot/stream','/api/chat'].includes(url.pathname))window.dispatchEvent(new Event('anzen-usage-changed'));
    const contentType=Object.entries(r.headers).find(([k])=>k.toLowerCase()==='content-type')?.[1]?.toLowerCase()??'';
    const payload=contentType.includes('application/json')?JSON.stringify(r.data):Uint8Array.from(atob(String(r.data)),c=>c.charCodeAt(0));
    return new Response([204,205,304].includes(r.status)||req.method==='HEAD'?null:payload, { status:r.status, headers:r.headers });
  };
}
/** Canonical components keep their existing API paths and safety checks. No provider API in iOS. */
export function installWebTransport() {
  if(installed)return()=>{};installed=true;
  installNativeDownloads();
  installNativeSpeech();
  if(Capacitor.getPlatform()==='ios')void PushNotifications.addListener('pushNotificationActionPerformed',event=>{const id=event.notification.data?.locationId;if(signageLocations.some(l=>l.id===id))window.location.assign(`/notifications/?locationId=${encodeURIComponent(id)}`);});
  for(const method of ['pushState','replaceState'] as const){const original=window.history[method].bind(window.history);window.history[method]=(...args:Parameters<History[typeof method]>)=>{Reflect.apply(original,window.history,args);window.dispatchEvent(new Event('anzen-navigation'));};}
  if(Capacitor.getPlatform()==='ios'){
    const documents=registerPlugin<{printPage(options:{title:string}):Promise<{completed:boolean}>}>('NativeDocuments');
    window.print=()=>{window.dispatchEvent(new Event('beforeprint'));void documents.printPage({title:document.title}).catch(()=>window.dispatchEvent(new CustomEvent('anzen-native-error',{detail:'印刷画面を開けませんでした。'}))).finally(()=>window.dispatchEvent(new Event('afterprint')));};
  }
  const original = window.fetch.bind(window);
  window.fetch = createSiteFetch(original);
  return () => {};
}
if(typeof window!=='undefined')installWebTransport();
