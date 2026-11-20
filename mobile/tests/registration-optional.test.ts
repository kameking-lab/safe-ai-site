import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

// App Store 5.1.1(v): every Pro entry point works without registering.
it('alerts screen saves a location and buys Pro without sign-in', async () => {
  const source = await read('../src/components/native-weather-panel.tsx');
  expect(source).toContain("if(method==='POST')await ensureSession();");
  expect(source).toContain('startProPurchase()');
  expect(source).not.toMatch(/<a href="\/account">ログイン<\/a>/);
});

it('the app header names the purchase screen Pro, not membership', async () => {
  const source = await read('../src/components/shared-shell.tsx');
  expect(source).not.toContain('会員・Pro');
  expect(source).toContain("'anzen-session-rejected'");
});

it('the shared chat never tells an app user that member login is required', async () => {
  const source = await read('../../web/src/components/chatbot-panel.tsx');
  expect(source).toContain('failure.code === "UNAUTHORIZED" && isAnzenNativeBuild()');
});

it('the deletion panel is hidden when there is no account at all', async () => {
  const source = await read('../src/components/account-deletion-panel.tsx');
  expect(source).toContain('if(!hasAccount&&!receipt)return null;');
});
