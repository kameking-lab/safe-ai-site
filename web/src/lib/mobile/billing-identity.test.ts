// @vitest-environment node
import {afterEach,describe,expect,it,vi} from 'vitest';
import type {Prisma} from '@prisma/client';
import {assertNoDuplicateSubscription,providerVerifiedEmail,warnDuplicateSubscriptions} from './billing-identity';
import {failure} from './http';
const future=()=>new Date(Date.now()+86400000);
function fixture(){
  const user={email:' Owner@Example.test ',emailVerified:new Date() as Date|null,accounts:[{provider:'apple'}]};
  const peers=[{id:'other',provider:'google'}];
  const db={user:{findUnique:vi.fn(async()=>user)},$queryRaw:vi.fn(async()=>peers),
    mobileIdentity:{findUnique:vi.fn(async()=>({billingEnvironment:'PRODUCTION'}))},
    subscription:{findUnique:vi.fn(async()=>null as unknown)},
    mobileGrant:{findMany:vi.fn(async()=>[] as unknown[])}};
  return {user,peers,db,client:db as unknown as Prisma.TransactionClient};
}
afterEach(()=>vi.restoreAllMocks());
describe('verified-email purchase guard',()=>{
  it.each(['stripe','app_store'])('blocks a paid peer on %s and exposes only a login method',async provider=>{
    const f=fixture();f.db.mobileGrant.findMany.mockResolvedValue([{provider}]);
    const error=await assertNoDuplicateSubscription(f.client,'current').catch(e=>e);
    expect(error.message).toBe('DUPLICATE_SUBSCRIPTION_GOOGLE');
    expect(f.db.$queryRaw.mock.calls[0].slice(-2)).toEqual(['owner@example.test','current']);
    const response=failure(error);expect(response.status).toBe(409);
    expect(await response.json()).toEqual({error:{code:error.message,message:'このメールアドレスの別のアカウント（Google）で購入済みです。そちらでログインしてください。'}});
  });
  it('counts active legacy Stripe contracts including canceled-but-unexpired ones',async()=>{
    const f=fixture();f.db.subscription.findUnique.mockResolvedValue({planName:'pro',status:'canceled',stripeSubscriptionId:'fixture',currentPeriodEnd:future(),billingHold:false});
    await expect(assertNoDuplicateSubscription(f.client,'current')).rejects.toThrow('DUPLICATE_SUBSCRIPTION_GOOGLE');
  });
  it('allows different emails, free peers, and Apple private relay addresses',async()=>{
    const f=fixture();f.peers.length=0;await assertNoDuplicateSubscription(f.client,'current');
    f.peers.push({id:'other',provider:'apple'});await assertNoDuplicateSubscription(f.client,'current');
    f.user.email=' HIDDEN@privaterelay.appleid.com ';f.db.$queryRaw.mockClear();
    await assertNoDuplicateSubscription(f.client,'current');expect(f.db.$queryRaw).not.toHaveBeenCalled();
  });
  it('leaves anonymous purchase available without requiring an email or login',async()=>{
    const f=fixture();Object.assign(f.user,{email:null,emailVerified:null,accounts:[]});
    await assertNoDuplicateSubscription(f.client,'guest');expect(f.db.$queryRaw).not.toHaveBeenCalled();
  });
  it('fails closed for an unverified current email or a database outage',async()=>{
    const f=fixture();f.user.emailVerified=null;
    await expect(assertNoDuplicateSubscription(f.client,'current')).rejects.toThrow('BILLING_EMAIL_UNVERIFIED');
    f.user.emailVerified=new Date();f.db.$queryRaw.mockRejectedValueOnce(new Error('sensitive DB error'));
    const response=failure(await assertNoDuplicateSubscription(f.client,'current').catch(e=>e));
    expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('sensitive');
  });
  it('does not block a production member with another account’s sandbox rights',async()=>{
    const f=fixture();f.db.mobileIdentity.findUnique.mockImplementation(async(args?:unknown)=>({billingEnvironment:(args as {where:{userId:string}})?.where.userId==='other'?'SANDBOX':'PRODUCTION'}));
    f.db.subscription.findUnique.mockResolvedValue({planName:'pro',status:'active',stripeSubscriptionId:'fixture',currentPeriodEnd:future()});
    await assertNoDuplicateSubscription(f.client,'current');
  });
  it('logs a fixed reason only when both stores have committed active rights',async()=>{
    const f=fixture();const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    f.db.mobileGrant.findMany.mockImplementation(async(args?:unknown)=>[{provider:(args as {where:{userId:string}}).where.userId==='current'?'stripe':'app_store'}]);
    await warnDuplicateSubscriptions(f.client,'current');
    expect(warn).toHaveBeenCalledExactlyOnceWith('[mobile-billing]','DUPLICATE_EMAIL_STRIPE_APP_STORE');
  });
});
it('accepts only provider-verified profiles with the current matching email',()=>{
  expect(providerVerifiedEmail('google',{email:' OWNER@example.test ',email_verified:true},'owner@example.test')).toBe(true);
  expect(providerVerifiedEmail('apple',{email:'owner@example.test',email_verified:'true'},'owner@example.test')).toBe(true);
  for(const email_verified of [false,'false',undefined,1])expect(providerVerifiedEmail('google',{email:'owner@example.test',email_verified},'owner@example.test')).toBe(false);
  expect(providerVerifiedEmail('google',{email:'other@example.test',email_verified:true},'owner@example.test')).toBe(false);
  expect(providerVerifiedEmail('credentials',{email:'owner@example.test',email_verified:true},'owner@example.test')).toBe(false);
});
