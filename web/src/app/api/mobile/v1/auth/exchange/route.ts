import { z } from 'zod';
import { exchangeFlow } from '@/lib/mobile/session';
import { json,failure } from '@/lib/mobile/http';
import { sharedRateLimitGuard } from '@/lib/security/shared-state';
export async function POST(request:Request){try{const limited=await sharedRateLimitGuard(request,{routeKey:'mobile-auth-exchange',limit:20,windowMs:600000});if(limited)return limited;const b=z.object({flow:z.string().uuid(),code:z.string().max(128),verifier:z.string().max(128)}).parse(await request.json());return json(await exchangeFlow(b.flow,b.code,b.verifier));}catch(e){return failure(e);}}
