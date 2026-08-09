import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_SAFETY_PORT ?? "3314";
const host = process.env.PLAYWRIGHT_SAFETY_HOST ?? "localhost";
const baseURL = process.env.PLAYWRIGHT_SAFETY_BASE_URL ?? `http://${host}:${port}`;
const useLocalServer = !process.env.PLAYWRIGHT_SAFETY_BASE_URL;

export default defineConfig({
  testDir: "./e2e-safety",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-safety" }]],
  use: {
    baseURL,
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: useLocalServer
    ? {
        command: `npm run start -- --hostname ${host} --port ${port}`,
        env: {
          VERCEL_ENV: "production",
          NEXT_PUBLIC_VERCEL_ENV: "production",
          GEMINI_EXTERNAL_AI_ENABLED: "false",
          DATABASE_URL: "",
          POSTGRES_URL: "",
          PRISMA_DATABASE_URL: "",
        },
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], browserName: "chromium" },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"], browserName: "firefox" },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], browserName: "webkit" },
    },
    {
      name: "mobile-390",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
