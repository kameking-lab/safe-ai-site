// @vitest-environment node
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({paused:false,resume:vi.fn(),lock:vi.fn(),intent:{id:'fixture-intent',userId:'fixture-member',status:'pending',source:'stripe',providerRequest:null as unknown}}));
vi.mock('@/auth',()=>({auth:async()=>({user:{id:'fixture-member'}})}));
vi.mock('@/lib/stripe-price-policy',()=>({isPaidModeReady:()=>true,resolveStripePlan:()=> 'pro'}));
vi.mock('stripe',()=>({default:class{}}));
vi.mock('@/lib/mobile/operations-alerts',()=>({recordOperationsAlert:vi.fn()}));
vi.mock('@/lib/mobile/stripe-purchase',()=>({resumeStripeIntent:mock.resume}));
vi.mock('@/lib/prisma',()=>{
  const tx={$executeRaw:mock.lock,subscription:{findUnique:async()=>({stripeCustomerId:'cus_fixture'})},
    mobileBudgetMonth:{findUnique:async()=>({salesPausedAt:mock.paused?new Date():null,committedYen:0,reservedYen:0})},
    mobilePurchaseIntent:{findUnique:async()=>mock.intent,update:async()=>{mock.paused=true;return mock.intent;}}};
  return {prisma:{...tx,$transaction:async(run:(db:typeof tx)=>Promise<unknown>)=>run(tx)}};
});
vi.mock('@/lib/mobile/billing-service',async()=>{
  const {prisma}=await import('@/lib/prisma');
  return {billingDb:()=>prisma,lockMember:vi.fn(),reservePurchase:async()=>mock.intent};
});
import {POST} from './route';
beforeEach(()=>{
  vi.clearAllMocks();mock.paused=false;mock.intent.providerRequest=null;
  vi.stubEnv('MOBILE_LEDGER_ENABLED','true');vi.stubEnv('STRIPE_SECRET_KEY','synthetic-fixture');vi.stubEnv('STRIPE_ANZEN_PRO_MONTHLY_PRICE_ID','price_fixture');
});
afterEach(()=>vi.unstubAllEnvs());
it('blocks a stop between reservation and provider creation under the shared budget lock',async()=>{
  const response=await POST(new Request('https://example.test/api/stripe/checkout',{method:'POST',body:JSON.stringify({plan:'pro'})}));
  expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:{code:'PRO_SALES_PAUSED'}});
  expect(mock.lock.mock.calls.some(call=>String(call[1]).startsWith('anzen-budget:'))).toBe(true);
  expect(mock.resume).not.toHaveBeenCalled();
});
