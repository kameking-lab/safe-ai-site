import { z } from 'zod';
import { reportAppleOutcome } from '@/lib/mobile/billing-service';
import { member,json,failure } from '@/lib/mobile/http';
export async function POST(request:Request){try{
  const userId=await member(request);
  const body=z.object({id:z.string().uuid(),outcome:z.enum(['cancelled','deferred','unknown','not_opened'])}).parse(await request.json());
  return json(await reportAppleOutcome(userId,body.id,body.outcome));
}catch(e){return failure(e);}}
