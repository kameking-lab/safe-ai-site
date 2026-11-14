// @vitest-environment node
import {afterEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({member:vi.fn(async()=> 'synthetic-member'),rights:vi.fn(async()=>({plan:'pro',limits:{law_chat:50}}))}));
vi.mock('@/lib/mobile/billing-service',()=>({getEntitlement:mock.rights}));
vi.mock('@/lib/mobile/http',async original=>({...await original<typeof import('@/lib/mobile/http')>(),member:mock.member}));
import {GET} from './route';
afterEach(()=>vi.clearAllMocks());
it('uses the stored ledger for the ordinary authenticated display',async()=>{
 const result=await GET(new Request('https://example.test/api/me/entitlements'));
 expect(result.status).toBe(200);expect(await result.json()).toMatchObject({plan:'pro',limits:{law_chat:50}});
 expect(mock.rights).toHaveBeenCalledWith('synthetic-member',{refresh:false,snapshot:true});
});
it('keeps explicit provider verification available and rejects signed-out requests',async()=>{
 expect((await GET(new Request('https://example.test/api/me/entitlements?refresh=1'))).status).toBe(200);
 expect(mock.rights).toHaveBeenCalledWith('synthetic-member',{refresh:true,snapshot:false});
 mock.rights.mockClear();mock.member.mockRejectedValueOnce(new Error('UNAUTHORIZED'));
 expect((await GET(new Request('https://example.test/api/me/entitlements'))).status).toBe(401);expect(mock.rights).not.toHaveBeenCalled();
});
