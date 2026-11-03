import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir: './e2e', fullyParallel: true, workers: 3, retries: 0,
  use: { baseURL: 'http://127.0.0.1:3213', trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:3213', reuseExistingServer: false },
  projects: [{ name: 'chromium-phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }, { name: 'webkit-phone', use: { ...devices['iPhone 13'] } }, { name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
