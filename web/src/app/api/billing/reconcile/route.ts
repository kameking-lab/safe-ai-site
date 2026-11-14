import { reconcile } from '@/lib/mobile/billing-service';
import { member,json,failure } from '@/lib/mobile/http';
import { z } from 'zod';
const input=z.object({appUserId:z.string().min(16).max(200).optional()});
export async function POST(request:Request) {
  try{
    const userId=await member(request);
    const parsed=input.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)throw new Error('INVALID_REQUEST');
    return json(await reconcile(userId,parsed.data));
  }catch(e){return failure(e);}
}
