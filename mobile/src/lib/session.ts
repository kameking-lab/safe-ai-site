import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { SITE } from './api';
type VaultOptions={purpose?:'login'};
const vault=registerPlugin<{get(options?:VaultOptions):Promise<{value?:string}>;set(options:{value:string}&VaultOptions):Promise<void>;clear(options?:VaultOptions):Promise<void>}>('NativeVault');
let memoryToken:string|null=null;
let pendingLogin:string|null=null;
let loginDismissed=false;
const completing=new Map<string,Promise<boolean>>();
let initialized:Promise<void>|undefined;
let sessionMutations:Promise<unknown>=Promise.resolve();
let bindingRead:Promise<string>|undefined;
function serializeSession<T>(run:()=>Promise<T>):Promise<T>{const next=sessionMutations.then(run);sessionMutations=next.catch(()=>{});return next;}
// A persisted, non-secret incarnation changes on every login/logout, including the same member.
export function sessionBinding(){
  return bindingRead??=(async()=>{const key='anzen.session-incarnation';const stored=(await Preferences.get({key})).value;
    if(stored)return stored;
    const value=crypto.randomUUID();await Preferences.set({key,value});return value;
  })().catch(error=>{bindingRead=undefined;throw error;});
}
async function initializeVault(){
  initialized??=(async()=>{const key='anzen.install.session-initialized';if(!(await Preferences.get({key})).value){await vault.clear();await vault.clear({purpose:'login'});await Preferences.set({key,value:'1'});}})().catch(error=>{initialized=undefined;throw error;});
  return initialized;
}
async function readLogin(){if(!Capacitor.isNativePlatform())return pendingLogin;await initializeVault();return (await vault.get({purpose:'login'})).value??null;}
export async function hasPendingLogin(){const pending=await readLogin();const age=Date.now()-Number(pending?.split(':')[2]);return completing.size>0 || (!loginDismissed&&!!pending&&Number.isFinite(age)&&age>=0&&age<600000);}
// Keep the PKCE proof for a late callback, but let a dismissed browser be reopened.
export async function dismissLogin(){if(completing.size||!await readLogin()||completing.size)return;loginDismissed=true;window.dispatchEvent(new Event('anzen-login-dismissed'));}
async function writeLogin(value:string|null){if(Capacitor.isNativePlatform()){await initializeVault();if(value)await vault.set({purpose:'login',value});else await vault.clear({purpose:'login'});}pendingLogin=value;}
export async function sessionToken() {
  if(!Capacitor.isNativePlatform())return memoryToken;
  await initializeVault();
  return (await vault.get()).value??null;
}
async function writeSessionToken(token:string|null) {
  await sessionBinding();
  if(Capacitor.isNativePlatform())await initializeVault();
  const rotate=async()=>{const binding=crypto.randomUUID();await Preferences.set({key:'anzen.session-incarnation',value:binding});bindingRead=Promise.resolve(binding);};
  // Persist the new owner boundary BEFORE installing a login credential. A crash
  // between Keychain and Preferences must never leave B under A's erasure authority.
  if(token)await rotate();
  if(Capacitor.isNativePlatform()){if(token)await vault.set({value:token});else await vault.clear();}
  if(!token)await rotate();
  memoryToken=token;window.dispatchEvent(new Event('anzen-session-changed'));
}
export async function setSessionToken(token:string|null){return serializeSession(()=>writeSessionToken(token));}
export async function eraseSessionDataIfCurrent(binding:string,erase:()=>Promise<void>,completed:()=>Promise<void>){
  return serializeSession(async()=>{
    if(await sessionBinding()!==binding)return false;
    // Login cannot install another member's session while account data is being erased.
    await erase();await writeSessionToken(null);await writeLogin(null);await completed();return true;
  });
}
export class SiteApiError extends Error {
  constructor(readonly code:string,readonly status:number){super(code);this.name='SiteApiError';}
}
const reads=new Map<string,Promise<unknown>>();
export async function siteApi(path:string,body?:unknown,method?:string) {
  if(!/^\/api\/(?:mobile\/v1\/|me\/|billing\/|stripe\/portal$)/.test(path) || path.includes('..') || path.includes('://'))throw new Error('INVALID_ENDPOINT');
  // An unreadable Keychain is treated as signed out (server answers UNAUTHORIZED), never as a hard failure.
  const token=await sessionToken().catch(()=>null);
  const key=JSON.stringify([path,token]);
  if(!body && (!method||method==='GET')){
    const pending=reads.get(key);if(pending)return pending;
    const work=sendSiteApi(path,body,method,token);reads.set(key,work);
    try{return await work;}finally{if(reads.get(key)===work)reads.delete(key);}
  }
  return sendSiteApi(path,body,method,token);
}
async function sendSiteApi(path:string,body:unknown,method:string|undefined,token:string|null){
  const headers={Accept:'application/json','Content-Type':'application/json',Origin:SITE,...(token?{Authorization:`Bearer ${token}`}:{})};
  let status:number,data:unknown;
  if(Capacitor.isNativePlatform()){
    const r=await CapacitorHttp.request({url:SITE+path,method:method??(body?'POST':'GET'),headers,...(body?{data:body}:{}),responseType:'json',disableRedirects:true,connectTimeout:15000,readTimeout:25000});
    if(new URL(r.url).origin!==SITE)throw new Error('INVALID_ENDPOINT');status=r.status;data=r.data;
  }else{
    const r=await fetch(SITE+path,{method:method??(body?'POST':'GET'),headers,...(body?{body:JSON.stringify(body)}:{}),credentials:'include',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25000)});status=r.status;data=await r.json().catch(()=>null);
  }
  if(status<200 || status>=300){const code=(data as {error?:{code?:string}})?.error?.code;throw new SiteApiError(typeof code==='string'&&/^[A-Z_]{1,60}$/.test(code)?code:'UNAVAILABLE',status);}
  if(!data||typeof data!=='object')throw new SiteApiError('UNEXPECTED_RESPONSE',status);
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
  loginDismissed=false;
  window.dispatchEvent(new Event('anzen-login-started'));
  try{await Browser.open({url:result.authorizeUrl});}catch(error){loginDismissed=true;await writeLogin(null);window.dispatchEvent(new Event('anzen-login-failed'));throw error;}
}
export async function completeLogin(value:string) {
  let url:URL;try{url=new URL(value);}catch{return false;}
  if(url.protocol!=='anzenai:' || url.hostname!=='auth' || url.pathname!=='/callback' || url.username || url.password || url.port)return false;
  const flow=url.searchParams.get('flow')??'';const code=url.searchParams.get('code')??'';
  if(!/^[0-9a-f-]{36}$/.test(flow) || !/^[A-Za-z0-9_-]{43}$/.test(code))throw new Error('AUTH_FLOW_EXPIRED');
  const active=completing.get(flow);if(active)return active;
  let started=false;
  const task=(async()=>{
    const pending=await readLogin();if(!pending)return false;
    started=true;
    const [expected,verifier,createdAt]=pending.split(':');
    if(expected!==flow)throw new Error('AUTH_FLOW_EXPIRED');
    const age=Date.now()-Number(createdAt);
    if(!/^[A-Za-z0-9_-]{43}$/.test(verifier) || !Number.isFinite(age) || age<0 || age>=600000){await writeLogin(null);throw new Error('AUTH_FLOW_EXPIRED');}
    loginDismissed=false;window.dispatchEvent(new Event('anzen-login-started'));
    const result=await siteApi('/api/mobile/v1/auth/exchange',{flow,code,verifier}) as {token:string};
    if(!/^[A-Za-z0-9_-]{43}$/.test(result.token))throw new Error('AUTH_FLOW_EXPIRED');
    await setSessionToken(result.token);await writeLogin(null);await Browser.close().catch(()=>{});return true;
  })();
  completing.set(flow,task);
  try{return await task;}catch(error){
    if(started){loginDismissed=true;window.dispatchEvent(new Event('anzen-login-failed'));}
    throw error;
  }finally{completing.delete(flow);}
}
export async function logout() {
  // Revoke the server device/session before deleting the local credential.
  await siteApi('/api/mobile/v1/auth/logout',{});await setSessionToken(null);await writeLogin(null);
}
export async function forgetLocalSession(){await setSessionToken(null);await writeLogin(null);}
