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
    grace_period_expires_date:date.optional(), original_purchase_date:z.string(), store_transaction_id:z.string().optional(), refunded_at:date.optional() }))
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
  return { productId:expectedProduct, expiresAt, originalTransactionId:sub.store_transaction_id ?? `${expectedProduct}:${sub.original_purchase_date}` };
}
export async function fetchSubscriber(appUserId:string, send:typeof fetch=fetch) {
  if (!externalCredentialedServicesAllowed() || !process.env.REVENUECAT_SECRET_API_KEY) throw new Error('ENTITLEMENT_SYNC_PENDING');
  const response=await send(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,{
    headers:{Authorization:`Bearer ${process.env.REVENUECAT_SECRET_API_KEY}`,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if (response.status===404) return {subscriber:{entitlements:{},subscriptions:{}}};
  if (!response.ok) throw new Error('ENTITLEMENT_SYNC_PENDING');
  return response.json() as Promise<unknown>;
}
