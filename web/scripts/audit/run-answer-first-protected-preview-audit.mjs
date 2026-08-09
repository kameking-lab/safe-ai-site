#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const deploymentId = argument("deployment-id");
const productionDeploymentId = argument("production-deployment-id");
const outputDirectory = argument("out");
for (const [name, value] of [
  ["deployment-id", deploymentId],
  ["production-deployment-id", productionDeploymentId],
]) {
  if (!/^dpl_[A-Za-z0-9]+$/u.test(value ?? "")) {
    throw new Error(`--${name} must be an immutable Vercel deployment ID`);
  }
}
if (!outputDirectory || !path.isAbsolute(outputDirectory)) {
  throw new Error("--out must be an absolute repository-external directory");
}

const webRoot = process.cwd();
const repositoryRoot = path.resolve(webRoot, "..");
const relativeOutput = path.relative(repositoryRoot, outputDirectory);
if (
  relativeOutput === "" ||
  (!relativeOutput.startsWith(`..${path.sep}`) && relativeOutput !== "..")
) {
  throw new Error("Preview evidence must remain outside the repository");
}

const linkedProject = JSON.parse(
  await readFile(path.join(repositoryRoot, ".vercel", "project.json"), "utf8"),
);
if (
  linkedProject.projectId !== "prj_b2brgXdwQpnpmEN6gc3vtNFm6m7a" ||
  linkedProject.orgId !== "team_fmzwEegB8SRsADNmwXkBUN34" ||
  linkedProject.projectName !== "safe-ai-site" ||
  linkedProject.settings?.rootDirectory !== "web"
) {
  throw new Error("The linked Vercel project is not Safe AI");
}

function vercelCommand() {
  if (process.platform !== "win32") return { command: "vercel", prefix: [] };
  return {
    command: process.execPath,
    prefix: [
      path.join(
        process.env.APPDATA ?? "",
        "npm",
        "node_modules",
        "vercel",
        "dist",
        "vc.js",
      ),
    ],
  };
}

const activeChildren = new Set();

function runChild(command, args, { input, env, inherit = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: webRoot,
      env: { ...process.env, ...env },
      windowsHide: true,
      stdio: inherit ? "inherit" : ["pipe", "pipe", "pipe"],
    });
    activeChildren.add(child);
    if (inherit) {
      child.once("error", (error) => {
        activeChildren.delete(child);
        reject(error);
      });
      child.once("close", (code) => {
        activeChildren.delete(child);
        resolve({ code: code ?? 1 });
      });
      return;
    }
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (stdout.length < 4 * 1024 * 1024) stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 4 * 1024 * 1024) stderr += chunk;
    });
    child.once("error", (error) => {
      activeChildren.delete(child);
      reject(error);
    });
    child.once("close", (code) => {
      activeChildren.delete(child);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.stdin.end(input);
  });
}

async function vercelApi(endpoint, method = "GET", body) {
  const executable = vercelCommand();
  const result = await runChild(executable.command, [
    ...executable.prefix,
    "api",
    endpoint,
    "-X",
    method,
    ...(body === undefined ? [] : ["--input", "-"]),
    "--raw",
  ], {
    ...(body === undefined ? {} : { input: JSON.stringify(body) }),
  });
  if (result.code !== 0) {
    throw new Error(`Vercel API ${method} failed with exit ${result.code}`);
  }
  try {
    return result.stdout ? JSON.parse(result.stdout) : {};
  } catch {
    throw new Error(`Vercel API ${method} returned invalid JSON`);
  }
}

function protectionState(project) {
  return {
    deploymentType: project?.ssoProtection?.deploymentType ?? null,
    bypassCount:
      project?.protectionBypass && typeof project.protectionBypass === "object"
        ? Object.keys(project.protectionBypass).length
        : 0,
  };
}

async function readProtectionState() {
  const project = await vercelApi(
    `/v9/projects/${encodeURIComponent(linkedProject.projectId)}?teamId=${encodeURIComponent(linkedProject.orgId)}`,
  );
  return protectionState(project);
}

const bypassEndpoint =
  `/v1/projects/${encodeURIComponent(linkedProject.projectId)}` +
  `/protection-bypass?teamId=${encodeURIComponent(linkedProject.orgId)}`;
const secret = (await import("node:crypto")).randomBytes(32).toString("base64url");
let generationAttempted = false;
let auditError = null;
let revokeError = null;
let cleanupPromise = null;
let terminating = false;

