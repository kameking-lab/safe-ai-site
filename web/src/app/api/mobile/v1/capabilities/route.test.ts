// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
const calls=vi.hoisted(()=>({rights:vi.fn(),quota:vi.fn()}));
vi.mock('@/lib/mobile/billing-service',()=>({getEntitlement:calls.rights}));
vi.mock('@/lib/mobile/usage',()=>({quota:calls.quota}));
vi.mock('@/lib/mobile/http',()=>({member:async()=> 'fixture-member',json:(v:unknown)=>Response.json(v),failure:()=>Response.json({error:'failed'},{status:503})}));
import { GET } from './route';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it('uses one entitlement read for both quotas and permits only the ordinary free quota during pending paid verification',async()=>{
 vi.stubEnv('AUTH_SECRET','synthetic-test-only');
 const rights={plan:'free',syncState:'pending'};calls.rights.mockResolvedValue(rights);
 calls.quota.mockResolvedValue({limit:3,used:0,reserved:0,remaining:3,resetAt:new Date().toISOString()});
 const response=await GET(new Request('https://example.test/api/mobile/v1/capabilities'));
 expect(response.status).toBe(200);expect((await response.json()).plan).toBe('free');expect(calls.rights).toHaveBeenCalledTimes(1);
 expect(calls.quota).toHaveBeenCalledWith('fixture-member','law_chat',undefined,rights);
 expect(calls.quota).toHaveBeenCalledWith('fixture-member','chemical_ra',undefined,rights);
 calls.rights.mockResolvedValue({plan:'pro',syncState:'pending'});
 expect((await GET(new Request('https://example.test/api/mobile/v1/capabilities'))).status).toBe(503);
});
