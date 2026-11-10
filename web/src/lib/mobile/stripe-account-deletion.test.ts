// @vitest-environment node
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
import type { Prisma } from '@prisma/client';
const mock=vi.hoisted(()=>({list:vi.fn(),retrieve:vi.fn(),update:vi.fn(),release:vi.fn(),expire:vi.fn()}));
vi.mock('stripe',()=>({default:class{ subscriptions={list:mock.list,retrieve:mock.retrieve,update:mock.update};subscriptionSchedules={release:mock.release};}}));
vi.mock('./stripe-purchase',()=>({expireStripeIntent:mock.expire}));
import { stopDeletedAccountRenewal } from './stripe-account-deletion';
const subscription=(id='sub-a')=>({id,customer:'cus-a',metadata:{userId:'member-a'},status:'active',schedule:null,cancel_at_period_end:false});
const tx=(saved:unknown={stripeSubscriptionId:'sub-a',stripeCustomerId:'cus-a'},pending=false)=>({subscription:{findUnique:async()=>saved},mobilePurchaseIntent:{findUnique:async()=>pending?{source:'stripe',status:'pending'}:null}}) as unknown as Prisma.TransactionClient;
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('STRIPE_SECRET_KEY','synthetic-test');vi.stubEnv('SAFE_AI_STAGING_MODE','false');mock.list.mockResolvedValue({data:[subscription()],has_more:false});mock.update.mockImplementation(async(id:string)=>({...subscription(id),cancel_at_period_end:true}));});
afterEach(()=>vi.unstubAllEnvs());
it('closes checkout, cancels every owned subscription at period end and verifies the response',async()=>{
  const scheduled={...subscription('sub-b'),schedule:'sched-b'};mock.list.mockResolvedValue({data:[subscription(),scheduled],has_more:false});
  await stopDeletedAccountRenewal(tx(undefined,true),'member-a');
  expect(mock.expire).toHaveBeenCalled();expect(mock.expire.mock.invocationCallOrder[0]).toBeLessThan(mock.list.mock.invocationCallOrder[0]);
  expect(mock.update).toHaveBeenCalledTimes(2);expect(mock.update).toHaveBeenCalledWith('sub-a',{cancel_at_period_end:true},{idempotencyKey:'delete-renewal:member-a:sub-a'});
  expect(mock.release).toHaveBeenCalledWith('sched-b');
});
it('does not touch an already ended subscription or an account without web billing',async()=>{
  await stopDeletedAccountRenewal(tx(null),'member-a');expect(mock.list).not.toHaveBeenCalled();
  mock.list.mockResolvedValue({data:[{...subscription(),status:'canceled'}],has_more:false});await stopDeletedAccountRenewal(tx(),'member-a');expect(mock.update).not.toHaveBeenCalled();
});
it('retains deletion on API failure, failed confirmation, foreign ownership or an incomplete list',async()=>{
  mock.update.mockRejectedValueOnce(new Error('network'));await expect(stopDeletedAccountRenewal(tx(),'member-a')).rejects.toThrow();
  mock.update.mockResolvedValueOnce(subscription());await expect(stopDeletedAccountRenewal(tx(),'member-a')).rejects.toThrow('DELETION_PENDING');
  mock.list.mockResolvedValueOnce({data:[{...subscription(),metadata:{userId:'other'}}],has_more:false});await expect(stopDeletedAccountRenewal(tx(),'member-a')).rejects.toThrow('DELETION_PENDING');
  mock.list.mockResolvedValueOnce({data:[],has_more:true});await expect(stopDeletedAccountRenewal(tx(),'member-a')).rejects.toThrow('DELETION_PENDING');
});
