import { z } from 'zod';
import { billingDb,getEntitlement,lockMember,lockPushDevice,entitlementInTransaction } from '@/lib/mobile/billing-service';
import { digest } from '@/lib/mobile/session';
import { member,json,failure } from '@/lib/mobile/http';
export async function POST(request:Request){try{
  const userId=await member(request);const rights=await getEntitlement(userId);
  if(rights.syncState!=='verified' || !rights.limits.notifications)throw new Error('FORBIDDEN');
  if(process.env.MOBILE_APNS_ENABLED!=='true')throw new Error('FEATURE_UNAVAILABLE');
  const b=z.object({token:z.string().regex(/^[a-fA-F0-9]{64,200}$/)}).parse(await request.json());
  const sessionHash=digest(request.headers.get('authorization')?.slice(7)??'');
  if(!request.headers.get('authorization')?.startsWith('Bearer '))throw new Error('FORBIDDEN');
  // A token is re-associated only by an authenticated device registration after permission.
  const device=await billingDb().$transaction(async tx=>{await lockPushDevice(tx,b.token);await lockMember(tx,userId);const latest=await entitlementInTransaction(tx,userId);if(latest.syncState!=='verified'||!latest.limits.notifications)throw new Error('FORBIDDEN');return tx.mobilePushDevice.upsert({where:{token:b.token},create:{userId,token:b.token,sessionHash,environment:process.env.MOBILE_APNS_ENVIRONMENT==='production'?'production':'sandbox'},update:{userId,sessionHash,enabled:true}});});
  return json({id:device.id,enabled:device.enabled});
}catch(e){return failure(e);}}
export async function DELETE(request:Request){try{const userId=await member(request);const sessionHash=digest(request.headers.get('authorization')?.slice(7)??'');await billingDb().$transaction(async tx=>{await lockMember(tx,userId);await tx.mobilePushDevice.updateMany({where:{userId,sessionHash},data:{enabled:false}});});return json({ok:true});}catch(e){return failure(e);}}
