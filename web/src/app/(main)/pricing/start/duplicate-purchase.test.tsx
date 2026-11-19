import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {AutoCheckout} from './auto-checkout';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it.each([['GOOGLE','Google'],['APPLE','Apple'],['GOOGLE_APPLE','Google / Apple']])('shows only the paid login method (%s) instead of opening Checkout',async(suffix,provider)=>{
  const fetch=vi.fn(async()=>Response.json({error:{code:`DUPLICATE_SUBSCRIPTION_${suffix}`}}, {status:409}));
  vi.stubGlobal('fetch',fetch);render(<AutoCheckout returnTo={null}/>);
  expect((await screen.findByRole('alert')).textContent).toBe(`このメールアドレスの別のアカウント（${provider}）で購入済みです。そちらでログインしてください。`);
  expect(fetch).toHaveBeenCalledOnce();
});
