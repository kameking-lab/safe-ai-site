import { z } from 'zod';
import { cancelPurchase } from '@/lib/mobile/billing-service';
import { member,json,failure } from '@/lib/mobile/http';
export async function POST(request:Request){try{const userId=await member(request);const b=z.object({id:z.string().uuid(),reason:z.literal('store_cancelled')}).parse(await request.json());return json(await cancelPurchase(userId,b.id));}catch(e){return failure(e);}}
