// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { projectEntitlement } from '@/lib/mobile/entitlement';
const state=vi.hoisted(()=>({customer:true,failed:false,rights:{}}));
vi.mock('@/lib/prisma',()=>({prisma:{subscription:{findUnique:async()=>({stripeCustomerId:state.customer?'cus_fixture':null})}}}));
vi.mock('@/lib/mobile/billing-service',()=>({getEntitlement:async()=>{if(state.failed)throw new Error('offline');return state.rights;}}));
vi.mock('./manage-plan-button',()=>({ManagePlanButton:()=> <button>契約を管理</button>}));
import { ProMembership } from './pro-membership';
beforeEach(()=>{state.customer=true;state.failed=false;state.rights=projectEntitlement('member',null,[]);});
it('shows both management paths when Apple Pro coexists with a past-due Stripe customer',async()=>{
 state.rights=projectEntitlement('member',{stripeCustomerId:'cus_fixture',stripeSubscriptionId:'sub_fixture',planName:'pro',status:'past_due',currentPeriodEnd:new Date(0)},[{provider:'app_store',environment:'PRODUCTION',revoked:false,expiresAt:new Date(Date.now()+86400000),checkedAt:new Date()}]);
 const html=renderToStaticMarkup(await ProMembership({userId:'member'}));
 expect(html).toContain('契約を管理');expect(html).toContain('App Store で購読中');
});
it.each(['free','pending','failed'] as const)('keeps Stripe management for %s rights',async status=>{
 if(status==='pending')state.rights={...state.rights,syncState:'pending'};
 if(status==='failed')state.failed=true;
 expect(renderToStaticMarkup(await ProMembership({userId:'member'}))).toContain('契約を管理');
});
it('does not offer Stripe management without a customer',async()=>{
 state.customer=false;
 expect(renderToStaticMarkup(await ProMembership({userId:'member'}))).not.toContain('契約を管理');
});
