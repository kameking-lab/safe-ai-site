import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // Next resolves `server-only` to a no-op under the react-server condition.
    // Vitest uses the package's defensive throwing entrypoint unless we mirror
    // that test-only resolution.
    alias: { "server-only": "/src/test/server-only-mock.ts" },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    // Large search/data suites otherwise compete for CPU and cross the
    // per-test safety timeout without a product-code failure.
    maxWorkers: 4,
  },
});
