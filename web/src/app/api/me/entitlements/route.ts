import { getEntitlement } from '@/lib/mobile/billing-service';
import { member,json,failure } from '@/lib/mobile/http';
import { withRequestTiming } from '@/lib/server/request-timing';
export async function GET(request:Request) {return withRequestTiming(async measure=>{try{
  const userId=await measure('auth',()=>member(request));
  return json(await measure('entitlement',()=>getEntitlement(userId,{refresh:new URL(request.url).searchParams.get('refresh')==='1'})));
}catch(e){return failure(e);}});}
