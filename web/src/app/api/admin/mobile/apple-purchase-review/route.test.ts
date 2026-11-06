// @vitest-environment node
import { beforeEach,it,expect,vi } from 'vitest';
const mocks=vi.hoisted(()=>({access:vi.fn(),release:vi.fn()}));
vi.mock('@/lib/server/admin-access',()=>({getAdminAccess:mocks.access}));
vi.mock('@/lib/mobile/apple-purchase-review',async importOriginal=>({...await importOriginal<typeof import('@/lib/mobile/apple-purchase-review')>(),releaseReviewedApplePurchase:mocks.release}));
import { POST } from './route';
const url='https://example.test/api/admin/mobile/apple-purchase-review';
const evidence={userId:'member',intentId:'88888888-2222-4222-8222-222222222222',appUserId:'immutable-member-id',environment:'PRODUCTION',productId:'fixture-product',checkedAt:new Date().toISOString(),evidenceSource:'apple_support',evidenceReference:'case-fixture',evidenceSha256:'a'.repeat(64),resolution:'cancelled',originalAppleAccountConfirmed:true,pendingTransactionsClosed:true,activeSubscriptionAbsent:true};
const request=(origin='https://example.test',body:unknown=evidence)=>new Request(url,{method:'POST',headers:{Origin:origin,Authorization:'Bearer ordinary-member-fixture'},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mocks.access.mockResolvedValue({ok:true,userId:'operator'});mocks.release.mockResolvedValue({purchasePending:false});});
it('rejects cross-origin, missing origin and ordinary member access without calling recovery',async()=>{
  expect((await POST(request('https://other.test'))).status).toBe(403);expect((await POST(request(''))).status).toBe(403);
  mocks.access.mockResolvedValue({ok:false});expect((await POST(request())).status).toBe(403);expect(mocks.release).not.toHaveBeenCalled();
});
it('requires complete store closure evidence and binds audit to authenticated operator',async()=>{
  expect((await POST(request(undefined,{...evidence,pendingTransactionsClosed:false}))).status).toBeGreaterThanOrEqual(400);expect(mocks.release).not.toHaveBeenCalled();
  const response=await POST(request());expect(response.status).toBe(200);expect(mocks.release).toHaveBeenCalledWith(evidence,'operator');
});
