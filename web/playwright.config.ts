import { defineConfig, devices } from "@playwright/test";

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3310";
const playwrightHost = process.env.PLAYWRIGHT_HOST ?? "localhost";
const playwrightBaseUrl = `http://${playwrightHost}:${playwrightPort}`;
const useProductionServer =
  process.env.PLAYWRIGHT_SERVER_MODE === "production";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: playwrightBaseUrl,
    // Route-intercepted API tests must observe the page request directly;
    // a registered PWA worker can otherwise answer before Playwright routing.
    serviceWorkers: "block",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // Webpack avoids intermittent Windows Turbopack cache corruption that can
    // otherwise prevent the test server from reaching READY before any test runs.
    command: useProductionServer
      ? `npm run start -- --hostname ${playwrightHost} --port ${playwrightPort}`
      : `npm run dev -- --webpack --hostname ${playwrightHost} --port ${playwrightPort}`,
    env: {
      ...(useProductionServer
        ? {
            // Exercise the same capability boundary as an SSO-protected
            // Vercel Preview while running the already-built local server.
            VERCEL_ENV: "preview",
            VERCEL_GIT_COMMIT_SHA: "playwright-local-preview-20260802",
            CSP_STRICT_ENFORCEMENT_CANDIDATE: "true",
          }
        : { NEXT_DIST_DIR: ".cache/playwright-next" }),
      NEXT_PUBLIC_API_MODE: "live",
      // Makes the real App Router loading boundary observable long enough for
      // browser geometry/CLS checks. The page honors this only outside production.
      PLAYWRIGHT_ACCIDENT_NEWS_STREAM_DELAY_MS: "1500",
      // Browser tests use route interception; this non-secret placeholder only
      // makes the cloud-consent control testable and is never contacted.
      NEXT_PUBLIC_SUPABASE_URL: "https://playwright.invalid",
      // Safe placeholders expose the intake UI while preview safety mode keeps
      // every submission in process-local dry-run storage. No email or KV
      // request can leave the Playwright server.
      SAFE_AI_STAGING_MODE: "true",
      // Production Web form remains fail-closed when provider gates are absent.
      // Synthetic tests opt in so the form flow is exercised without external delivery.
      AUTOMATION_CONSULT_PUBLIC_STATUS: "available",
      AUTOMATION_CONSULT_RECIPIENTS:
        "safe-ai-playwright-never-send@gmail.com,safe-ai-playwright-never-send@outlook.com",
      AUTOMATION_CONSULT_FROM: "playwright-sender@example.invalid",
      RESEND_API_KEY: "re_playwright_dry_run_only",
      AUTOMATION_CONSULT_STATE_BACKEND: "upstash",
      UPSTASH_REDIS_REST_URL: "https://playwright.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "playwright-token-never-sent",
      AUTOMATION_CONSULT_STATE_HASH_SECRET:
        "playwright-only-hash-secret-at-least-32-characters",
      AUTOMATION_CONSULT_FROM_VERIFIED: "true",
      AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK: "true",
      AUTOMATION_CONSULT_STATE_VERIFIED: "true",
      AUTOMATION_CONSULT_DELIVERY_VERIFIED: "true",
      AUTOMATION_CONSULT_RETENTION_DAYS: "30",
      AUTOMATION_CONSULT_RETENTION_POLICY_ACK: "true",
      AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED: "true",
      GEMINI_EXTERNAL_AI_ENABLED: "false",
    },
    url: playwrightBaseUrl,
    // Local audit sessions may deliberately keep one isolated server alive so
    // screenshots, targeted checks, and the final suite inspect the same build.
    // CI remains fail-closed unless the caller opts in explicitly.
    reuseExistingServer:
      process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "true",
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
