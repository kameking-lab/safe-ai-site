import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { product } from './entitlement';
import { externalCredentialedServicesAllowed } from '../server/deployment-safety';
export const eventSchema = z.object({ event:z.object({ id:z.string().min(1).max(200), app_user_id:z.string().max(200).optional(),
  transferred_from:z.array(z.string().max(200)).max(100).optional(),transferred_to:z.array(z.string().max(200)).max(100).optional(),
  type:z.string().min(1).max(80), event_timestamp_ms:z.number().int().positive(), environment:z.enum(['PRODUCTION','SANDBOX']).optional() }) });
const equal = (a:string,b:string) => { const x=Buffer.from(a);const y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y); };
export function verifyWebhook(raw:string, auth:string|null, signature:string|null, config:{authorization?:string; signingSecret?:string}, now=Date.now()) {
  if (!config.authorization || !auth || !equal(auth,config.authorization)) return false;
  if (!config.signingSecret) return true;
  const match = /^t=(\d+),v1=([a-f0-9]{64})$/.exec(signature ?? '');
  return !!match && Math.abs(now/1000-Number(match[1]))<=300 && equal(match[2],createHmac('sha256',config.signingSecret).update(`${match[1]}.${raw}`).digest('hex'));
}
const date = z.string().datetime({ offset:true }).nullable();
export const subscriberSchema = z.object({ subscriber:z.object({
  entitlements:z.record(z.string(),z.object({ product_identifier:z.string(), expires_date:date, purchase_date:z.string() })),
  subscriptions:z.record(z.string(),z.object({ store:z.string(), is_sandbox:z.boolean(), expires_date:date,
    grace_period_expires_date:date.optional(), original_purchase_date:z.string(), store_transaction_id:z.union([z.string(),z.number().int().safe()]).optional(), refunded_at:date.optional() }))
}) });
export function verifiedAppleGrant(raw:unknown, expectedProduct:string, now=new Date(),environment:'PRODUCTION'|'SANDBOX'='PRODUCTION') {
  const {subscriber}=subscriberSchema.parse(raw);
  const entitlement=subscriber.entitlements[product.entitlement];
  if (!entitlement || entitlement.product_identifier!==expectedProduct || !entitlement.expires_date) return null;
  const sub=subscriber.subscriptions[expectedProduct];
  if (!sub || sub.store!=='app_store' || sub.is_sandbox!==(environment==='SANDBOX') || sub.refunded_at || !sub.expires_date) return null;
  // Grace must be explicitly provided by the store. Billing retry alone never extends access.
  const grace=sub.grace_period_expires_date ? Date.parse(sub.grace_period_expires_date):0;
  const expiresAt=new Date(Math.min(Math.max(Date.parse(sub.expires_date),grace),Math.max(Date.parse(entitlement.expires_date),grace)));
  if (!(expiresAt>now)) return null;
  // v1 store_transaction_id identifies the latest renewal, not the subscription owner.
  return { productId:expectedProduct, expiresAt };
}
const subscriptionListSchema=z.object({items:z.array(z.object({
  customer_id:z.string(),original_customer_id:z.string(),product_id:z.string().nullable(),
  store:z.string(),environment:z.enum(['production','sandbox']),gives_access:z.boolean(),
  store_subscription_identifier:z.union([z.string().min(1),z.number().int().safe().positive()]),
})),next_page:z.string().nullable().optional()});
/** Resolve the stable App Store subscription ID using the authenticated v2 API. */
export async function fetchAppleOwnership(appUserId:string,environment:'PRODUCTION'|'SANDBOX',send:typeof fetch=fetch){
  const key=process.env.REVENUECAT_V2_SECRET_API_KEY;const projectId=process.env.REVENUECAT_PROJECT_ID;const productId=process.env.REVENUECAT_IOS_V2_PRODUCT_ID;
  if(!externalCredentialedServicesAllowed()||!key||!projectId||!productId)throw new Error('ENTITLEMENT_SYNC_PENDING');
  const pathname=`/v2/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(appUserId)}/subscriptions`;
  let url=new URL(`https://api.revenuecat.com${pathname}?environment=${environment.toLowerCase()}&limit=100`);
  const ids=new Set<string>();const visited=new Set<string>();const deadline=Date.now()+8000;
  for(let page=0;page<5;page++){
    if(visited.has(url.href)||Date.now()>=deadline)throw new Error('ENTITLEMENT_SYNC_PENDING');visited.add(url.href);
    const response=await send(url.href,{headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))});
    if(!response.ok)throw new Error('ENTITLEMENT_SYNC_PENDING');
    const data=subscriptionListSchema.parse(await response.json());
    for(const subscription of data.items){
      if(subscription.product_id!==productId||subscription.store!=='app_store'||subscription.environment!==environment.toLowerCase()||!subscription.gives_access)continue;
      if(subscription.customer_id!==appUserId||subscription.original_customer_id!==appUserId)throw new Error('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
      ids.add(String(subscription.store_subscription_identifier));
    }
    if(!data.next_page){if(ids.size!==1)throw new Error('ENTITLEMENT_SYNC_PENDING');return [...ids][0];}
    const next=new URL(data.next_page,'https://api.revenuecat.com');
    if(next.origin!=='https://api.revenuecat.com'||next.pathname!==pathname||next.username||next.password)throw new Error('ENTITLEMENT_SYNC_PENDING');url=next;
  }
  throw new Error('ENTITLEMENT_SYNC_PENDING');
}
export async function fetchSubscriber(appUserId:string, send:typeof fetch=fetch) {
  if (!externalCredentialedServicesAllowed() || !process.env.REVENUECAT_SECRET_API_KEY) throw new Error('ENTITLEMENT_SYNC_PENDING');
  const response=await send(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,{
    headers:{Authorization:`Bearer ${process.env.REVENUECAT_SECRET_API_KEY}`,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if (response.status===404) return {subscriber:{entitlements:{},subscriptions:{}}};
  if (!response.ok) throw new Error('ENTITLEMENT_SYNC_PENDING');
  return response.json() as Promise<unknown>;
}
