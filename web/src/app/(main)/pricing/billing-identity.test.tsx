// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({plan:'free',auth:vi.fn(),rights:vi.fn(),resume:vi.fn(),lock:vi.fn(),intent:{status:'pending',source:'stripe',providerSessionId:'cs_fixture'}}));
vi.mock('@/auth',()=>({auth:state.auth}));
vi.mock('@/lib/mobile/billing-service',()=>({getEntitlement:state.rights,lockMember:state.lock,billingDb:()=>({$transaction:async(run:(tx:unknown)=>Promise<unknown>)=>run({mobilePurchaseIntent:{findUnique:async()=>state.intent}})})}));
vi.mock('@/lib/mobile/stripe-purchase',()=>({resumeStripeIntent:state.resume}));
vi.mock('@/lib/pro-sales',()=>({safeReturnPath:(value?:string)=>value??null,webProSalesReady:()=>true}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error('redirect:'+url);}}));
vi.mock('./start/auto-checkout',()=>({AutoCheckout:()=>null}));
import Start from './start/page';
import Success from './success/page';
beforeEach(()=>{vi.clearAllMocks();state.plan='free';state.auth.mockResolvedValue({user:{id:'member'}});state.rights.mockImplementation(async()=>({plan:state.plan}));state.resume.mockImplementation(async()=>{state.plan='pro';});});
it('checkout start authenticates identity and loads authoritative rights once',async()=>{
 await Start({searchParams:Promise.resolve({returnTo:'/chatbot'})});
 expect(state.auth).toHaveBeenCalledWith({identityOnly:true});expect(state.rights).toHaveBeenCalledExactlyOnceWith('member');
});
it('purchase return confirms the Stripe intent before the single fresh rights read',async()=>{
 await expect(Success({searchParams:Promise.resolve({returnTo:'/chatbot'})})).rejects.toThrow('redirect:/chatbot');
 expect(state.auth).toHaveBeenCalledWith({identityOnly:true});expect(state.resume).toHaveBeenCalledOnce();expect(state.rights).toHaveBeenCalledExactlyOnceWith('member');
 expect(state.resume.mock.invocationCallOrder[0]).toBeLessThan(state.rights.mock.invocationCallOrder[0]);
});
it('an interrupted payment confirmation does not grant Pro or skip the fresh rights check',async()=>{
 state.resume.mockRejectedValueOnce(new Error('provider unavailable'));
 const page=await Success({searchParams:Promise.resolve({returnTo:'/chatbot'})});expect(page).toBeTruthy();
 expect(state.rights).toHaveBeenCalledExactlyOnceWith('member');expect(state.plan).toBe('free');
});
