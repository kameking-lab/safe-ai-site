import { createGuestSession } from '@/lib/mobile/session';
import { json,failure } from '@/lib/mobile/http';
import { sharedRateLimitGuard } from '@/lib/security/shared-state';
export const runtime='nodejs';
/**
 * App Store purchases must not require registration (App Review 5.1.1(v)). The app creates an
 * anonymous member here only when a purchase or restore starts: no name, email or sign-in.
 * Signing in later merges it into the member (see exchangeFlow).
 */
export async function POST(request:Request){try{
  const hourly=await sharedRateLimitGuard(request,{routeKey:'mobile-auth-guest',limit:10,windowMs:3600000});if(hourly)return hourly;
  const daily=await sharedRateLimitGuard(request,{routeKey:'mobile-auth-guest-day',limit:30,windowMs:86400000});if(daily)return daily;
  const body=await request.json().catch(()=>null);
  return json(await createGuestSession(body?.anonymousStoreIdentity===true));
}catch(e){return failure(e);}}
