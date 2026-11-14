import {Capacitor,CapacitorHttp} from '@capacitor/core';
import {SITE} from './api';

export type DiagnosticOperation='configure'|'logIn'|'logOut'|'getCustomerInfo'|'invalidateCustomerInfoCache'|'getOfferings'|'restorePurchases'|'purchasePackage'|'identity_queue'|'sdk_identity_queue'|'config'|'entitlement'|'reconcile'|'recovery'|'login'|'exchange'|'logout'|'session'|'store_request'|'buttons'|'chat';
export const diagnosticCodes=['UNAUTHORIZED','FORBIDDEN','INVALID_REQUEST','OPERATION_PENDING','OPERATION_RELEASED','DAILY_LIMIT_REACHED','BURST_LIMITED','ENTITLEMENT_SYNC_PENDING','AI_BUDGET_STOPPED','AI_BUDGET_FREE_PAUSED','CONSENT_REQUIRED','SAFETY_BLOCKED','TRANSPORT_ERROR','TIMEOUT','INVALID_RESPONSE','STREAM_ERROR','REQUEST_REJECTED'] as const;
type Diagnostic={operation:DiagnosticOperation;result:'start'|'ok'|'failed'|'timeout'|'state';elapsedMs?:number;plan?:'free'|'pro';reason?:'enabled'|'login'|'purchase'|'restore'|'sync'|'refresh'|'member_required'|'price_required'|'server_pending'|'store_unavailable';stage?:'session'|'listener'|'start'|'headers'|'stream'|'complete';httpStatus?:number;code?:typeof diagnosticCodes[number]};
let windowStart=0;let sent=0;let traceId:string|undefined;
// Fixed fields only. No credentials, account/store identifiers, URLs, or error messages.
export function billingDiagnostic(event:Diagnostic){
 if(typeof window==='undefined'||!Capacitor.isNativePlatform())return;
 const now=Date.now();if(now-windowStart>=60000){windowStart=now;sent=0;}if(sent>=60||sent>=40&&!['failed','timeout'].includes(event.result))return;sent++;
 const data={version:1,traceId:traceId??=crypto.randomUUID(),sequence:sent,...event};
 const url=SITE+'/api/mobile/v1/diagnostics';
 // A two-second cold-start deadline silently dropped every failed delivery.
 // Retry transient failures once and expose only fixed delivery metadata locally.
 void deliver();
 async function deliver(){
  for(let attempt=0;attempt<2;attempt++){
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    const response=await Promise.race([CapacitorHttp.request({url,method:'POST',headers:{'Content-Type':'application/json',Origin:SITE,'X-Anzen-Native':'1'},data,responseType:'json',disableRedirects:true,connectTimeout:8000,readTimeout:8000}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('TIMEOUT')),8500);})]);
    if(response.status===200 && response.data?.ok===true && new URL(response.url).origin===SITE)return;
    console.warn('[mobile-diagnostic-delivery]',JSON.stringify({attempt:attempt+1,status:response.status}));
    if(response.status>=400&&response.status<500&&response.status!==408&&response.status!==429)return;
   }catch{console.warn('[mobile-diagnostic-delivery]',JSON.stringify({attempt:attempt+1,code:'TRANSPORT_ERROR'}));}
   finally{clearTimeout(timer);}
  }
 }
}
export class OperationTimeoutError extends Error{constructor(){super('OPERATION_TIMEOUT');}}
export async function bounded<T>(operation:DiagnosticOperation,run:()=>Promise<T>,ms=8000):Promise<T>{
 const started=Date.now();billingDiagnostic({operation,result:'start'});
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const value=await Promise.race([run(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new OperationTimeoutError()),ms);})]);
  billingDiagnostic({operation,result:'ok',elapsedMs:Date.now()-started});return value;
 }catch(error){billingDiagnostic({operation,result:error instanceof OperationTimeoutError?'timeout':'failed',elapsedMs:Date.now()-started});throw error;}
 finally{clearTimeout(timer);}
}
