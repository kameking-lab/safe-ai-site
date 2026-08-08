#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const isWindows = process.platform === "win32";
const vitest = resolve(
  root,
  isWindows ? "node_modules/.bin/vitest.cmd" : "node_modules/.bin/vitest",
);
const result = spawnSync(
  vitest,
  [
    "run",
    "src/lib/legal-rag-evaluation-2026-08-02.test.ts",
    "--reporter=verbose",
  ],
  {
    cwd: root,
    encoding: "utf8",
    shell: isWindows,
    env: { ...process.env, TZ: "Asia/Tokyo" },
  },
);

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
process.exit(result.status ?? 1);
