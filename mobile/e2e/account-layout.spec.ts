import { test, expect } from './fixtures';
import product from '../../web/src/lib/mobile/product-policy.json' with { type: 'json' };

// A real press spans two events. Account data can arrive between them.
for (const arrival of ['membership', 'details'] as const) test(`deletion keeps the first press when ${arrival} arrive during pointer down`, async ({ page, context }) => {
  const host = 'https://www.anzen-ai-portal.jp';
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3213', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-anzen-native,x-anzen-csrf,authorization' };
  let releaseMember!: () => void;
  const member = new Promise<void>(resolve => { releaseMember = resolve; });
  let requestedMember!: () => void;
  const requested = new Promise<void>(resolve => { requestedMember = resolve; });
  let prepares = 0;
  await context.route('https://**/*', route => route.abort());
  await context.route(host + '/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    if (path.endsWith('/billing/config')) data = { ready: false, publicKey: null, productId: null, offeringId: null, policy: product, login: { apple: true, google: true }, terms: host + '/terms', privacy: host + '/privacy', manage: 'https://apps.apple.com/account/subscriptions' };
    else if (path === '/api/me/entitlements') {
      if (arrival === 'membership') { requestedMember(); await member; }
      data = { plan: 'free', source: null, syncState: 'verified', expiresAt: null, appUserId: '88888888-1111-4111-8111-111111111111', verifiedAt: new Date().toISOString(), limits: product.limits.free };
    } else if (path.endsWith('/account/delete')) {
      expect(route.request().postDataJSON().action).toBe('prepare'); prepares++;
      data = { id: '88888888-2222-4222-8222-222222222222', confirmation: 'c'.repeat(43), receipt: 'r'.repeat(43), expiresAt: new Date(Date.now() + 600000).toISOString(), subject: 'member-a' };
    } else if (path.endsWith('/account')) {
      if (arrival === 'details') { requestedMember(); await member; }
      data = { displayName: '試験会員', email: null, sdsHistory: [] };
    }
    else return route.fulfill({ status: 503, headers, json: { error: { code: 'UNAVAILABLE' } } });
    await route.fulfill({ headers, json: data });
  });
  await page.exposeBinding('releaseMemberOnPress', () => { releaseMember(); });
  await context.addInitScript(() => {
    document.addEventListener('pointerdown', event => {
      if ((event.target as Element)?.textContent === 'アカウント削除を開始') {
        void (window as unknown as { releaseMemberOnPress: () => Promise<void> }).releaseMemberOnPress();
      }
    }, { once: true });
  });
  try {
    await page.goto('/account/'); await requested;
    const start = page.getByRole('button', { name: 'アカウント削除を開始', exact: true });
    await start.scrollIntoViewIfNeeded();
    const before = await start.boundingBox();
    // This is the physical press duration, not an added readiness wait.
    await start.click({ delay: 200 });
    await expect(page.getByText('無料会員', { exact: true })).toBeVisible();
    await expect(page.getByLabel('確認のため「削除」と入力')).toBeVisible();
    expect(prepares).toBe(1);
    const after = await start.boundingBox();
    expect(before).not.toBeNull(); expect(after).not.toBeNull();
    // Browser scroll coordinates may round by a fraction of a CSS pixel.
    expect(Math.abs(after!.x - before!.x)).toBeLessThan(1);
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
  } finally { releaseMember(); }
});
