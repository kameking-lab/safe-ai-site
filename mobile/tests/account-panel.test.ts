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
