import { timingSafeEqual } from 'node:crypto';
import { processBillingEvents,billingDb } from '@/lib/mobile/billing-service';
import { enqueueWeather,deliverWeather } from '@/lib/mobile/notification-worker';
import { json,failure } from '@/lib/mobile/http';
import { processAccountDeletions } from '@/lib/mobile/account-deletion';
import { deliverOperationsAlerts } from '@/lib/mobile/operations-alerts';
// One 45-second budget for the whole run, split across phases (each item may overshoot
// its phase by one bounded provider call); maxDuration leaves the remaining margin.
export const maxDuration=60;
export async function POST(request:Request){
  const expected=process.env.MOBILE_MAINTENANCE_AUTHORIZATION;const actual=request.headers.get('authorization')??'';
  if(!expected || Buffer.byteLength(actual)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return json({error:{code:'UNAUTHORIZED'}},401);
  try{const deadline=Date.now()+45000;const db=billingDb();await db.mobileAuthFlow.deleteMany({where:{expiresAt:{lt:new Date()}}});await db.mobileSession.deleteMany({where:{expiresAt:{lt:new Date()}}});await db.mobileUsageOperation.deleteMany({where:{createdAt:{lt:new Date(Date.now()-30*86400000)},status:{notIn:['reserved','uncertain']}}});const deletions=await processAccountDeletions(deadline-25000);const billing=await processBillingEvents(20,deadline-15000);await deliverOperationsAlerts(deadline-10000);if(process.env.MOBILE_APNS_ENABLED==='true'){await enqueueWeather(deadline-5000);return json({billing,deletions,notifications:await deliverWeather(undefined,deadline)});}return json({billing,deletions,notifications:'disabled'});}catch(e){return failure(e);}
}
