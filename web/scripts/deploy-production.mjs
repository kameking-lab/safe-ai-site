#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRODUCTION_BRANCH,
  runLocalProductionPreflight,
} from "./production-deploy-guard.mjs";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(webRoot, "..");

try {
  const state = runLocalProductionPreflight({ repositoryRoot, environment: process.env });
  process.stdout.write(
    `production deploy preflight passed: ${JSON.stringify({ branch: state.branch, head: state.head })}\n`,
  );

  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(executable, ["vercel", "deploy", "--prod", "--yes"], {
    cwd: webRoot,
    env: {
      ...process.env,
      VERCEL_GIT_COMMIT_REF: PRODUCTION_BRANCH,
      VERCEL_GIT_COMMIT_SHA: state.head,
    },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
