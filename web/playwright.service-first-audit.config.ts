import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.SERVICE_FIRST_BASE_URL ?? "http://localhost:3310";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "service-first-browser-audit.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
