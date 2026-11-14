import {Capacitor,CapacitorHttp} from '@capacitor/core';
import {SITE} from './api';

export type DiagnosticOperation='configure'|'logIn'|'logOut'|'getCustomerInfo'|'invalidateCustomerInfoCache'|'getOfferings'|'restorePurchases'|'purchasePackage'|'identity_queue'|'sdk_identity_queue'|'config'|'entitlement'|'reconcile'|'recovery'|'login'|'exchange'|'logout'|'session'|'store_request'|'buttons';
type Diagnostic={operation:DiagnosticOperation;result:'start'|'ok'|'failed'|'timeout'|'state';elapsedMs?:number;plan?:'free'|'pro';reason?:'enabled'|'login'|'purchase'|'restore'|'sync'|'refresh'|'member_required'|'price_required'|'server_pending'|'store_unavailable'};
let windowStart=0;let sent=0;let traceId:string|undefined;
// Fixed fields only. No credentials, account/store identifiers, URLs, or error messages.
export function billingDiagnostic(event:Diagnostic){
 if(typeof window==='undefined'||!Capacitor.isNativePlatform())return;
 const now=Date.now();if(now-windowStart>=60000){windowStart=now;sent=0;}if(sent>=60||sent>=40&&!['failed','timeout'].includes(event.result))return;sent++;
 const data={version:1,traceId:traceId??=crypto.randomUUID(),sequence:sent,...event};
 const url=SITE+'/api/mobile/v1/diagnostics';
 let timer:ReturnType<typeof setTimeout>|undefined;
 void Promise.race([CapacitorHttp.request({url,method:'POST',headers:{'Content-Type':'application/json',Origin:SITE},data,responseType:'json',connectTimeout:2000,readTimeout:2000}),new Promise(resolve=>{timer=setTimeout(resolve,2500);})]).catch(()=>{}).finally(()=>clearTimeout(timer));
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
