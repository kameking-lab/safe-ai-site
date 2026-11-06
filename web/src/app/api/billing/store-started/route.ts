import { z } from 'zod';
import { markStoreStarted } from '@/lib/mobile/billing-service';
import { member,json,failure } from '@/lib/mobile/http';
export async function POST(request:Request){try{const userId=await member(request);const {id}=z.object({id:z.string().uuid()}).parse(await request.json());return json(await markStoreStarted(userId,id));}catch(e){return failure(e);}}
