import { z } from 'zod';
import { prepareApplePurchase, reservePurchase } from '@/lib/mobile/billing-service';
import { member,json,failure } from '@/lib/mobile/http';
const preparation=z.object({appUserId:z.string().min(16),attemptId:z.string().uuid()});
export async function POST(request:Request) {try{
  const userId=await member(request);
  const body=await request.json();
  if(body?.attemptId!==undefined || body?.appUserId!==undefined){
    const parsed=preparation.safeParse(body);if(!parsed.success)throw new Error('INVALID_REQUEST');
    return json(await prepareApplePurchase(userId,parsed.data.appUserId,parsed.data.attemptId));
  }
  const intent=await reservePurchase(userId);return json({id:intent.id,status:intent.status});
}catch(e){return failure(e);}}
