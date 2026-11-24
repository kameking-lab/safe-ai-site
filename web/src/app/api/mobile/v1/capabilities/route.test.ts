// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
const calls=vi.hoisted(()=>({rights:vi.fn(),quota:vi.fn()}));
vi.mock('@/lib/mobile/billing-service',()=>({getEntitlement:calls.rights}));
vi.mock('@/lib/mobile/usage',()=>({memberQuotas:calls.quota,anonymousQuota:async()=>({limit:3,used:1,reserved:0,remaining:2,resetAt:new Date().toISOString()}),upgradeAvailable:async()=>true}));
vi.mock('@/lib/mobile/http',async importOriginal=>({...await importOriginal<typeof import('@/lib/mobile/http')>(),member:async()=> 'fixture-member',json:(v:unknown)=>Response.json(v),failure:()=>Response.json({error:'failed'},{status:503})}));
import { GET } from './route';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('uses one entitlement read for both quotas and permits only the ordinary free quota during pending paid verification',async()=>{
 vi.stubEnv('AUTH_SECRET','synthetic-test-only');
 const rights={plan:'free',syncState:'pending'};calls.rights.mockResolvedValue(rights);
 calls.quota.mockResolvedValue({law_chat:{limit:3,used:0,reserved:0,remaining:3,resetAt:new Date().toISOString()},chemical_ra:{limit:3,used:0,reserved:0,remaining:3,resetAt:new Date().toISOString()}});
 const response=await GET(new Request('https://example.test/api/mobile/v1/capabilities'));
 expect(response.status).toBe(200);expect((await response.json()).plan).toBe('free');expect(calls.rights).toHaveBeenCalledTimes(1);
 expect(calls.quota).toHaveBeenCalledTimes(1);
 expect(calls.quota).toHaveBeenCalledWith('fixture-member',rights);
 calls.rights.mockResolvedValue({plan:'pro',syncState:'pending'});
 expect((await GET(new Request('https://example.test/api/mobile/v1/capabilities'))).status).toBe(503);
});

it('shows a native guest the server allowance without resolving member entitlements',async()=>{
 vi.stubEnv('MOBILE_LEDGER_ENABLED','true');
 const response=await GET(new Request('https://example.test/api/mobile/v1/capabilities',{headers:{'X-Anzen-Native':'1'}}));
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({session:'anonymous',plan:'free',upgrade:true,features:{law_chat:{quota:{remaining:2}}}});
 expect(calls.rights).not.toHaveBeenCalled();expect(calls.quota).not.toHaveBeenCalled();
 vi.stubEnv('MOBILE_LEDGER_ENABLED','false');expect((await GET(new Request('https://example.test/api/mobile/v1/capabilities',{headers:{'X-Anzen-Native':'1'}}))).status).toBe(503);
});

it('selects the app projection only for an authenticated Bearer client',async()=>{
 vi.stubEnv('AUTH_SECRET','synthetic-test-only');
 calls.rights.mockImplementation(async (_userId,options)=>options.surface==='app'
  ?{plan:'pro',syncState:'verified',sandbox:true}:{plan:'free',syncState:'verified'});
 calls.quota.mockResolvedValue({law_chat:{remaining:3},chemical_ra:{remaining:1}});
 const url='https://example.test/api/mobile/v1/capabilities';
 const browser=await GET(new Request(url));
 const app=await GET(new Request(url,{headers:{Authorization:'Bearer fixture'}}));
 expect(await browser.json()).toMatchObject({plan:'free',session:'member'});
 expect(await app.json()).toMatchObject({plan:'pro',session:'member'});
 expect(calls.rights).toHaveBeenNthCalledWith(1,'fixture-member',{surface:'web',snapshot:true});
 expect(calls.rights).toHaveBeenNthCalledWith(2,'fixture-member',{surface:'app',snapshot:true});
});
