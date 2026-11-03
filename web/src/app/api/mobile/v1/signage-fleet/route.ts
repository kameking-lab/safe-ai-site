import { getSignageFleetSnapshot } from '@/lib/signage/fleet-snapshot';
import { member,json,failure } from '@/lib/mobile/http';
export async function GET(request:Request){
  try{await member(request);return json(await getSignageFleetSnapshot(new URL(request.url).searchParams.get('organization')));}
  catch(error){return failure(error);}
}
