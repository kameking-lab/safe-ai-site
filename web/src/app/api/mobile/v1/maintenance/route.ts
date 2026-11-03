import { timingSafeEqual } from 'node:crypto';
import { processBillingEvents,billingDb } from '@/lib/mobile/billing-service';
import { enqueueWeather,deliverWeather } from '@/lib/mobile/notification-worker';
import { json,failure } from '@/lib/mobile/http';
export const maxDuration=60;
export async function POST(request:Request){
  const expected=process.env.MOBILE_MAINTENANCE_AUTHORIZATION;const actual=request.headers.get('authorization')??'';
  if(!expected || Buffer.byteLength(actual)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return json({error:{code:'UNAUTHORIZED'}},401);
  try{const db=billingDb();await db.mobileAuthFlow.deleteMany({where:{expiresAt:{lt:new Date()}}});await db.mobileSession.deleteMany({where:{expiresAt:{lt:new Date()}}});await db.mobileUsageOperation.deleteMany({where:{expiresAt:{lt:new Date()}}});const billing=await processBillingEvents();if(process.env.MOBILE_APNS_ENABLED==='true'){await enqueueWeather();return json({billing,notifications:await deliverWeather()});}return json({billing,notifications:'disabled'});}catch(e){return failure(e);}
}
