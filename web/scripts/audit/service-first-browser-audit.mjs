#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

const baseUrl = option(
  "--base-url",
  process.env.SERVICE_FIRST_BASE_URL ?? "http://localhost:3310",
);
const phase = option(
  "--phase",
  process.env.SERVICE_FIRST_AUDIT_PHASE ?? "after",
);
const enforce = option(
  "--enforce",
  process.env.SERVICE_FIRST_AUDIT_ENFORCE ?? (phase === "after" ? "1" : "0"),
);
const startLocal =
  process.argv.includes("--start-local") ||
  (!process.argv.includes("--base-url") &&
    !process.env.SERVICE_FIRST_BASE_URL);
if (!/^(before|after)$/.test(phase)) {
  console.error("--phase must be before or after");
  process.exit(2);
}
if (!/^https?:\/\//.test(baseUrl)) {
  console.error("--base-url must be an http(s) URL");
  process.exit(2);
}

const root = resolve(import.meta.dirname, "../..");
const isWindows = process.platform === "win32";
const playwright = resolve(
  root,
  isWindows ? "node_modules/.bin/playwright.cmd" : "node_modules/.bin/playwright",
);
const args = [
  "test",
  "e2e/service-first-browser-audit.spec.ts",
  `--config=${
    startLocal ? "playwright.config.ts" : "playwright.service-first-audit.config.ts"
  }`,
];
const result = spawnSync(playwright, args, {
  cwd: root,
  encoding: "utf8",
  shell: isWindows,
  env: {
    ...process.env,
    SERVICE_FIRST_BASE_URL: baseUrl,
    SERVICE_FIRST_AUDIT_PHASE: phase,
    SERVICE_FIRST_AUDIT_ENFORCE: enforce,
  },
});
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
process.exit(result.status ?? 1);
