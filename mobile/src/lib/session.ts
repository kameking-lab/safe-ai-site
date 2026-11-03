import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { SITE } from './api';
type VaultOptions={purpose?:'login'};
const vault=registerPlugin<{get(options?:VaultOptions):Promise<{value?:string}>;set(options:{value:string}&VaultOptions):Promise<void>;clear(options?:VaultOptions):Promise<void>}>('NativeVault');
let memoryToken:string|null=null;
let pendingLogin:string|null=null;
const completing=new Map<string,Promise<boolean>>();
let initialized:Promise<void>|undefined;
async function initializeVault(){
  initialized??=(async()=>{const key='anzen.install.session-initialized';if(!(await Preferences.get({key})).value){await vault.clear();await vault.clear({purpose:'login'});await Preferences.set({key,value:'1'});}})().catch(error=>{initialized=undefined;throw error;});
  return initialized;
}
async function readLogin(){if(!Capacitor.isNativePlatform())return pendingLogin;await initializeVault();return (await vault.get({purpose:'login'})).value??null;}
async function writeLogin(value:string|null){if(Capacitor.isNativePlatform()){await initializeVault();if(value)await vault.set({purpose:'login',value});else await vault.clear({purpose:'login'});}pendingLogin=value;}
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
  // Persist PKCE in Keychain before leaving the app. iOS may evict the process during OAuth.
  await writeLogin(`${result.flow}:${verifier}:${Date.now()}`);
  try{await Browser.open({url:result.authorizeUrl});}catch(error){await writeLogin(null);throw error;}
}
export async function completeLogin(value:string) {
  let url:URL;try{url=new URL(value);}catch{return false;}
  if(url.protocol!=='anzenai:' || url.hostname!=='auth' || url.pathname!=='/callback' || url.username || url.password || url.port)return false;
  const flow=url.searchParams.get('flow')??'';const code=url.searchParams.get('code')??'';
  if(!/^[0-9a-f-]{36}$/.test(flow) || !/^[A-Za-z0-9_-]{43}$/.test(code))throw new Error('AUTH_FLOW_EXPIRED');
  const active=completing.get(flow);if(active)return active;
  const task=(async()=>{
    const pending=await readLogin();if(!pending)return false;
    const [expected,verifier,createdAt]=pending.split(':');
    if(expected!==flow)throw new Error('AUTH_FLOW_EXPIRED');
    const age=Date.now()-Number(createdAt);
    if(!/^[A-Za-z0-9_-]{43}$/.test(verifier) || !Number.isFinite(age) || age<0 || age>=600000){await writeLogin(null);throw new Error('AUTH_FLOW_EXPIRED');}
    const result=await siteApi('/api/mobile/v1/auth/exchange',{flow,code,verifier}) as {token:string};
    if(!/^[A-Za-z0-9_-]{43}$/.test(result.token))throw new Error('AUTH_FLOW_EXPIRED');
    await setSessionToken(result.token);await writeLogin(null);await Browser.close().catch(()=>{});return true;
  })();
  completing.set(flow,task);
  try{return await task;}finally{completing.delete(flow);}
}
export async function logout() {
  // Revoke the server device/session before deleting the local credential.
  await siteApi('/api/mobile/v1/auth/logout',{});await setSessionToken(null);await writeLogin(null);
}
