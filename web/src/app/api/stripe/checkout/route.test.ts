// @vitest-environment node
import { it,expect,vi } from 'vitest';
vi.mock('@/auth',()=>({auth:vi.fn()}));
vi.mock('@/lib/prisma',()=>({prisma:null}));
import { POST } from './route';
// The legacy web checkout stays available while the shared ledger is off; only
// enabling MOBILE_LEDGER_ENABLED switches web purchases onto the reserved flow.
it('keeps the legacy web checkout path when the shared ledger is disabled',async()=>{
  vi.stubEnv('MOBILE_LEDGER_ENABLED','false');try{const response=await POST(new Request('https://example.test/api/stripe/checkout',{method:'POST',body:JSON.stringify({plan:'pro'})}));const body=await response.json() as {error?:unknown};expect(JSON.stringify(body.error??'')).not.toContain('共通の購入管理');}finally{vi.unstubAllEnvs();}
});
