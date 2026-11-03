import { test as base, expect } from '@playwright/test';

// A missing local bundle leaves prerendered HTML visible without hydration.
// Report that failure directly instead of only a later missing UI assertion.
export const test = base.extend<{ localBundles: void }>({
  localBundles: [async ({ context }, use, info) => {
    const failures: { path: string; error: string }[] = [];
    const cancellations: { path: string; error: string }[] = [];
    context.on('requestfailed', request => {
      const url = new URL(request.url());
      const error = request.failure()?.errorText ?? 'unknown';
      if (url.origin === 'http://127.0.0.1:3213' && url.pathname.endsWith('.js')) {
        // Navigation cancels speculative/lazy requests. WebKit uses this text
        // for the same cancellation Chromium reports as net::ERR_ABORTED.
        const cancelled = error === 'net::ERR_ABORTED' || error === 'Load request cancelled';
        (cancelled ? cancellations : failures).push({ path: url.pathname, error });
      }
    });
    context.on('response', response => {
      const url = new URL(response.url());
      if (url.origin === 'http://127.0.0.1:3213' && url.pathname.endsWith('.js') && response.status() >= 400) {
        failures.push({ path: url.pathname, error: `HTTP ${response.status()}` });
      }
    });
    await use();
    await info.attach('local-bundle-cancellations', { body: JSON.stringify(cancellations), contentType: 'application/json' });
    await info.attach('local-bundle-failures', { body: JSON.stringify(failures), contentType: 'application/json' });
    expect(failures, 'All local JavaScript bundles must load for hydration').toEqual([]);
  }, { auto: true }],
});
export { expect };
