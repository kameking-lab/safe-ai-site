// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose test doubles for the Prisma delegate surface */
import { afterEach,expect,it,vi } from 'vitest';
vi.mock('@/lib/prisma',()=>({prisma:null}));
import { entitlementInTransaction,sandboxTesterEmails } from './billing-service';
afterEach(()=>vi.unstubAllEnvs());
function tx(email:string){
  const state={env:'PRODUCTION'};
  return {state,db:{mobileIdentity:{upsert:async()=>({appUserId:'app-user',billingEnvironment:state.env}),update:async({data}:any)=>{state.env=data.billingEnvironment;return {appUserId:'app-user',billingEnvironment:state.env};}},
    user:{findUnique:async()=>({email})},subscription:{findUnique:async()=>null},mobilePurchaseIntent:{findUnique:async()=>null},
    mobileGrant:{findMany:async()=>[{provider:'app_store',environment:'SANDBOX',revoked:false,expiresAt:new Date(Date.now()+86400000),checkedAt:new Date()}]}} as any};
}
it('parses only well-formed addresses from the tester list',()=>{
  expect([...sandboxTesterEmails({MOBILE_SANDBOX_TESTER_EMAILS:' Owner@Example.com, bad, ,x@y.z'} as unknown as NodeJS.ProcessEnv)]).toEqual(['owner@example.com','x@y.z']);
});
it('keeps sandbox Apple grants out of the web plan even for a listed tester',async()=>{
  const outsider=tx('someone@example.com');
  expect((await entitlementInTransaction(outsider.db,'member')).plan).toBe('free');
  vi.stubEnv('MOBILE_SANDBOX_TESTER_EMAILS','tester@example.com');
  expect((await entitlementInTransaction(outsider.db,'member')).plan).toBe('free');
  const tester=tx('Tester@Example.com');
  expect((await entitlementInTransaction(tester.db,'member')).plan).toBe('free');
  expect(await entitlementInTransaction(tester.db,'member','app')).toMatchObject({plan:'pro',sandbox:true});
  expect(tester.state.env).toBe('SANDBOX');
});
