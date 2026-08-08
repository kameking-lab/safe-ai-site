import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.SERVICE_FIRST_BASE_URL;
const storageState = process.env.PLAYWRIGHT_STORAGE_STATE;

if (!baseURL || !storageState) {
  throw new Error(
    "SERVICE_FIRST_BASE_URL and PLAYWRIGHT_STORAGE_STATE are required for the protected Preview audit.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    storageState,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "protected-preview-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
