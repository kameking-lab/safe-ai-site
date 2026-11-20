import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { AccountPanel } from '../src/components/account-panel';

it('shows enabled purchase and restore buttons before the guest or store price has loaded', () => {
  const page = renderToStaticMarkup(createElement(AccountPanel));
  for (const label of ['Proにする（月額）', '購入を復元']) {
    const button = Array.from(page.matchAll(/<button\b[^>]*>([^<]+)<\/button>/g)).find(([, text]) => text === label);
    expect(button?.[0]).toBeDefined();
    expect(button?.[0]).not.toContain('disabled');
  }
});

// App Store 5.1.1(v): registration must be optional and never look like a step before purchase.
it('puts purchase before the optional sign-in and never says the visitor must log in', () => {
  const page = renderToStaticMarkup(createElement(AccountPanel));
  expect(page).toContain('<h1 class="text-2xl font-bold">安全AI Pro</h1>');
  expect(page).not.toContain('会員・');
  expect(page).not.toContain('ログインしていません');
  expect(page).toContain('アカウント登録なしで購入・復元できます。');
  const purchase = page.indexOf('Proにする（月額）');
  const restore = page.indexOf('購入を復元');
  const signIn = page.indexOf('Apple / Googleで連携（任意）');
  expect(purchase).toBeGreaterThan(-1);
  expect(signIn).toBeGreaterThan(restore);
  expect(restore).toBeGreaterThan(purchase);
});

// App Store 3.1.1: no button that opens web (Stripe) billing inside the app.
it('has no web billing button', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/components/account-panel.tsx', import.meta.url), 'utf8');
  expect(source).not.toContain('/api/stripe/portal');
  expect(source).not.toContain('billing.stripe.com');
});
