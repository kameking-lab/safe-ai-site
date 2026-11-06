import { reconcile } from '@/lib/mobile/billing-service';
import { member,json,failure } from '@/lib/mobile/http';
export async function POST(request:Request) {try{return json(await reconcile(await member(request)));}catch(e){return failure(e);}}
