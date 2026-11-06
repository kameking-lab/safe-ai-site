import { eventSchema,verifyWebhook } from '@/lib/mobile/revenuecat';
import { billingDb } from '@/lib/mobile/billing-service';
import { json,failure } from '@/lib/mobile/http';
export async function POST(request:Request) {
  if(Number(request.headers.get('content-length')??0)>65536) return json({error:{code:'INVALID_REQUEST'}},413);
  const reader=request.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
  if(reader)while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>65536){await reader.cancel();return json({error:{code:'INVALID_REQUEST'}},413);}chunks.push(item.value);}
  const raw=Buffer.concat(chunks).toString('utf8');
  if(!verifyWebhook(raw,request.headers.get('authorization'),request.headers.get('x-revenuecat-webhook-signature'),{authorization:process.env.REVENUECAT_WEBHOOK_AUTHORIZATION,signingSecret:process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET}))return json({error:{code:'UNAUTHORIZED'}},401);
  try {
    const {event}=eventSchema.parse(JSON.parse(raw));
    // Sandbox cannot change production grants. Authenticated tests are acknowledged only.
    if(event.type==='TEST') return json({received:true,ignored:true});
    if(event.environment==='SANDBOX'){
      const identity=event.app_user_id?await billingDb().mobileIdentity.findUnique({where:{appUserId:event.app_user_id}}):null;
      // Only owner-designated App Review/test accounts may consume sandbox rights.
      if(identity?.billingEnvironment!=='SANDBOX')return json({received:true,ignored:true});
    }
    await billingDb().mobileBillingEvent.upsert({where:{id:event.id},create:{id:event.id,appUserId:event.app_user_id,relatedAppUserIds:[...(event.transferred_from??[]),...(event.transferred_to??[])],type:event.type,occurredAt:new Date(event.event_timestamp_ms)},update:{}});
    // Ack only after a durable inbox write. An authenticated maintenance worker performs reconciliation.
    return json({received:true});
  }catch(e){return failure(e);}
}
