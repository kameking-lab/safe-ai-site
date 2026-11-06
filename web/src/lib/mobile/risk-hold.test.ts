// @vitest-environment node
import { it,expect,vi } from 'vitest';
import { handleBillingRisk } from '../stripe-webhook-handlers';
import { projectEntitlement } from './entitlement';
it('suspends access after a refund even if the subscription remains active',async()=>{
  vi.stubEnv('MOBILE_LEDGER_ENABLED','true');
  const db={subscription:{findMany:vi.fn(async()=>[{userId:'member'}]),updateMany:vi.fn()},mobileGrant:{updateMany:vi.fn()}};
  try{await handleBillingRisk(db as never,{customer:'cus_fixture'} as never);expect(db.subscription.updateMany).toHaveBeenCalledWith({where:{stripeCustomerId:'cus_fixture'},data:{billingHold:true}});expect(db.mobileGrant.updateMany).toHaveBeenCalled();
  const rights=projectEntitlement('immutable-member',{planName:'pro',status:'active',billingHold:true,stripeSubscriptionId:'sub_fixture',currentPeriodEnd:new Date(Date.now()+86400000)},[]);expect(rights.plan).toBe('free');expect(rights.syncState).toBe('pending');}finally{vi.unstubAllEnvs();}
});