async function revokeGeneratedBypass() {
  if (!generationAttempted) return;
  cleanupPromise ??= (async () => {
    let revokeCallError = null;
    try {
      await vercelApi(bypassEndpoint, "PATCH", {
        revoke: { secret, regenerate: false },
      });
    } catch (error) {
      revokeCallError = error;
    }
    const state = await readProtectionState();
    if (
      state.deploymentType !== "all_except_custom_domains" ||
      state.bypassCount !== 0
    ) {
      throw revokeCallError ?? new Error("Preview bypass cleanup was not proven");
    }
    generationAttempted = false;
  })();
  await cleanupPromise;
}

function sanitizedFatalMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replaceAll(secret, "[REDACTED]").slice(0, 800);
}

async function terminateAfterCleanup(exitCode, error) {
  if (terminating) return;
  terminating = true;
  for (const child of activeChildren) child.kill();
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  try {
    await revokeGeneratedBypass();
  } catch {
    process.stderr.write(
      "Protected Preview audit interrupted; bypass cleanup could not be proven.\n",
    );
    process.exit(exitCode || 1);
  }
  if (error) {
    process.stderr.write(`Protected Preview audit failed: ${sanitizedFatalMessage(error)}\n`);
  }
  process.exit(exitCode);
}

const signalHandlers = {
  SIGINT: () => void terminateAfterCleanup(130),
  SIGTERM: () => void terminateAfterCleanup(143),
  uncaughtException: (error) => void terminateAfterCleanup(1, error),
  unhandledRejection: (reason) => void terminateAfterCleanup(1, reason),
};
process.once("SIGINT", signalHandlers.SIGINT);
process.once("SIGTERM", signalHandlers.SIGTERM);
process.once("uncaughtException", signalHandlers.uncaughtException);
process.once("unhandledRejection", signalHandlers.unhandledRejection);

function removeTerminationHandlers() {
  process.off("SIGINT", signalHandlers.SIGINT);
  process.off("SIGTERM", signalHandlers.SIGTERM);
  process.off("uncaughtException", signalHandlers.uncaughtException);
  process.off("unhandledRejection", signalHandlers.unhandledRejection);
}

try {
  const before = await readProtectionState();
  if (
    before.deploymentType !== "all_except_custom_domains" ||
    before.bypassCount !== 0
  ) {
    throw new Error("Preview SSO/bypass precondition is not clean");
  }

  generationAttempted = true;
  await vercelApi(bypassEndpoint, "PATCH", { generate: { secret } });
  const enabled = await readProtectionState();
  if (
    enabled.deploymentType !== "all_except_custom_domains" ||
    enabled.bypassCount !== 1
  ) {
    throw new Error("Short-lived Preview bypass was not enabled safely");
  }

  await mkdir(outputDirectory, { recursive: true });
  const externalBoundary = await runChild(
    process.execPath,
    [
      path.resolve("scripts/audit/external-operations-preview-smoke.mjs"),
      "--deployment-id",
      deploymentId,
      "--production-deployment-id",
      productionDeploymentId,
    ],
    { env: { ANSWER_FIRST_PREVIEW_BYPASS_SECRET: secret } },
  );
  if (externalBoundary.code !== 0) {
    throw new Error(
      `Preview external boundary audit failed with exit ${externalBoundary.code}`,
    );
  }
  await writeFile(
    path.join(outputDirectory, "external-operations-preview.json"),
    externalBoundary.stdout,
    "utf8",
  );

  const audit = await runChild(
    process.execPath,
    [
      path.resolve("scripts/audit/answer-first-preview-conversation-audit.mjs"),
      "--deployment-id",
      deploymentId,
      "--production-deployment-id",
      productionDeploymentId,
      "--out",
      outputDirectory,
    ],
    {
      env: { ANSWER_FIRST_PREVIEW_BYPASS_SECRET: secret },
      inherit: true,
    },
  );
  if (audit.code !== 0) {
    throw new Error(`Protected Preview audit failed with exit ${audit.code}`);
  }
} catch (error) {
  auditError = error;
} finally {
  try {
    await revokeGeneratedBypass();
  } catch (error) {
    revokeError = error;
  }
}

const after = await readProtectionState();
if (
  after.deploymentType !== "all_except_custom_domains" ||
  after.bypassCount !== 0
) {
  revokeError ??= new Error("Preview bypass cleanup could not be proven");
}
if (revokeError) {
  removeTerminationHandlers();
  throw new Error("Preview audit ended without a proven bypass cleanup");
}
if (auditError) {
  removeTerminationHandlers();
  throw auditError;
}
removeTerminationHandlers();

process.stdout.write(
  `${JSON.stringify(
    {
      passed: true,
      deploymentId,
      productionDeploymentId,
      sso: after.deploymentType,
      bypassCount: after.bypassCount,
      outputDirectory,
    },
    null,
    2,
  )}\n`,
);
