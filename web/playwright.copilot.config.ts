import { defineConfig, devices } from "@playwright/test";

// Minimal Playwright config for the Copilot 3-feature journey test.
// Uses an externally-managed dev/prod server (so it skips the cross-env
// quirk that the default config has on Windows) and only runs e2e specs
// whose path matches "copilot".
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  testMatch: /copilot-journey/,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
