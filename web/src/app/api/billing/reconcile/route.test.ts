// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({member:vi.fn(async()=> 'member'),reconcile:vi.fn(async()=>({plan:'pro'}))}));
vi.mock('@/lib/mobile/billing-service',()=>({reconcile:mocks.reconcile}));
vi.mock('@/lib/mobile/http',async importOriginal=>({...await importOriginal<object>(),member:mocks.member}));
import {POST} from './route';
beforeEach(()=>vi.clearAllMocks());
it('passes only the expected SDK identity to authenticated reconciliation and disables caching',async()=>{
 const response=await POST(new Request('https://example.test/api/billing/reconcile',{method:'POST',body:JSON.stringify({appUserId:'returning-member-identifier',plan:'pro'})}));
 expect(response.status).toBe(200);expect(mocks.reconcile).toHaveBeenCalledWith('member',{appUserId:'returning-member-identifier'});
 expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
it.each(['{bad',JSON.stringify({appUserId:'short'}),JSON.stringify({appUserId:42})])('rejects invalid identity input before reconciliation: %s',async body=>{
 const response=await POST(new Request('https://example.test/api/billing/reconcile',{method:'POST',body}));
 expect(response.status).toBe(400);expect(mocks.reconcile).not.toHaveBeenCalled();
});
it('keeps existing clients sending an empty object compatible',async()=>{
 expect((await POST(new Request('https://example.test/api/billing/reconcile',{method:'POST',body:'{}'}))).status).toBe(200);
 expect(mocks.reconcile).toHaveBeenCalledWith('member',{});
});
