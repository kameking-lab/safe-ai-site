import { z } from 'zod';
import { startFlow } from '@/lib/mobile/session';
import { json,failure,SITE_ORIGIN } from '@/lib/mobile/http';
import { sharedRateLimitGuard } from '@/lib/security/shared-state';
export async function POST(request:Request) {try{const limited=await sharedRateLimitGuard(request,{routeKey:'mobile-auth-start',limit:10,windowMs:600000});if(limited)return limited;const {challenge}=z.object({challenge:z.string().max(128)}).parse(await request.json());const flow=await startFlow(challenge);return json({flow:flow.id,authorizeUrl:`${SITE_ORIGIN}/api/mobile/v1/auth/authorize?flow=${flow.id}`});}catch(e){return failure(e);}}
