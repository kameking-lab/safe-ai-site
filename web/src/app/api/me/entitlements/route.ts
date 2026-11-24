import { getEntitlement } from '@/lib/mobile/billing-service';
import { member,json,failure,entitlementSurface } from '@/lib/mobile/http';
import { withRequestTiming } from '@/lib/server/request-timing';
export async function GET(request:Request) {return withRequestTiming(async measure=>{try{
  const userId=await measure('auth',()=>member(request));
  const refresh=new URL(request.url).searchParams.get('refresh')==='1';
  return json(await measure('entitlement',()=>getEntitlement(userId,{refresh,snapshot:!refresh,surface:entitlementSurface(request)})));
}catch(e){return failure(e);}});}
