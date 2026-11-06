import { reservePurchase } from '@/lib/mobile/billing-service';
import { member,json,failure } from '@/lib/mobile/http';
export async function POST(request:Request) {try{const intent=await reservePurchase(await member(request));return json({id:intent.id,status:intent.status});}catch(e){return failure(e);}}
