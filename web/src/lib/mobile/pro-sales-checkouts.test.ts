// @vitest-environment node
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import type {MobilePurchaseIntent} from '@prisma/client';
const mock=vi.hoisted(()=>({stopped:{month:'2026-11',salesPausedAt:new Date()},intent:null as MobilePurchaseIntent|null,
  retrieve:vi.fn(),expire:vi.fn(),create:vi.fn(),completed:vi.fn(),alert:vi.fn(),resolved:vi.fn(),find:vi.fn(),rotate:vi.fn(),lock:vi.fn()}));
vi.mock('stripe',()=>({default:class{checkout={sessions:{retrieve:mock.retrieve,expire:mock.expire,create:mock.create}}}}));
vi.mock('../stripe-webhook-handlers',()=>({handleCheckoutCompleted:mock.completed}));
vi.mock('./billing-service',()=>({lockMember:mock.lock}));
vi.mock('./operations-alerts',()=>({recordOperationsAlert:mock.alert,resolveOperationsAlert:mock.resolved}));
vi.mock('../prisma',()=>{
  const tx={mobilePurchaseIntent:{findUnique:async()=>mock.intent,update:async({data}:{data:Partial<MobilePurchaseIntent>})=>Object.assign(mock.intent!,data)}};
  return {prisma:{$transaction:async(run:(db:typeof tx)=>Promise<void>)=>run(tx),
    mobileBudgetMonth:{findFirst:async()=>mock.stopped},mobilePurchaseIntent:{findMany:mock.find,updateMany:mock.rotate}}};
});
import {processPausedStripeCheckouts} from './pro-sales-checkouts';
const session=(status='open')=>({id:'cs_fixture',status,url:'https://checkout.stripe.com/fixture',metadata:{userId:'fixture-member',purchaseIntentId:'fixture-intent'}});
beforeEach(()=>{
  vi.clearAllMocks();vi.stubEnv('MOBILE_LEDGER_ENABLED','true');vi.stubEnv('SAFE_AI_STAGING_MODE','false');vi.stubEnv('STRIPE_SECRET_KEY','synthetic-fixture');
  mock.stopped={month:'2026-11',salesPausedAt:new Date()};
  mock.intent={id:'fixture-intent',userId:'fixture-member',source:'stripe',status:'pending',stage:'checkout_open',providerSessionId:'cs_fixture',checkoutUrl:session().url,providerRequest:{},createdAt:new Date(),updatedAt:new Date()};
  mock.find.mockImplementation(async()=>mock.intent?.status==='pending'?[{...mock.intent}]:[]);
  mock.retrieve.mockResolvedValue(session());mock.expire.mockResolvedValue(session('expired'));
});
afterEach(()=>vi.unstubAllEnvs());
it('closes the checkout opened before the stop and clears the purchase URL',async()=>{
  expect(await processPausedStripeCheckouts()).toEqual({closed:1});
  expect(mock.expire).toHaveBeenCalledWith('cs_fixture');expect(mock.intent).toMatchObject({status:'cancelled',stage:'expired',checkoutUrl:null});
  expect(mock.completed).not.toHaveBeenCalled();await processPausedStripeCheckouts();expect(mock.expire).toHaveBeenCalledTimes(1);
});
it('retains failed expiry and retries it on the next maintenance run',async()=>{
  mock.expire.mockRejectedValueOnce(new Error('network'));
  expect(await processPausedStripeCheckouts()).toEqual({closed:0});expect(mock.intent?.status).toBe('pending');
  expect(mock.alert).toHaveBeenCalledWith('billing_reconcile','fixture-intent');expect(mock.rotate).toHaveBeenCalled();
  expect(await processPausedStripeCheckouts()).toEqual({closed:1});expect(mock.expire).toHaveBeenCalledTimes(2);
  expect(mock.resolved).toHaveBeenCalledWith('billing_reconcile','fixture-intent');
});
it('keeps verified payments that beat expiry and never cancels the subscription',async()=>{
  mock.retrieve.mockResolvedValue(session('complete'));await processPausedStripeCheckouts();
  expect(mock.completed).toHaveBeenCalled();expect(mock.expire).not.toHaveBeenCalled();expect(mock.intent?.status).toBe('completed');
});
it('uses the original request and idempotency key to recover an interrupted creation before closing it',async()=>{
  Object.assign(mock.intent!,{stage:'creating',providerSessionId:null});mock.create.mockResolvedValue(session());
  await processPausedStripeCheckouts();expect(mock.create).toHaveBeenCalledWith({}, {idempotencyKey:'fixture-intent'});
  expect(mock.intent?.status).toBe('cancelled');
});
it('retries old stops after rollover while excluding all purchases from the resumed JST month',async()=>{
  await processPausedStripeCheckouts();expect(mock.find).toHaveBeenCalledWith(expect.objectContaining({where:{source:'stripe',status:'pending',createdAt:{lt:new Date('2026-11-30T15:00:00Z')}}}));
  mock.stopped.month='2026-12';await processPausedStripeCheckouts();
  expect(mock.find).toHaveBeenLastCalledWith(expect.objectContaining({where:expect.objectContaining({createdAt:{lt:new Date('2026-12-31T15:00:00Z')}})}));
});
it('leaves a replacement reservation untouched after acquiring the member lock',async()=>{
  mock.lock.mockImplementationOnce(async()=>{mock.intent={...mock.intent!,id:'replacement',source:'app_store'};});
  await processPausedStripeCheckouts();expect(mock.expire).not.toHaveBeenCalled();expect(mock.intent?.status).toBe('pending');
});
it('does no provider work past the deadline or with the ledger disabled',async()=>{
  await processPausedStripeCheckouts(Date.now()-1);vi.stubEnv('MOBILE_LEDGER_ENABLED','false');await processPausedStripeCheckouts();
  expect(mock.retrieve).not.toHaveBeenCalled();expect(mock.lock).not.toHaveBeenCalled();
});
