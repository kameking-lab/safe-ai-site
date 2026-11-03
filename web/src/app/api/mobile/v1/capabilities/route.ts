import { createHmac } from 'node:crypto';
import { getEntitlement } from '@/lib/mobile/billing-service';
import { quota } from '@/lib/mobile/usage';
import { member,json,failure } from '@/lib/mobile/http';
export async function GET(request:Request){try{
  const userId=await member(request);const rights=await getEntitlement(userId);const secret=process.env.AUTH_SECRET;
  if(!secret || rights.syncState!=='verified')throw new Error('ENTITLEMENT_SYNC_PENDING');
  const csrfToken=createHmac('sha256',secret).update(`anzen-ai:${userId}:${new Date().toISOString().slice(0,10)}`).digest('hex');
  return json({version:1,expiresAt:new Date(Date.now()+240000).toISOString(),plan:rights.plan,session:'member',csrfToken,
    safety:{originalEvidence:true,dangerousAssertionsBlocked:true,sharedMonthlyBudgetYen:50000,serverSideEnforced:true},
    features:{law_chat:{available:true,quota:await quota(userId,'law_chat')},chemical_ra:{available:false,quota:await quota(userId,'chemical_ra')}}});
}catch(e){return failure(e);}}
