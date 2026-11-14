import {createHash} from 'node:crypto';
import {z} from 'zod';

export const billingDiagnosticSchema=z.object({
 version:z.literal(1),traceId:z.string().uuid(),sequence:z.number().int().min(1).max(60),
 operation:z.enum(['configure','logIn','logOut','getCustomerInfo','invalidateCustomerInfoCache','getOfferings','restorePurchases','purchasePackage','identity_queue','sdk_identity_queue','config','entitlement','reconcile','recovery','login','exchange','logout','session','store_request','buttons','chat']),
 result:z.enum(['start','ok','failed','timeout','state']),
 elapsedMs:z.number().int().min(0).max(180000).optional(),plan:z.enum(['free','pro']).optional(),
 reason:z.enum(['enabled','login','purchase','restore','sync','refresh','member_required','price_required','server_pending','store_unavailable']).optional(),
 stage:z.enum(['session','listener','start','headers','stream','complete']).optional(),
 httpStatus:z.number().int().min(100).max(599).optional(),
 code:z.enum(['UNAUTHORIZED','FORBIDDEN','INVALID_REQUEST','OPERATION_PENDING','OPERATION_RELEASED','DAILY_LIMIT_REACHED','BURST_LIMITED','ENTITLEMENT_SYNC_PENDING','AI_BUDGET_STOPPED','AI_BUDGET_FREE_PAUSED','CONSENT_REQUIRED','SAFETY_BLOCKED','TRANSPORT_ERROR','TIMEOUT','INVALID_RESPONSE','STREAM_ERROR','REQUEST_REJECTED']).optional(),
}).strict();

type Bucket={start:number;count:number};
// Bounded per-instance counters. No database, credential, or IP address is logged.
const clients=new Map<string,Bucket>();let total:Bucket={start:0,count:0};
export function allowBillingDiagnostic(request:Request,now=Date.now()){
 if(now-total.start>=60000){total={start:now,count:0};clients.clear();}
 if(total.count>=120)return false;
 const ip=request.headers.get('x-vercel-forwarded-for')??request.headers.get('x-forwarded-for')?.split(',')[0]??'unknown';
 const key=createHash('sha256').update(String(total.start)+ip).digest('hex');
 const bucket=clients.get(key)??{start:now,count:0};if(bucket.count>=60)return false;
 bucket.count++;clients.set(key,bucket);total.count++;return true;
}
