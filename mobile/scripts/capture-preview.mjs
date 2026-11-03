import { chromium, devices } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import { server } from './serve.mjs';
if (!server.listening) await once(server, 'listening');
const browser = await chromium.launch();
try {
  await mkdir('test-results/previews', { recursive: true });
  for (const [name, options] of [['phone', devices['iPhone 13']], ['desktop', { viewport: { width: 1440, height: 1000 } }]]) {
    const context = await browser.newContext(options);
    await context.route('https://**/*', route => route.abort());
    await context.addInitScript(() => Object.defineProperty(navigator, 'onLine', { get: () => false }));
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3213');
    await page.getByText('オフライン · 保存した情報を表示').waitFor();
    await page.screenshot({ path: `test-results/previews/${name}-news.png`, fullPage: true });
    await page.getByRole('button', { name: '事故統計', exact: true }).click();
    await page.screenshot({ path: `test-results/previews/${name}-statistics.png`, fullPage: true });
    await context.close();
  }
} finally { await browser.close(); server.close(); }
