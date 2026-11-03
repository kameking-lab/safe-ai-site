import { getEntitlement } from '@/lib/mobile/billing-service';
import { member,json,failure } from '@/lib/mobile/http';
export async function GET(request:Request) {try{return json(await getEntitlement(await member(request)));}catch(e){return failure(e);}}
