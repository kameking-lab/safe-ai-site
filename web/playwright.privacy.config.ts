import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PRIVACY_PORT ?? "3311";
const serverUrl = `http://127.0.0.1:${port}`;
const browserUrl = `http://app.localtest.me:${port}`;

export default defineConfig({
  testDir: "./e2e-privacy",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: browserUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 0.0.0.0 --port ${port}`,
    env: {
      NEXT_DIST_DIR: ".cache/playwright-privacy-next",
      NEXT_PUBLIC_API_MODE: "live",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-PRIVACYTEST1",
      NEXT_PUBLIC_ADSENSE_PUB_ID: "ca-pub-0000000000000000",
      VERCEL_ENV: "production",
    },
    url: serverUrl,
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [{ name: "chromium-privacy", use: { ...devices["Desktop Chrome"] } }],
});
