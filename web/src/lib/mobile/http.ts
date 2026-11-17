import { identityPurchaseFailure } from './purchase-messages';
export const SITE_ORIGIN='https://www.anzen-ai-portal.jp';
export function mobileRateRejection(response:Response,stage:'auth_start'|'auth_exchange'){
  console.warn('[mobile-api]',JSON.stringify({stage,status:response.status,code:response.status===429?'RATE_LIMITED':'SHARED_STATE_UNAVAILABLE'}));
  return response;
}
export function json(data:unknown,status=200) {
  if(status>=400){
    const code=(data as {error?:{code?:unknown}})?.error?.code;
    console.warn('[mobile-api]',JSON.stringify({stage:'response',status,code:typeof code==='string'&&/^[A-Z_]{1,60}$/.test(code)?code:'REQUEST_REJECTED'}));
  }
  return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization, Cookie','Referrer-Policy':'no-referrer'}});
}
export async function member(request:Request) {
  // Native bearer sessions are CSRF-independent. Browser cookies require same-origin mutations.
  if(!['GET','HEAD'].includes(request.method) && !request.headers.get('authorization')?.startsWith('Bearer ') && request.headers.get('origin')!==new URL(request.url).origin) throw new Error('FORBIDDEN');
  const {auth}=await import('@/auth');const session=await auth({identityOnly:true});
  const id=(session?.user as {id?:string}|undefined)?.id;
  if(!id) throw new Error('UNAUTHORIZED');return id;
}
/** A native marker identifies the client, not a signed-in member. */
export function isNativeRequest(request:Request){return !!request.headers.get('authorization')?.startsWith('Bearer ') || request.headers.get('x-anzen-native')==='1';}
/** A supplied credential must be verified, never silently downgraded to a guest. */
export function isNativeGuestRequest(request:Request){return request.headers.get('x-anzen-native')==='1' && !request.headers.has('authorization');}
/** Signed-in browser member id, or null for an anonymous web visitor. */
export async function webMemberId():Promise<string|null>{const {auth}=await import('@/auth');const session=await auth({identityOnly:true});return (session?.user as {id?:string}|undefined)?.id ?? null;}
export function failure(error:unknown) {
  const identity = identityPurchaseFailure(error);
  if(identity)return json({error:{code:identity.code,message:identity.message}},identity.status);
  const code=error instanceof Error ? error.message:'';
  if(code==='PRO_SALES_PAUSED')return json({error:{code,message:'今月のPro新規受付は終了しました。来月1日に再開します。'}},503);
  const statuses:Record<string,number>={UNAUTHORIZED:401,FORBIDDEN:403,INVALID_REQUEST:400,AUTH_FLOW_EXPIRED:400,REAUTH_REQUIRED:401,DELETION_PENDING:409,PURCHASE_REVIEW_REQUIRED:409,ALREADY_SUBSCRIBED:409,PURCHASE_PENDING:409,PURCHASE_OWNED_BY_OTHER_ACCOUNT:409,LOCATION_LIMIT_REACHED:409,ENTITLEMENT_SYNC_PENDING:503,BILLING_RECONCILE_UNAVAILABLE:503,FEATURE_UNAVAILABLE:503};
  return json({error:{code:code in statuses?code:'UNAVAILABLE'}},statuses[code]??503);
}
