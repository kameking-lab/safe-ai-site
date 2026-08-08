#!/usr/bin/env node

import { closeSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const webRoot = process.cwd();
const port = Number(process.env.LOCAL_AUDIT_PORT ?? 3320);
const evidenceRoot = resolve(
  process.env.LOCAL_AUDIT_EVIDENCE_ROOT ??
    "../docs/audits/evidence/best-in-class-resume-2026-07-26",
);
const baseUrl = `http://127.0.0.1:${port}`;

if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("LOCAL_AUDIT_PORT must be an unprivileged TCP port");
}

mkdirSync(evidenceRoot, { recursive: true });
try {
  await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) });
  throw new Error(`LOCAL_AUDIT_PORT ${port} already has an HTTP listener`);
} catch (error) {
  if (
    error instanceof Error &&
    error.message.includes("already has an HTTP listener")
  ) {
    throw error;
  }
}

const stdoutPath = resolve(evidenceRoot, "production-server.stdout.log");
const stderrPath = resolve(evidenceRoot, "production-server.stderr.log");
const stdout = openSync(stdoutPath, "a");
const stderr = openSync(stderrPath, "a");
const nextCli = resolve(webRoot, "node_modules/next/dist/bin/next");

const child = spawn(
  process.execPath,
  [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    cwd: webRoot,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", stdout, stderr],
    env: {
      ...process.env,
      RESEND_API_KEY: "",
      RESEND_AUDIENCE_ID: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      GEMINI_API_KEY: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      UPSTASH_REDIS_REST_URL: "",
      AUTOMATION_CONSULT_RECIPIENTS: "",
      AUTOMATION_CONSULT_STATE_HASH_SECRET: "",
    },
  },
);
child.unref();
closeSync(stdout);
closeSync(stderr);

writeFileSync(
  resolve(evidenceRoot, "production-server.pid"),
  `${child.pid}\n`,
  "utf8",
);

let ready = false;
let status = null;
for (let attempt = 0; attempt < 60; attempt += 1) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  try {
    const response = await fetch(baseUrl, {
      signal: AbortSignal.timeout(2_000),
    });
    status = response.status;
    if (status === 200) {
      ready = true;
      break;
    }
  } catch {
    // Server startup is polled until the fixed timeout.
  }
}

process.stdout.write(
  `${JSON.stringify(
    {
      pid: child.pid,
      port,
      baseUrl,
      ready,
      status,
      stdoutPath,
      stderrPath,
    },
    null,
    2,
  )}\n`,
);

if (!ready) process.exitCode = 1;
