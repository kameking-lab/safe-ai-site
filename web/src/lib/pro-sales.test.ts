import { expect, it } from 'vitest';
import { appStoreSalesReady } from './pro-sales';

it('allows App Store sales independently of OAuth while requiring server verification', () => {
  const settings = {
    NODE_ENV: 'test',
    MOBILE_IAP_ENABLED: 'true', MOBILE_LEDGER_ENABLED: 'true',
    REVENUECAT_IOS_PUBLIC_SDK_KEY: 'fixture', REVENUECAT_IOS_PRODUCT_ID: 'fixture', REVENUECAT_IOS_OFFERING_ID: 'fixture',
    REVENUECAT_SECRET_API_KEY: 'fixture', REVENUECAT_V2_SECRET_API_KEY: 'fixture', REVENUECAT_PROJECT_ID: 'fixture',
    REVENUECAT_IOS_V2_PRODUCT_ID: 'fixture', REVENUECAT_WEBHOOK_AUTHORIZATION: 'fixture',
  } satisfies NodeJS.ProcessEnv;
  expect(appStoreSalesReady(settings)).toBe(true);
  expect(appStoreSalesReady({ ...settings, REVENUECAT_V2_SECRET_API_KEY: '' })).toBe(false);
});
