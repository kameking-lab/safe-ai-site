import { z } from 'zod';
import { markStoreStarted } from '@/lib/mobile/billing-service';
import { member,json,failure } from '@/lib/mobile/http';
export async function POST(request:Request){try{const userId=await member(request);const {id,attemptId}=z.object({id:z.string().uuid(),attemptId:z.string().uuid().optional()}).parse(await request.json());return json(await markStoreStarted(userId,id,attemptId));}catch(e){return failure(e);}}
