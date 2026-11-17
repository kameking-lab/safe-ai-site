// @vitest-environment node
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({auth:vi.fn(),rights:vi.fn()}));
vi.mock('@/auth',()=>({auth:mock.auth}));
vi.mock('@/lib/mobile/billing-service',()=>({getEntitlement:mock.rights}));
vi.mock('@/lib/mobile/pro-sales-gate',()=>({proSalesStatus:async()=>({paused:false})}));
vi.mock('next/server',()=>({connection:async()=>{}}));
vi.mock('@/components/layout',()=>({PageContainer:({children}:{children:React.ReactNode})=><div>{children}</div>}));
import {ProOffer} from './pro-offer';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('MOBILE_LEDGER_ENABLED','true');mock.auth.mockResolvedValue({user:{id:'member'}});mock.rights.mockResolvedValue({plan:'free',syncState:'verified'});});
afterEach(()=>vi.unstubAllEnvs());
it('puts one login-method reminder beside the free member purchase button',async()=>{
  const html=renderToStaticMarkup(await ProOffer());expect(html).toContain('data-pro-start');expect(html).toContain('アプリで購入済みの方は');
});
it('shows neither a purchase button nor a login reminder to an existing paid member',async()=>{
  mock.rights.mockResolvedValue({plan:'pro'});const html=renderToStaticMarkup(await ProOffer());
  expect(html).toContain('利用中です');expect(html).not.toContain('data-pro-start');expect(html).not.toContain('購入済みの方は');
});
it('does not present an unknown member as free during a database outage',async()=>{
  mock.rights.mockRejectedValue(new Error('DB unavailable'));const html=renderToStaticMarkup(await ProOffer());
  expect(html).toContain('購入状況を確認できません');expect(html).not.toContain('data-pro-start');
});
it('shows the normal purchase entrance before login without reading an entitlement',async()=>{
  mock.auth.mockResolvedValue(null);const html=renderToStaticMarkup(await ProOffer());
  expect(html).toContain('data-pro-start');expect(mock.rights).not.toHaveBeenCalled();
});
