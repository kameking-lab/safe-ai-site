// @vitest-environment node
import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
const state=vi.hoisted(()=>({inbox:new Map<string,unknown>(),fail:false}));
vi.mock('@/lib/mobile/billing-service',()=>({billingDb:()=>({mobileIdentity:{findUnique:async()=>null},mobileBillingEvent:{upsert:async({where,create}:{where:{id:string};create:unknown})=>{if(state.fail)throw new Error('storage unavailable');if(!state.inbox.has(where.id))state.inbox.set(where.id,create);return create;}}})}));
import { POST } from './route';
const event={event:{id:'mock_event_1',app_user_id:'mock_user',type:'INITIAL_PURCHASE',event_timestamp_ms:Date.now(),environment:'PRODUCTION'}};
const req=(body=event,authorization='Bearer mock_webhook')=>new Request('https://example.test/api/webhooks/revenuecat',{method:'POST',headers:{authorization,'Content-Type':'application/json'},body:JSON.stringify(body)});
beforeEach(()=>{state.inbox.clear();state.fail=false;vi.stubEnv('REVENUECAT_WEBHOOK_AUTHORIZATION','Bearer mock_webhook');vi.stubEnv('REVENUECAT_WEBHOOK_SIGNING_SECRET','');});afterEach(()=>vi.unstubAllEnvs());
describe('durable RevenueCat webhook receipt',()=>{
  it('rejects unauthenticated events before storage',async()=>{expect((await POST(req(event,'Bearer wrong'))).status).toBe(401);expect(state.inbox.size).toBe(0);});
  it('deduplicates retried events without granting a client-reported entitlement',async()=>{expect((await POST(req())).status).toBe(200);expect((await POST(req())).status).toBe(200);expect(state.inbox.size).toBe(1);expect(JSON.stringify([...state.inbox.values()])).not.toContain('active');});
  it('does not acknowledge an event if the durable inbox fails',async()=>{state.fail=true;expect((await POST(req())).status).toBe(503);expect(state.inbox.size).toBe(0);});
  it('keeps sandbox events outside production rights',async()=>{expect((await POST(req({...event,event:{...event.event,environment:'SANDBOX'}}))).status).toBe(200);expect(state.inbox.size).toBe(0);});
});
