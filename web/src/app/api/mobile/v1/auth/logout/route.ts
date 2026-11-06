import { billingDb,lockMember } from '@/lib/mobile/billing-service';
import { digest } from '@/lib/mobile/session';
import { member,json,failure } from '@/lib/mobile/http';
export async function POST(request:Request){try{const userId=await member(request);const token=request.headers.get('authorization')?.slice(7);if(token)await billingDb().$transaction(async tx=>{await lockMember(tx,userId);await tx.mobilePushDevice.updateMany({where:{userId,sessionHash:digest(token)},data:{enabled:false}});await tx.mobileSession.deleteMany({where:{tokenHash:digest(token),userId}});});return json({ok:true});}catch(e){return failure(e);}}
