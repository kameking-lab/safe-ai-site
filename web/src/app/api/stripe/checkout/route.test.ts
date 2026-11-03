// @vitest-environment node
import { it,expect,vi } from 'vitest';
vi.mock('@/auth',()=>({auth:vi.fn()}));
vi.mock('@/lib/prisma',()=>({prisma:null}));
import { POST } from './route';
it('rejects retired checkout clients before authentication when the shared ledger is disabled',async()=>{
  vi.stubEnv('MOBILE_LEDGER_ENABLED','false');try{const response=await POST(new Request('https://example.test/api/stripe/checkout',{method:'POST',body:JSON.stringify({plan:'pro'})}));expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:expect.stringContaining('共通の購入管理')});}finally{vi.unstubAllEnvs();}
});
