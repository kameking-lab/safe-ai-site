// @vitest-environment node
import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
vi.mock('../server/deployment-safety',()=>({externalCredentialedServicesAllowed:()=>true}));
import { appleGrantForEnvironment,fetchAppleOwnership,verifiedAppleGrant,verifyAppleLegacyPurchase } from './revenuecat';
const customer='mock-member';const subscription=()=>({id:'sub-stable',customer_id:customer,original_customer_id:customer,product_id:'mock_rc_product',store:'app_store',environment:'production',gives_access:true,store_subscription_identifier:'latest-store-id'});
beforeEach(()=>{vi.stubEnv('REVENUECAT_V2_SECRET_API_KEY','mock-v2-only');vi.stubEnv('REVENUECAT_PROJECT_ID','mock-project');vi.stubEnv('REVENUECAT_IOS_V2_PRODUCT_ID','mock_rc_product');});afterEach(()=>vi.unstubAllEnvs());
const response=(items:unknown[],next_page?:string)=>Response.json({items,next_page});
describe('stable App Store purchase ownership',()=>{
  it('checks the environment-specific product, entitlement, owner and expiry when V1 shows the other purchase',async()=>{
    const now=new Date().toISOString(),until=Date.now()+86400000;
    const raw={subscriber:{entitlements:{anzen_pro:{product_identifier:'monthly',expires_date:new Date(until).toISOString(),purchase_date:now}},
      subscriptions:{monthly:{store:'app_store',is_sandbox:true,expires_date:new Date(until).toISOString(),original_purchase_date:now}}}};
    const paid={...subscription(),ends_at:until,entitlements:{items:[{lookup_key:'anzen_pro'}]}};
    const lookup=(items:unknown[])=>appleGrantForEnvironment(customer,raw,'monthly','PRODUCTION',[customer],async url=>{
      expect(new URL(String(url)).searchParams.get('environment')).toBe('production');
      return response(items);
    });
    expect(await lookup([paid])).toMatchObject({grant:{productId:'monthly',expiresAt:new Date(until)},ownership:{key:'rc:sub-stable',customerId:customer}});
    for(const items of [[],[{...paid,environment:'sandbox'}],[{...paid,gives_access:false}],[{...paid,ends_at:1}],[{...paid,entitlements:{items:[]}}],[{...paid,entitlements:{items:[{lookup_key:'anzen_pro',state:'archived'}]}}]]){
      expect(await lookup(items)).toBeNull();
    }
    await expect(lookup([{...paid,customer_id:'unrelated'}])).rejects.toThrow('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
    await expect(lookup([{...paid,ends_at:null}])).rejects.toThrow('ENTITLEMENT_SYNC_PENDING');
  });
  it('matches a historical store ID to the same verified subscription and distinguishes a proven different purchase',async()=>{
    expect(await verifyAppleLegacyPurchase(customer,'PRODUCTION','rc:sub-stable','original-apple-id',async()=>response([subscription()]))).toBe(true);
    expect(await verifyAppleLegacyPurchase(customer,'PRODUCTION','rc:sub-stable','another-purchase',async()=>response([{...subscription(),id:'other-subscription'}]))).toBe(false);
  });
  it('stops a legacy transfer when the old ID cannot be verified or its ownership response is inconsistent',async()=>{
    for(const items of [[],[{...subscription(),customer_id:'previous-member'}],[{...subscription(),gives_access:false}],[{...subscription(),environment:'sandbox'}],[{...subscription(),id:undefined}]]){
      await expect(verifyAppleLegacyPurchase(customer,'PRODUCTION','rc:sub-stable','old-store-id',async()=>response(items))).rejects.toThrow('ENTITLEMENT_SYNC_PENDING');
    }
  });
  it('uses the stable RevenueCat key across store renewals',async()=>{const send=vi.fn<typeof fetch>(async()=>response([subscription()]));expect(await fetchAppleOwnership(customer,'PRODUCTION',send)).toMatchObject({key:'rc:sub-stable',storeTransactionId:'latest-store-id'});expect(send.mock.calls[0][0]).toContain('/v2/projects/mock-project/customers/mock-member/subscriptions');expect(send.mock.calls[0][1]).toMatchObject({headers:{Authorization:'Bearer mock-v2-only'},redirect:'error'});const renewed=vi.fn(async()=>response([{...subscription(),store_subscription_identifier:'another-renewal'}]));expect((await fetchAppleOwnership(customer,'PRODUCTION',renewed)).key).toBe('rc:sub-stable');});
  it('accepts a verified transfer from the historical original customer',async()=>{const send=vi.fn(async()=>response([{...subscription(),original_customer_id:'previous-member'}]));await expect(fetchAppleOwnership(customer,'PRODUCTION',send)).resolves.toMatchObject({key:'rc:sub-stable',originalCustomerId:'previous-member'});});
  it('rejects a different current customer even when the original customer matches',async()=>{const send=vi.fn(async()=>response([{...subscription(),customer_id:'another-member'}]));await expect(fetchAppleOwnership(customer,'PRODUCTION',send)).rejects.toThrow('PURCHASE_OWNED_BY_OTHER_ACCOUNT');});
  it('accepts a canonical customer only when the caller has authorized that alias',async()=>{
    const alias='$RCAnonymousID:'+'a'.repeat(32);
    const send=vi.fn(async()=>response([{...subscription(),customer_id:alias}]));
    await expect(fetchAppleOwnership(customer,'PRODUCTION',send)).rejects.toThrow('PURCHASE_OWNED_BY_OTHER_ACCOUNT');
    await expect(fetchAppleOwnership(customer,'PRODUCTION',send,[customer,alias])).resolves.toMatchObject({key:'rc:sub-stable',customerId:alias});
  });
  it('rejects another product, store, environment and incomplete access',async()=>{for(const change of [{product_id:'other'},{store:'stripe'},{environment:'sandbox'},{gives_access:false}]){const send=vi.fn(async()=>response([{...subscription(),...change}]));await expect(fetchAppleOwnership(customer,'PRODUCTION',send)).rejects.toThrow('ENTITLEMENT_SYNC_PENDING');}});
  it('follows bounded same-customer pagination and refuses credential forwarding off-site',async()=>{const send=vi.fn().mockResolvedValueOnce(response([],`/v2/projects/mock-project/customers/mock-member/subscriptions?starting_after=mock`)).mockResolvedValueOnce(response([subscription()]));expect((await fetchAppleOwnership(customer,'PRODUCTION',send)).key).toBe('rc:sub-stable');expect(send).toHaveBeenCalledTimes(2);
    const bad=vi.fn(async()=>response([],'https://example.test/capture'));await expect(fetchAppleOwnership(customer,'PRODUCTION',bad)).rejects.toThrow();expect(bad).toHaveBeenCalledTimes(1);
  });
  it('does not sell or grant when ownership configuration or API is unavailable',async()=>{const send=vi.fn(async()=>new Response('',{status:503}));await expect(fetchAppleOwnership(customer,'PRODUCTION',send)).rejects.toThrow('ENTITLEMENT_SYNC_PENDING');vi.stubEnv('REVENUECAT_V2_SECRET_API_KEY','');send.mockClear();await expect(fetchAppleOwnership(customer,'PRODUCTION',send)).rejects.toThrow('ENTITLEMENT_SYNC_PENDING');expect(send).not.toHaveBeenCalled();});
  it('does not fabricate an original transaction ID from v1 renewal IDs or purchase dates',()=>{const now=new Date();const expiry=new Date(Date.now()+86400000).toISOString();const result=verifiedAppleGrant({subscriber:{entitlements:{anzen_pro:{product_identifier:'mock',purchase_date:now.toISOString(),expires_date:expiry}},subscriptions:{mock:{store:'app_store',is_sandbox:false,expires_date:expiry,original_purchase_date:now.toISOString(),store_transaction_id:123456789}}}},'mock',now);expect(result).not.toBeNull();expect(result).not.toHaveProperty('originalTransactionId');});
});
