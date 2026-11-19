import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { boundedPreferences as Preferences,storageBoundary } from './bounded-storage';
import { SITE } from './api';
import { invalidateMemberReads, memberGeneration, suspendMemberReads } from './member-generation';
import {bounded,billingDiagnostic} from './billing-diagnostics';
type VaultOptions={purpose?:'login'};
const nativeVault=registerPlugin<{get(options?:VaultOptions):Promise<{value?:string}>;set(options:{value:string}&VaultOptions):Promise<void>;clear(options?:VaultOptions):Promise<void>}>('NativeVault');
const vaultBoundary=storageBoundary();
const vault={
  get:(options?:VaultOptions)=>vaultBoundary.read(()=>nativeVault.get(options)),
  set:(options:{value:string}&VaultOptions)=>vaultBoundary.write(()=>nativeVault.set(options)),
  clear:(options?:VaultOptions)=>vaultBoundary.write(()=>nativeVault.clear(options)),
};
let memoryToken:string|null=null;
// Keychain is read once per JS session, not before every API call. Successful
// writes already give us the credential; rereading it during iOS activation can
// fail transiently and used to turn a signed-in chat into an anonymous request.
let cachedToken:string|null|undefined;
let tokenRead:Promise<string|null>|undefined;
let tokenEpoch=0;
let tokenWrite:Promise<unknown>=Promise.resolve();
// App Store purchases do not require registration (App Review 5.1.1(v)). A purchase or restore
// without a login runs under a server guest session that has no personal data. The flag is not a
// secret: it only decides whether the UI still offers sign-in, and the server re-checks it.
const GUEST_KEY='anzen.session-guest';
let cachedGuest:boolean|undefined;
let guestStart:Promise<string>|undefined;
let pendingLogin:string|null=null;
let loginDismissed=false;
const completing=new Map<string,Promise<boolean>>();
// A saved PKCE proof or an open browser must not disable the sign-in button.
export const isLoginExchanging=()=>completing.size>0;
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
export async function sessionToken():Promise<string|null> {
  if(!Capacitor.isNativePlatform())return memoryToken;
  await tokenWrite;
  if(cachedToken!==undefined)return cachedToken;
  if(tokenRead)return tokenRead;
  const epoch=tokenEpoch;
  const read:Promise<string|null>=(async()=>{
    await initializeVault();
    // Retry the read only. No network request or chat is replayed.
    let value:string|null;
    try{value=(await vault.get()).value??null;}
    catch(error){if((error as {code?:string}).code==='UNIMPLEMENTED')throw error;await new Promise(resolve=>setTimeout(resolve,100));value=(await vault.get()).value??null;}
    if(epoch!==tokenEpoch)return sessionToken();
    cachedToken=value;return value;
  })();
  tokenRead=read;
  try{return await read;}finally{if(tokenRead===read)tokenRead=undefined;}
}
async function writeSessionToken(token:string|null,guest=false) {
  invalidateMemberReads();
  await sessionBinding();
  if(Capacitor.isNativePlatform())await initializeVault();
  const rotate=async()=>{const binding=crypto.randomUUID();await Preferences.set({key:'anzen.session-incarnation',value:binding});bindingRead=Promise.resolve(binding);};
  // Persist the new owner boundary BEFORE installing a login credential. A crash
  // between Keychain and Preferences must never leave B under A's erasure authority.
  if(token)await rotate();
  cachedGuest=undefined;
  await Preferences.set({key:GUEST_KEY,value:token&&guest?'1':'0'});
  if(Capacitor.isNativePlatform()){if(token)await vault.set({value:token});else await vault.clear();}
  if(!token)await rotate();
  invalidateMemberReads();
  memoryToken=token;cachedToken=token;cachedGuest=!!token&&guest;window.dispatchEvent(new CustomEvent('anzen-session-changed',{detail:{signedIn:!!token,guest:!!token&&guest}}));
}
export async function setSessionToken(token:string|null,options:{guest?:boolean}={}){
  invalidateMemberReads();tokenEpoch++;cachedToken=undefined;tokenRead=undefined;
  const work=serializeSession(()=>writeSessionToken(token,!!options.guest));tokenWrite=work.catch(()=>{});return work;
}
async function guestFlag(){
  if(cachedGuest!==undefined)return cachedGuest;
  return cachedGuest=(await Preferences.get({key:GUEST_KEY})).value==='1';
}
/** True while the app uses a guest session: Pro works, and the UI keeps offering sign-in. */
export async function isGuestSession(){return !!await sessionToken() && await guestFlag();}
/**
 * Purchase and restore never ask for registration first. Without a session, create a guest
 * session (no name, email or sign-in) and continue. Concurrent callers share one request.
 */
