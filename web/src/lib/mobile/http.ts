export const SITE_ORIGIN='https://www.anzen-ai-portal.jp';
export function json(data:unknown,status=200) {return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization, Cookie','Referrer-Policy':'no-referrer'}});}
export async function member(request:Request) {
  // Native bearer sessions are CSRF-independent. Browser cookies require same-origin mutations.
  if(!['GET','HEAD'].includes(request.method) && !request.headers.get('authorization')?.startsWith('Bearer ') && request.headers.get('origin')!==new URL(request.url).origin) throw new Error('FORBIDDEN');
  const {auth}=await import('@/auth');const session=await auth();
  const id=(session?.user as {id?:string}|undefined)?.id;
  if(!id) throw new Error('UNAUTHORIZED');return id;
}
export function failure(error:unknown) {
  const code=error instanceof Error ? error.message:'';
  const statuses:Record<string,number>={UNAUTHORIZED:401,FORBIDDEN:403,INVALID_REQUEST:400,AUTH_FLOW_EXPIRED:400,REAUTH_REQUIRED:401,DELETION_PENDING:409,PURCHASE_REVIEW_REQUIRED:409,ALREADY_SUBSCRIBED:409,PURCHASE_PENDING:409,PURCHASE_OWNED_BY_OTHER_ACCOUNT:409,LOCATION_LIMIT_REACHED:409,ENTITLEMENT_SYNC_PENDING:503,FEATURE_UNAVAILABLE:503};
  return json({error:{code:code in statuses?code:'UNAVAILABLE'}},statuses[code]??503);
}
