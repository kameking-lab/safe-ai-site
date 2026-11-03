import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { SITE } from './api';
const vault=registerPlugin<{get():Promise<{value?:string}>;set(options:{value:string}):Promise<void>;clear():Promise<void>}>('NativeVault');
let memoryToken:string|null=null;
const pkce=new Map<string,string>();
let initialized:Promise<void>|undefined;
async function initializeVault(){
  initialized??=(async()=>{const key='anzen.install.session-initialized';if(!(await Preferences.get({key})).value){await vault.clear();await Preferences.set({key,value:'1'});}})();
  return initialized;
}
export async function sessionToken() {
  if(!Capacitor.isNativePlatform())return memoryToken;
  await initializeVault();
  return (await vault.get()).value??null;
}
export async function setSessionToken(token:string|null) {
  if(Capacitor.isNativePlatform()) {await initializeVault();if(token)await vault.set({value:token});else await vault.clear();}
  memoryToken=token;window.dispatchEvent(new Event('anzen-session-changed'));
}
export async function siteApi(path:string,body?:unknown,method?:string) {
  if(!/^\/api\/(?:mobile\/v1\/|me\/|billing\/|stripe\/portal$)/.test(path) || path.includes('..') || path.includes('://'))throw new Error('INVALID_ENDPOINT');
  const token=await sessionToken();
  const headers={Accept:'application/json','Content-Type':'application/json',Origin:SITE,...(token?{Authorization:`Bearer ${token}`}:{})};
  let status:number,data:unknown;
  if(Capacitor.isNativePlatform()){
    const r=await CapacitorHttp.request({url:SITE+path,method:method??(body?'POST':'GET'),headers,...(body?{data:body}:{}),responseType:'json',disableRedirects:true,connectTimeout:15000,readTimeout:25000});
    if(new URL(r.url).origin!==SITE)throw new Error('INVALID_ENDPOINT');status=r.status;data=r.data;
  }else{
    const r=await fetch(SITE+path,{method:method??(body?'POST':'GET'),headers,...(body?{body:JSON.stringify(body)}:{}),credentials:'include',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25000)});status=r.status;data=await r.json();
  }
  if(status<200 || status>=300){const code=(data as {error?:{code?:string}})?.error?.code;throw new Error(code??'UNAVAILABLE');}
  return data;
}
export async function startLogin() {
  const bytes=crypto.getRandomValues(new Uint8Array(32));const verifier=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
  const challenge=btoa(String.fromCharCode(...hash)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const result=await siteApi('/api/mobile/v1/auth/start',{challenge}) as {flow:string;authorizeUrl:string};
  if(!/^[0-9a-f-]{36}$/.test(result.flow) || result.authorizeUrl!==`${SITE}/api/mobile/v1/auth/authorize?flow=${result.flow}`)throw new Error('INVALID_ENDPOINT');
  pkce.set(result.flow,verifier);
  await Browser.open({url:result.authorizeUrl});
}
export async function completeLogin(value:string) {
  const url=new URL(value);if(url.protocol!=='anzenai:' || url.hostname!=='auth' || url.pathname!=='/callback')return false;
  const flow=url.searchParams.get('flow')??'';const code=url.searchParams.get('code')??'';const verifier=pkce.get(flow);
  if(!verifier || !/^[A-Za-z0-9_-]{43}$/.test(code))throw new Error('AUTH_FLOW_EXPIRED');
  pkce.delete(flow);
  const result=await siteApi('/api/mobile/v1/auth/exchange',{flow,code,verifier}) as {token:string};
  if(!/^[A-Za-z0-9_-]{43}$/.test(result.token))throw new Error('AUTH_FLOW_EXPIRED');
  await setSessionToken(result.token);await Browser.close().catch(()=>{});return true;
}
export async function logout() {
  // Revoke the server device/session before deleting the local credential.
  await siteApi('/api/mobile/v1/auth/logout',{});await setSessionToken(null);
}