export function ensureSession():Promise<string>{
  return guestStart??=(async()=>{
    const existing=await sessionToken();if(existing)return existing;
    const result=await siteApi('/api/mobile/v1/auth/guest',{anonymousStoreIdentity:true}) as {token?:unknown;guest?:unknown};
    if(typeof result.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(result.token)||result.guest!==true)throw new SiteApiError('UNEXPECTED_RESPONSE',200);
    // A sign-in that completed meanwhile wins over the new guest.
    const signedIn=await sessionToken();if(signedIn)return signedIn;
    await setSessionToken(result.token,{guest:true});return result.token;
  })().finally(()=>{guestStart=undefined;});
}
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
let readGeneration=0;
export async function siteApi(path:string,body?:unknown,method?:string) {
  if(!/^\/api\/(?:mobile\/v1\/|me\/|billing\/|stripe\/portal$)/.test(path) || path.includes('..') || path.includes('://'))throw new Error('INVALID_ENDPOINT');
  const reading=!body&&(!method||method==='GET');
  if(!reading)readGeneration++;
  const generation=JSON.stringify([memberGeneration(),readGeneration]);
  // Authentication bootstrap is public. Member APIs must not silently lose an
  // existing credential when secure storage is temporarily unavailable.
  const bootstrap=/^\/api\/mobile\/v1\/(?:auth\/(?:start|exchange|guest)|billing\/config)$/.test(path);
  const token=bootstrap?null:await bounded('session',()=>sessionToken());
  const key=JSON.stringify([path,token,generation]);
  if(reading){
    const pending=reads.get(key);if(pending)return pending;
    const work=bounded('store_request',()=>sendSiteApi(path,body,method,token));reads.set(key,work);
    try{return await work;}finally{if(reads.get(key)===work)reads.delete(key);}
  }
  try{return await bounded('store_request',()=>sendSiteApi(path,body,method,token));}finally{readGeneration++;}
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
  billingDiagnostic({operation:'login',result:'start'});
  const bytes=crypto.getRandomValues(new Uint8Array(32));const verifier=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
  const challenge=btoa(String.fromCharCode(...hash)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const result=await siteApi('/api/mobile/v1/auth/start',{challenge}) as {flow:string;authorizeUrl:string};
  if(!/^[0-9a-f-]{36}$/.test(result.flow) || result.authorizeUrl!==`${SITE}/api/mobile/v1/auth/authorize?flow=${result.flow}`)throw new Error('INVALID_ENDPOINT');
  // Persist PKCE in Keychain before leaving the app. iOS may evict the process during OAuth.
  await serializeSession(()=>writeLogin(`${result.flow}:${verifier}:${Date.now()}`));
  loginDismissed=false;
  window.dispatchEvent(new Event('anzen-login-started'));
  try{await bounded('login',()=>Browser.open({url:result.authorizeUrl}));}catch(error){loginDismissed=true;await writeLogin(null);window.dispatchEvent(new Event('anzen-login-failed'));throw error;}
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
    loginDismissed=false;window.dispatchEvent(new Event('anzen-login-exchanging'));
    // Signing in after buying as a guest hands the guest's purchase over to the member.
    const guestToken=await guestFlag().then(guest=>guest?sessionToken():null);
    const result=await bounded('exchange',()=>siteApi('/api/mobile/v1/auth/exchange',{flow,code,verifier,...(guestToken?{guestToken}:{})})) as {token:string;restoreRecommended?:boolean};
    if(!/^[A-Za-z0-9_-]{43}$/.test(result.token))throw new Error('AUTH_FLOW_EXPIRED');
    await setSessionToken(result.token);await writeLogin(null);void bounded('login',()=>Browser.close()).catch(()=>{});
    // Login succeeded even if a provider is temporarily offline. Resume retries at app activation.
    billingDiagnostic({operation:'login',result:'ok'});
    const {billing}=await import('./billing');
    // The member already had a store identity: restoring moves the guest's App Store purchase.
    if(result.restoreRecommended===true)void billing.config().then(config=>billing.restore(config)).catch(()=>billing.recoverSession()).catch(()=>{});
    else void billing.recoverSession().catch(()=>{});
    return true;
  })();
  completing.set(flow,task);
  try{return await task;}catch(error){
    // Reading the saved proof can fail before exchange starts. Clear any UI
    // exchange state set by an app-activation event during that read as well.
    loginDismissed=true;window.dispatchEvent(new Event('anzen-login-failed'));
    billingDiagnostic({operation:'login',result:'failed'});
    throw error;
  }finally{completing.delete(flow);}
}
export async function logout() {
  const resume=suspendMemberReads();
  const credential=sessionToken();
  // Serialize the bounded server revocation and credential removal together.
  // A new login/PKCE write queues AFTER this logout; a late response cannot
  // erase its credential/proof. Native store logout remains detached.
  return serializeSession(async()=>{
    try{
      await bounded('store_request',async()=>sendSiteApi('/api/mobile/v1/auth/logout',{},'POST',await credential));
      tokenEpoch++;cachedToken=undefined;tokenRead=undefined;
      await writeSessionToken(null);await writeLogin(null);
      const {billing}=await import('./billing');void billing.forget().catch(()=>{});
      billingDiagnostic({operation:'logout',result:'ok'});
    }finally{resume();}
  });
}
export async function forgetLocalSession(){await setSessionToken(null);await writeLogin(null);}
