import { z } from 'zod';
import { prepareAccountDeletion,confirmAccountDeletion,accountDeletionStatus } from '@/lib/mobile/account-deletion';
import { member,json,failure } from '@/lib/mobile/http';
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('prepare')}),
  z.object({action:z.literal('confirm'),id:z.string().uuid(),confirmation:z.string().length(43),confirmationText:z.literal('削除')}),
  z.object({action:z.literal('status'),receipt:z.string().length(43)}),
]);
export async function POST(request:Request){try{
  if(Number(request.headers.get('content-length'))>2048)throw new Error('INVALID_REQUEST');
  const raw=await request.text();if(raw.length>2048)throw new Error('INVALID_REQUEST');const body=schema.parse(JSON.parse(raw));
  if(body.action==='status')return json(await accountDeletionStatus(body.receipt));
  const userId=await member(request);
  if(body.action==='prepare')return json(await prepareAccountDeletion(request,userId));
  return json(await confirmAccountDeletion(request,userId,body.id,body.confirmation));
}catch(e){return failure(e);}}
