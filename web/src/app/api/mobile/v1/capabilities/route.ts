import { createHmac } from 'node:crypto';
import { getEntitlement } from '@/lib/mobile/billing-service';
import { memberQuotas,anonymousQuota,upgradeAvailable } from '@/lib/mobile/usage';
import { member,json,failure,isNativeGuestRequest } from '@/lib/mobile/http';
import { canUseMemberQuota } from '@/lib/mobile/entitlement';
import { withRequestTiming } from '@/lib/server/request-timing';
export async function GET(request:Request){return withRequestTiming(async measure=>{try{
  if(isNativeGuestRequest(request)){
    if(process.env.MOBILE_LEDGER_ENABLED!=='true')throw new Error('ENTITLEMENT_SYNC_PENDING');
    const [upgrade,law_chat,chemical_ra]=await Promise.all([measure('sales',()=>upgradeAvailable(request,'free')),measure('law_quota',()=>anonymousQuota(request,'law_chat')),measure('chemical_quota',()=>anonymousQuota(request,'chemical_ra'))]);
    return json({version:1,expiresAt:new Date(Date.now()+240000).toISOString(),plan:'free',session:'anonymous',csrfToken:'anonymous-server-enforced-quota-only',upgrade,
      safety:{originalEvidence:true,dangerousAssertionsBlocked:true,sharedMonthlyBudgetYen:50000,serverSideEnforced:true},
      features:{law_chat:{available:true,quota:law_chat},chemical_ra:{available:false,quota:chemical_ra}}});
  }
  const userId=await measure('auth',()=>member(request));const rights=await measure('entitlement',()=>getEntitlement(userId));const secret=process.env.AUTH_SECRET;
  if(!secret || !canUseMemberQuota(rights))throw new Error('ENTITLEMENT_SYNC_PENDING');
  const csrfToken=createHmac('sha256',secret).update(`anzen-ai:${userId}:${new Date().toISOString().slice(0,10)}`).digest('hex');
  const quotas=await measure('quota',()=>memberQuotas(userId,rights));
  return json({version:1,expiresAt:new Date(Date.now()+240000).toISOString(),plan:rights.plan,session:'member',csrfToken,
    safety:{originalEvidence:true,dangerousAssertionsBlocked:true,sharedMonthlyBudgetYen:50000,serverSideEnforced:true},
    features:{law_chat:{available:true,quota:quotas.law_chat},chemical_ra:{available:false,quota:quotas.chemical_ra}}});
}catch(e){return failure(e);}});}
