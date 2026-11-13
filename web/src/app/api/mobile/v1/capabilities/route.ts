import { createHmac } from 'node:crypto';
import { getEntitlement } from '@/lib/mobile/billing-service';
import { quota,anonymousQuota,upgradeAvailable } from '@/lib/mobile/usage';
import { member,json,failure,isNativeGuestRequest } from '@/lib/mobile/http';
import { canUseMemberQuota } from '@/lib/mobile/entitlement';
export async function GET(request:Request){try{
  if(isNativeGuestRequest(request)){
    if(process.env.MOBILE_LEDGER_ENABLED!=='true')throw new Error('ENTITLEMENT_SYNC_PENDING');
    return json({version:1,expiresAt:new Date(Date.now()+240000).toISOString(),plan:'free',session:'anonymous',csrfToken:'anonymous-server-enforced-quota-only',upgrade:await upgradeAvailable(request,'free'),
      safety:{originalEvidence:true,dangerousAssertionsBlocked:true,sharedMonthlyBudgetYen:50000,serverSideEnforced:true},
      features:{law_chat:{available:true,quota:await anonymousQuota(request,'law_chat')},chemical_ra:{available:false,quota:await anonymousQuota(request,'chemical_ra')}}});
  }
  const userId=await member(request);const rights=await getEntitlement(userId);const secret=process.env.AUTH_SECRET;
  if(!secret || !canUseMemberQuota(rights))throw new Error('ENTITLEMENT_SYNC_PENDING');
  const csrfToken=createHmac('sha256',secret).update(`anzen-ai:${userId}:${new Date().toISOString().slice(0,10)}`).digest('hex');
  return json({version:1,expiresAt:new Date(Date.now()+240000).toISOString(),plan:rights.plan,session:'member',csrfToken,
    safety:{originalEvidence:true,dangerousAssertionsBlocked:true,sharedMonthlyBudgetYen:50000,serverSideEnforced:true},
    features:{law_chat:{available:true,quota:await quota(userId,'law_chat',undefined,rights)},chemical_ra:{available:false,quota:await quota(userId,'chemical_ra',undefined,rights)}}});
}catch(e){return failure(e);}}
