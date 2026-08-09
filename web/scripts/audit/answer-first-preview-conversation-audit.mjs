#!/usr/bin/env node

/**
 * Run the fixed Answer-first API and browser cases against an SSO-protected
 * Vercel Preview without weakening Deployment Protection.
 *
 * An in-memory, redirect-blocked fetch is the authenticated transport. A
 * short-lived loopback proxy lets the existing Playwright spec execute the
 * deployed HTML, chunks, and chatbot SSE responses unchanged. Request bodies
 * and the protection secret are never placed in argv, logs, or files.
 * The audit requires an existing, explicitly supplied Vercel automation
 * bypass secret. It never creates or changes Deployment Protection settings.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

function readArgument(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const deploymentId = readArgument("deployment-id");
const productionDeploymentId = readArgument("production-deployment-id");
if (!/^dpl_[A-Za-z0-9]+$/u.test(deploymentId ?? "")) {
  throw new Error("--deployment-id must be an immutable Vercel deployment ID");
}
if (!/^dpl_[A-Za-z0-9]+$/u.test(productionDeploymentId ?? "")) {
  throw new Error(
    "--production-deployment-id must identify the current production deployment",
  );
}
if (deploymentId === productionDeploymentId) {
  throw new Error("Preview and production deployment IDs must differ");
}

const configuredProtectionBypassSecret =
  process.env.ANSWER_FIRST_PREVIEW_BYPASS_SECRET ??
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
if (!configuredProtectionBypassSecret?.trim()) {
  throw new Error(
    "Set ANSWER_FIRST_PREVIEW_BYPASS_SECRET to an existing Vercel automation bypass secret; the audit will not create one",
  );
}
const protectionBypassSecret = configuredProtectionBypassSecret.trim();

const repositoryRoot = path.resolve(process.cwd(), "..");
const configuredOutputDirectory = readArgument("out");
if (
  !configuredOutputDirectory ||
  !path.isAbsolute(configuredOutputDirectory)
) {
  throw new Error("--out must be an explicit absolute repository-external directory");
}
const outputDirectory = path.resolve(configuredOutputDirectory);
const relativeOutputDirectory = path.relative(repositoryRoot, outputDirectory);
if (
  relativeOutputDirectory === "" ||
  (!relativeOutputDirectory.startsWith(`..${path.sep}`) &&
    relativeOutputDirectory !== "..")
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
  throw new Error("The linked Vercel project is not the Safe AI production project");
}
let deployment = "";
await mkdir(outputDirectory, { recursive: true });

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

function childEnvironment(extra = {}) {
  const environment = { ...process.env };
  delete environment.ANSWER_FIRST_PREVIEW_BYPASS_SECRET;
  delete environment.VERCEL_AUTOMATION_BYPASS_SECRET;
  return { ...environment, ...extra };
}

const requestLog = [];
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

async function readLimitedBody(response) {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("Preview response exceeded the 16 MiB audit limit");
  }
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Preview response exceeded the 16 MiB audit limit");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, length);
}

async function runProtectedRequest({
  requestPath,
  method,
  headers,
  body,
  streamResponse = false,
}) {
  const requestStartedAt = performance.now();
  const target = new URL(requestPath, deployment);
  if (target.origin !== deployment) {
    throw new Error("Preview transport rejected a cross-origin target");
  }
  const response = await fetch(target, {
    method,
    headers: {
      accept: headers.accept ?? "*/*",
      ...(headers["content-type"]
        ? { "content-type": headers["content-type"] }
        : {}),
      origin: deployment,
      "sec-fetch-site": "same-origin",
      "x-vercel-protection-bypass": protectionBypassSecret,
    },
    body: body.length > 0 ? body : undefined,
    redirect: "manual",
    signal: AbortSignal.timeout(120_000),
  });
  const responseHeaders = Object.fromEntries(response.headers.entries());
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error("Preview response exceeded the 16 MiB audit limit");
  }
  const logEntry = {
    method,
    path: target.pathname,
    status: response.status,
    aiUsed: responseHeaders["x-ai-used"] ?? null,
    cacheHit: responseHeaders["x-cache-hit"] ?? null,
    previewMode: responseHeaders["x-safe-ai-preview-mode"] ?? null,
  };
  if (streamResponse) logEntry.requestStartedAt = requestStartedAt;
  requestLog.push(logEntry);
  if (streamResponse) {
    return {
      status: response.status,
      headers: responseHeaders,
      bodyStream: response.body,
      logEntry,
    };
  }
  const responseBody = await readLimitedBody(response);
  return { status: response.status, headers: responseHeaders, body: responseBody };
}

const responseCache = new Map();
const waiting = [];
let active = 0;

async function withSlot(operation) {
  if (active >= 6) await new Promise((resolve) => waiting.push(resolve));
  active += 1;
  try {
    return await operation();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

async function previewResponse(input) {
  const cacheKey = input.method === "GET" ? input.requestPath : null;
  if (cacheKey && responseCache.has(cacheKey)) return responseCache.get(cacheKey);
  const pending = withSlot(() => runProtectedRequest(input));
  if (cacheKey) responseCache.set(cacheKey, pending);
  try {
    return await pending;
  } catch (error) {
    if (cacheKey) responseCache.delete(cacheKey);
    throw error;
  }
}

function collectRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    request.on("data", (chunk) => {
      length += chunk.length;
      if (length > 64 * 1024) {
        reject(new Error("Preview audit request body exceeded 64 KiB"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.once("end", () => resolve(Buffer.concat(chunks)));
    request.once("error", reject);
  });
}

let loopbackOrigin = "";
let postsEnabled = false;
const allowedPostPaths = new Set([
  "/api/chat",
  "/api/chatbot",
  "/api/chatbot/stream",
]);
const allowedReadPaths = new Set([
  "/",
  "/chatbot",
  "/api/chatbot/cache-stats",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/favicon.ico",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/manifest.json",
  "/offline.html",
  "/print.css",
  "/robots.txt",
  "/sw.js",
]);
const allowedPublicAssetPrefixes = [
  "/icons/",
  "/images/",
  "/mascot/",
  "/visual-refresh/",
];
const loopbackAddresses = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);

const proxy = createServer(async (request, response) => {
  try {
    if (!loopbackAddresses.has(request.socket.remoteAddress ?? "")) {
      response.writeHead(403).end();
      return;
    }
    if (!request.url?.startsWith("/") || request.url.startsWith("//")) {
      response.writeHead(400).end();
      return;
    }
    const url = new URL(request.url ?? "/", loopbackOrigin);
    const requestPath = `${url.pathname}${url.search}`;
    const method = (request.method ?? "GET").toUpperCase();
    if (!["GET", "HEAD", "POST"].includes(method)) {
      response.writeHead(405, { allow: "GET, HEAD, POST" }).end();
      return;
    }
    if (
      (method === "GET" || method === "HEAD") &&
      !allowedReadPaths.has(url.pathname) &&
      !url.pathname.startsWith("/_next/") &&
      !allowedPublicAssetPrefixes.some((prefix) =>
        url.pathname.startsWith(prefix),
      )
    ) {
      response.writeHead(404).end();
      return;
    }
    if (method === "POST") {
      if (!postsEnabled || !allowedPostPaths.has(url.pathname)) {
        response.writeHead(405, { allow: "GET, HEAD" }).end();
        return;
      }
      if (!/^application\/json(?:;|$)/iu.test(request.headers["content-type"] ?? "")) {
        response.writeHead(415).end();
        return;
      }
    }
    const body = await collectRequestBody(request);
    const source = await previewResponse({
      requestPath,
      method,
      headers: request.headers,
      body,
      streamResponse:
        method === "POST" && url.pathname === "/api/chatbot/stream",
    });
    const responseHeaders = { ...source.headers };
    for (const header of [
      "connection",
      "content-encoding",
      "content-length",
      "keep-alive",
      "set-cookie",
      "transfer-encoding",
      "x-vercel-protection-bypass",
    ]) {
      delete responseHeaders[header];
    }
    if (responseHeaders.location) {
      const location = new URL(responseHeaders.location, deployment);
      if (location.origin !== deployment) {
        throw new Error("Preview proxy rejected a cross-origin redirect");
      }
      responseHeaders.location = `${loopbackOrigin}${location.pathname}${location.search}${location.hash}`;
    }
    response.writeHead(source.status, responseHeaders);
    if (method === "HEAD") {
      response.end();
    } else if (source.bodyStream) {
      const reader = source.bodyStream.getReader();
      let streamByteCount = 0;
      let streamChunkCount = 0;
      let firstChunkLatencyMs = null;
      response.flushHeaders();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamByteCount += value.byteLength;
        if (streamByteCount > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          throw new Error("Preview stream exceeded the 16 MiB audit limit");
        }
        if (firstChunkLatencyMs === null) {
          firstChunkLatencyMs = Math.round(
            performance.now() - source.logEntry.requestStartedAt,
          );
        }
        streamChunkCount += 1;
        response.write(Buffer.from(value));
      }
      source.logEntry.streamByteCount = streamByteCount;
      source.logEntry.streamChunkCount = streamChunkCount;
      source.logEntry.firstChunkLatencyMs = firstChunkLatencyMs;
      source.logEntry.flushedBeforeCompletion = streamChunkCount > 0;
      delete source.logEntry.requestStartedAt;
      response.end();
    } else {
      response.end(source.body);
    }
  } catch (error) {
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined);
      return;
    }
    response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : String(error));
  }
});

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function runChild(command, args, env, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: childEnvironment(env),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
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
    child.once("error", reject);
    child.once("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

async function inspectPreviewDeployment() {
  const executable = vercelCommand();
  const readMetadata = async (id) => {
    const result = await runChild(
      executable.command,
      [
        ...executable.prefix,
        "api",
        `/v13/deployments/${encodeURIComponent(id)}?teamId=${linkedProject.orgId}`,
      ],
      {},
      repositoryRoot,
    );
    if (result.code !== 0) {
      throw new Error(
        `Unable to inspect deployment ${id} (${result.code}): ${result.stderr.slice(-800)}`,
      );
    }
    try {
      return JSON.parse(result.stdout);
    } catch {
      throw new Error(`Vercel returned invalid metadata for deployment ${id}`);
    }
  };
  const [metadata, productionMetadata, productionAliasMetadata] =
    await Promise.all([
      readMetadata(deploymentId),
      readMetadata(productionDeploymentId),
      readMetadata("www.anzen-ai-portal.jp"),
    ]);
  const resolvedTarget =
    metadata.customEnvironment?.slug ?? metadata.target ?? "preview";
  const ownerId = metadata.ownerId ?? metadata.team?.id;
  if (
    metadata.id !== deploymentId ||
    metadata.projectId !== linkedProject.projectId ||
    ownerId !== linkedProject.orgId ||
    metadata.name !== linkedProject.projectName ||
    resolvedTarget !== "preview" ||
    metadata.readyState !== "READY"
  ) {
    throw new Error(
      "Deployment metadata does not prove a READY Preview owned by the linked Safe AI project",
    );
  }
  if (
    productionAliasMetadata.id !== productionDeploymentId ||
    productionAliasMetadata.projectId !== linkedProject.projectId ||
    (productionAliasMetadata.ownerId ?? productionAliasMetadata.team?.id) !==
      linkedProject.orgId ||
    productionAliasMetadata.target !== "production" ||
    productionAliasMetadata.readyState !== "READY"
  ) {
    throw new Error(
      "The supplied production ID is not currently serving www.anzen-ai-portal.jp",
    );
  }
  const productionOwnerId =
    productionMetadata.ownerId ?? productionMetadata.team?.id;
  if (
    productionMetadata.id !== productionDeploymentId ||
    productionMetadata.projectId !== linkedProject.projectId ||
    productionOwnerId !== linkedProject.orgId ||
    productionMetadata.name !== linkedProject.projectName ||
    productionMetadata.target !== "production" ||
    productionMetadata.readyState !== "READY"
  ) {
    throw new Error(
      "The supplied production ID is not the linked project's READY production deployment",
    );
  }
  const origin = new URL(`https://${metadata.url}`);
  if (
    origin.protocol !== "https:" ||
    origin.port ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    !origin.hostname.endsWith(".vercel.app")
  ) {
    throw new Error("Preview metadata returned an invalid immutable deployment URL");
  }
  const productionAliases = new Set([
    "www.anzen-ai-portal.jp",
    "anzen-ai-portal.jp",
    "safe-ai-site.vercel.app",
  ]);
  if (
    productionAliases.has(origin.hostname) ||
    (metadata.alias ?? []).some((alias) => productionAliases.has(alias))
  ) {
    throw new Error("The proposed Preview deployment carries a production alias");
  }
  deployment = origin.origin;
  return {
    id: metadata.id,
    projectId: metadata.projectId,
    ownerId,
    target: resolvedTarget,
    readyState: metadata.readyState,
    url: metadata.url,
    verifiedProductionId: productionMetadata.id,
  };
}

async function proveDeploymentProtection() {
  const response = await fetch(`${deployment}/`, {
    headers: { accept: "text/html" },
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  const location = response.headers.get("location");
  const locationUrl = location ? new URL(location, deployment) : null;
  const server = response.headers.get("server") ?? "";
  const protectedRedirect =
    [302, 303, 307, 308].includes(response.status) &&
    server.toLowerCase() === "vercel" &&
    locationUrl?.hostname === "vercel.com" &&
    locationUrl.pathname.startsWith("/sso-api");
  if (!protectedRedirect) {
    throw new Error(
      `Unauthenticated Preview probe did not prove Vercel Deployment Protection (status ${response.status})`,
    );
  }
  return {
    status: response.status,
    protectedRedirect,
    server,
  };
}

function includesRobotsDirective(value, directive) {
  return (value ?? "")
    .toLowerCase()
    .split(",")
    .map((entry) => entry.trim())
    .includes(directive);
}

async function assertGetOnlyPreviewBoundary() {
  const emptyBody = Buffer.alloc(0);
  const [home, chatbot, robots] = await Promise.all([
    previewResponse({
      requestPath: "/",
      method: "GET",
      headers: { accept: "text/html" },
      body: emptyBody,
    }),
    previewResponse({
      requestPath: "/chatbot",
      method: "GET",
      headers: { accept: "text/html" },
      body: emptyBody,
    }),
    previewResponse({
      requestPath: "/robots.txt",
      method: "GET",
      headers: { accept: "text/plain" },
      body: emptyBody,
    }),
  ]);
  for (const [name, response] of [
    ["home", home],
    ["chatbot", chatbot],
    ["robots", robots],
  ]) {
    if (response.status !== 200) {
      throw new Error(`Preview ${name} GET returned ${response.status}`);
    }
    if (response.headers["x-safe-ai-preview-mode"] !== "dry-run") {
      throw new Error(`Preview ${name} GET did not prove dry-run mode`);
    }
    const robotsHeader = response.headers["x-robots-tag"];
    for (const directive of ["noindex", "nofollow", "noarchive"]) {
      if (!includesRobotsDirective(robotsHeader, directive)) {
        throw new Error(`Preview ${name} GET is missing ${directive}`);
      }
    }
  }
  const robotsText = robots.body.toString("utf8");
  if (!/^User-agent:\s*\*\s*$[\s\S]*^Disallow:\s*\/\s*$/imu.test(robotsText)) {
    throw new Error("Preview robots.txt does not disallow every crawler path");
  }
  if (/^Sitemap:/imu.test(robotsText)) {
    throw new Error("Preview robots.txt must not expose a sitemap");
  }
  return {
    homeStatus: home.status,
    chatbotStatus: chatbot.status,
    robotsStatus: robots.status,
  };
}

async function inspectRuntimeBoundary() {
  const browser = await chromium.launch({ headless: true });
  const observedRequests = [];
  try {
    const context = await browser.newContext({
      locale: "ja-JP",
      serviceWorkers: "allow",
      timezoneId: "Asia/Tokyo",
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          "safe-ai:optional-tracking-consent:v1",
          "granted",
        );
      } catch {
        // The navigation document will run this init script again with an origin.
      }
      globalThis.__safeAiServiceWorkerRegisterAttempts = 0;
      if (typeof ServiceWorkerContainer === "undefined") return;
      const original = ServiceWorkerContainer.prototype.register;
      ServiceWorkerContainer.prototype.register = function (...args) {
        globalThis.__safeAiServiceWorkerRegisterAttempts += 1;
        return original.apply(this, args);
      };
    });
    page.on("request", (request) => observedRequests.push(request.url()));
    const response = await page.goto(`${loopbackOrigin}/`, {
      waitUntil: "networkidle",
      timeout: 180_000,
    });
    await page.waitForTimeout(17_000);
    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    const browserState = await page.evaluate(async () => ({
      registrationCount:
        "serviceWorker" in navigator
          ? (await navigator.serviceWorker.getRegistrations()).length
          : 0,
      registerAttemptCount:
        globalThis.__safeAiServiceWorkerRegisterAttempts ?? 0,
      controllerPresent: Boolean(navigator.serviceWorker?.controller),
    }));
    await context.close();
    const trackerRequests = observedRequests.filter((url) =>
      /google-analytics|googletagmanager|googlesyndication|doubleclick/iu.test(url),
    );
    const rumRequests = observedRequests.filter((url) =>
      /\/api\/(?:rum|stats\/page-analytics)(?:[/?]|$)/iu.test(url),
    );
    const serviceWorkerScriptRequests = observedRequests.filter((url) =>
      /\/sw\.js(?:[?#]|$)/iu.test(url),
    );
    // The loopback proxy and the immutable Preview deployment are the same
    // logical site.  Next metadata may emit an absolute Preview URL (for
    // example an icon), which must not be reported as third-party traffic.
    // Everything outside these two exact origins remains fail-closed.
    const sameSiteOrigins = new Set([loopbackOrigin, deployment]);
    const previewControlPlaneOrigins = new Set(["https://vercel.live"]);
    const previewControlPlaneRequests = observedRequests.filter((value) => {
      try {
        return previewControlPlaneOrigins.has(new URL(value).origin);
      } catch {
        return false;
      }
    });
    const externalRequests = observedRequests.filter((value) => {
      try {
        const url = new URL(value);
        return (
          ["http:", "https:"].includes(url.protocol) &&
          !sameSiteOrigins.has(url.origin) &&
          !previewControlPlaneOrigins.has(url.origin)
        );
      } catch {
        return false;
      }
    });
    const externalRequestOrigins = [
      ...new Set(externalRequests.map((value) => new URL(value).origin)),
    ].sort();
    return {
      status: response?.status() ?? null,
      ...browserState,
      trackerRequestCount: trackerRequests.length,
      rumRequestCount: rumRequests.length,
      serviceWorkerScriptRequestCount: serviceWorkerScriptRequests.length,
      previewControlPlaneRequestCount: previewControlPlaneRequests.length,
      externalRequestCount: externalRequests.length,
      externalRequestOrigins,
      passed:
        response?.status() === 200 &&
        browserState.registrationCount === 0 &&
        browserState.registerAttemptCount === 0 &&
        !browserState.controllerPresent &&
        trackerRequests.length === 0 &&
        rumRequests.length === 0 &&
        serviceWorkerScriptRequests.length === 0 &&
        externalRequests.length === 0,
    };
  } finally {
    await browser.close();
  }
}

const browserEvidencePath = path.join(
  outputDirectory,
  "conversation-evaluation-browser.json",
);
const apiEvidencePath = path.join(
  outputDirectory,
  "conversation-evaluation-preview.json",
);
const playwrightLogPath = path.join(outputDirectory, "playwright.log");
const evaluationLogPath = path.join(outputDirectory, "api-evaluation.log");
const electricHoldoutEvidencePath = path.join(
  outputDirectory,
  "electric-holdout-json-api-preview.json",
);
const electricHoldoutBrowserEvidencePath = path.join(
  outputDirectory,
  "electric-holdout-browser-sse-preview.json",
);
const electricHoldoutLogPath = path.join(
  outputDirectory,
  "electric-holdout-preview.log",
);
const playwrightOutputDirectory = path.join(
  outputDirectory,
  "playwright-artifacts",
);
let playwrightResult;
let evaluationResult;
let electricHoldoutResult;
let deploymentMetadata;
let protectionProbe;
let getOnlyBoundary;

try {
  await Promise.all(
    [
      browserEvidencePath,
      apiEvidencePath,
      playwrightLogPath,
      evaluationLogPath,
      electricHoldoutEvidencePath,
      electricHoldoutBrowserEvidencePath,
      electricHoldoutLogPath,
      path.join(outputDirectory, "preview-conversation-audit.json"),
    ].map((filePath) => unlink(filePath).catch(() => undefined)),
  );
  deploymentMetadata = await inspectPreviewDeployment();
  protectionProbe = await proveDeploymentProtection();
  getOnlyBoundary = await assertGetOnlyPreviewBoundary();
  postsEnabled = true;
  await listen(proxy);
  const address = proxy.address();
  if (!address || typeof address === "string") {
    throw new Error("Loopback proxy did not expose a TCP port");
  }
  loopbackOrigin = `http://127.0.0.1:${address.port}`;

  const playwrightCli = path.resolve("node_modules/playwright/cli.js");
  playwrightResult = await runChild(
    process.execPath,
    [
      playwrightCli,
      "test",
      "--config=playwright.preview-chatbot.config.ts",
      "e2e/answer-first-chatbot-cases.spec.ts",
      "e2e/electric-chatbot-conversation.spec.ts",
      "e2e/electric-chatbot-deployed-holdout.spec.ts",
      "--workers=1",
    ],
    {
      PLAYWRIGHT_PORT: String(address.port),
      PLAYWRIGHT_HOST: "127.0.0.1",
      PLAYWRIGHT_REUSE_EXISTING_SERVER: "true",
      ANSWER_FIRST_BROWSER_EVIDENCE_PATH: browserEvidencePath,
      ELECTRIC_HOLDOUT_BROWSER_EVIDENCE_PATH:
        electricHoldoutBrowserEvidencePath,
      ANSWER_FIRST_PLAYWRIGHT_OUTPUT_DIR: playwrightOutputDirectory,
      // Playwright's AI-copy error snapshot includes the current conversation.
      // Disable it even on failure so raw synthetic questions never become an
      // evidence attachment; trace/video/screenshot are also off in the config.
      PLAYWRIGHT_NO_COPY_PROMPT: "1",
    },
  );
  await writeFile(
    playwrightLogPath,
    `${JSON.stringify({ exitCode: playwrightResult.code })}\n`,
    "utf8",
  );
  if (playwrightResult.code !== 0) {
    throw new Error(`Preview Playwright failed (${playwrightResult.code})`);
  }

  evaluationResult = await runChild(
    process.execPath,
    [path.resolve("scripts/answer-first-conversation-eval.mjs")],
    {
      ANSWER_FIRST_BASE_URL: loopbackOrigin,
      ANSWER_FIRST_ROUTE_IDS: "json,legacy",
      ANSWER_FIRST_API_SAFETY_MODE: "non-pii",
      ANSWER_FIRST_EVIDENCE_PATH: apiEvidencePath,
      ANSWER_FIRST_BROWSER_EVIDENCE_PATH: browserEvidencePath,
    },
  );
  await writeFile(
    evaluationLogPath,
    `${JSON.stringify({ exitCode: evaluationResult.code })}\n`,
    "utf8",
  );
  if (evaluationResult.code !== 0) {
    throw new Error(`Preview API evaluation failed (${evaluationResult.code})`);
  }

  electricHoldoutResult = await runChild(
    process.execPath,
    [
      path.resolve("node_modules/vitest/vitest.mjs"),
      "run",
      "src/lib/electric-chatbot-deployed-holdout.test.ts",
      "--maxWorkers=1",
    ],
    {
      ELECTRIC_HOLDOUT_BASE_URL: loopbackOrigin,
      ELECTRIC_HOLDOUT_EVIDENCE_PATH: electricHoldoutEvidencePath,
    },
  );
  await writeFile(
    electricHoldoutLogPath,
    `${JSON.stringify({ exitCode: electricHoldoutResult.code })}\n`,
    "utf8",
  );
  if (electricHoldoutResult.code !== 0) {
    throw new Error(
      `Preview electric holdout failed (${electricHoldoutResult.code})`,
    );
  }

  const [
    browserReport,
    apiReport,
    electricHoldoutReport,
    electricHoldoutBrowserReport,
  ] = await Promise.all([
    readFile(browserEvidencePath, "utf8").then(JSON.parse),
    readFile(apiEvidencePath, "utf8").then(JSON.parse),
    readFile(electricHoldoutEvidencePath, "utf8").then(JSON.parse),
    readFile(electricHoldoutBrowserEvidencePath, "utf8").then(JSON.parse),
  ]);
  const runtimeBoundary = await inspectRuntimeBoundary();
  const chatbotPosts = requestLog.filter(
    (entry) =>
      entry.method === "POST" && allowedPostPaths.has(entry.path),
  );
  const aiUsedTrue = chatbotPosts.filter((entry) => entry.aiUsed === "true");
  // The route's in-memory cache is populated only by the evidence-only local
  // path.  A warm response identifies that path with X-Cache-Hit:true even
  // though the older deployed cache-hit branch omits X-AI-Used.  Keep missing
  // headers fail-closed everywhere else.
  const aiUsedNotFalse = chatbotPosts.filter(
    (entry) =>
      entry.aiUsed !== "false" &&
      !(entry.aiUsed === null && entry.cacheHit === "true"),
  );
  const previewModeMissing = requestLog.filter(
    (entry) =>
      (entry.method === "POST" || entry.path === "/" || entry.path === "/chatbot") &&
      entry.previewMode !== "dry-run",
  );
  const jsonPostCount = chatbotPosts.filter(
    (entry) => entry.path === "/api/chatbot",
  ).length;
  const streamPostCount = chatbotPosts.filter(
    (entry) => entry.path === "/api/chatbot/stream",
  ).length;
  const legacyPostCount = chatbotPosts.filter(
    (entry) => entry.path === "/api/chat",
  ).length;
  const streamedPostCount = chatbotPosts.filter(
    (entry) =>
      entry.path === "/api/chatbot/stream" &&
      entry.streamByteCount > 0 &&
      entry.streamChunkCount > 0 &&
      entry.flushedBeforeCompletion === true &&
      entry.firstChunkLatencyMs >= 0 &&
      entry.firstChunkLatencyMs <= 30_000,
  ).length;
  const failures = [
    browserReport?.caseCount === 12 && browserReport?.cases?.length === 12
      ? null
      : "browser-case-coverage",
    apiReport?.fixture?.caseCount === 12 &&
    apiReport?.fixture?.apiCaseCountPerRoute === 11 &&
    apiReport?.routes?.length === 2 &&
    apiReport.routes[0]?.route === "json" &&
    apiReport.routes[0]?.cases?.length === 11 &&
    apiReport.routes[1]?.route === "legacy" &&
    apiReport.routes[1]?.cases?.length === 11 &&
    apiReport?.scope?.apiPiiCaseIncluded === false
      ? null
      : "api-case-coverage",
    jsonPostCount === 99 && streamPostCount === 101 && legacyPostCount === 11
      ? null
      : "deployed-request-coverage",
    streamedPostCount === 101 ? null : "deployed-sse-stream-coverage",
    electricHoldoutReport?.passed === true &&
    electricHoldoutReport?.requestCount === 88 &&
    electricHoldoutReport?.metrics?.totalCases === 72 &&
    electricHoldoutReport?.metrics?.passedCases === 72 &&
    electricHoldoutReport?.externalAiUsedCount === 0
      ? null
      : "electric-holdout",
    electricHoldoutBrowserReport?.passed === true &&
    electricHoldoutBrowserReport?.route === "deployed-browser-sse-ui" &&
    electricHoldoutBrowserReport?.requestCount === 88 &&
    electricHoldoutBrowserReport?.fixture?.caseCount === 72 &&
    electricHoldoutBrowserReport?.fixture?.turnCount === 88 &&
    electricHoldoutBrowserReport?.fixture?.checksumUnchanged === true &&
    electricHoldoutBrowserReport?.fixture?.checksumSha256 ===
      electricHoldoutReport?.fixture?.checksumSha256 &&
    electricHoldoutBrowserReport?.metrics?.totalCases === 72 &&
    electricHoldoutBrowserReport?.metrics?.passedCases === 72 &&
    electricHoldoutBrowserReport?.metrics?.totalTurns === 88 &&
    electricHoldoutBrowserReport?.expandedEvidenceTurnCount === 88 &&
    electricHoldoutBrowserReport?.structuredAnswerTurnCount === 88 &&
    electricHoldoutBrowserReport?.quickReplyAlignedTurnCount === 88 &&
    electricHoldoutBrowserReport?.externalAiUsedCount === 0 &&
    electricHoldoutBrowserReport?.rawQuestionLeakCount === 0 &&
    electricHoldoutBrowserReport?.privacy?.rawQuestionPersistedInEvidence ===
      false
      ? null
      : "electric-browser-holdout",
    browserReport?.metrics?.answerFirstRate === 1
      ? null
      : "browser-answer-first",
    browserReport?.metrics?.substantiveAnswerRate === 1
      ? null
      : "browser-substantive-answer",
    browserReport?.metrics?.majorBranchCoverageRate === 1
      ? null
      : "browser-major-branch-coverage",
    browserReport?.metrics?.citationSupportRate === 1
      ? null
      : "browser-citation-support",
    browserReport?.metrics?.contextRetentionRate === 1
      ? null
      : "browser-context-retention",
    apiReport?.passed ? null : "api-evaluation",
    aiUsedTrue.length === 0 && aiUsedNotFalse.length === 0
      ? null
      : "external-ai-used-or-unproven",
    previewModeMissing.length === 0 ? null : "preview-mode-header",
    runtimeBoundary.passed ? null : "preview-runtime-boundary",
  ].filter(Boolean);
  const report = {
    generatedAt: new Date().toISOString(),
    deployment,
    deploymentMetadata,
    productionDeploymentId,
    protectionProbe,
    getOnlyBoundary,
    authenticatedTransport:
      "in-memory protected fetch via loopback-only browser proxy",
    apiRoutes: ["json", "legacy"],
    browserRoute: "sse",
    fixedCaseCount: 12,
    evaluationScopes: {
      fixedConversation12: {
        relationToElectricalHoldout: "additional fixed conversation set",
        browser: {
          route: "deployed-browser-sse-ui",
          caseCount: browserReport?.caseCount ?? 0,
          piiCase: "local preflight; zero deployed POST",
        },
        api: {
          routes: ["deployed-json-api", "deployed-legacy-json-api"],
          caseCountPerRoute: apiReport?.fixture?.apiCaseCountPerRoute ?? 0,
          piiCase: "excluded; browser preflight is authoritative",
        },
      },
      frozenElectrical72: {
        checksumSha256:
          electricHoldoutReport?.fixture?.checksumSha256 ?? null,
        jsonApi: { caseCount: 72, turnCount: 88 },
        browserSseUi: { caseCount: 72, turnCount: 88 },
      },
    },
    electricHoldoutCaseCount: electricHoldoutReport?.metrics?.totalCases ?? 0,
    electricHoldoutPassedCaseCount:
      electricHoldoutReport?.metrics?.passedCases ?? 0,
    electricHoldoutMetrics: electricHoldoutReport?.metrics ?? null,
    electricHoldoutBrowserCaseCount:
      electricHoldoutBrowserReport?.metrics?.totalCases ?? 0,
    electricHoldoutBrowserPassedCaseCount:
      electricHoldoutBrowserReport?.metrics?.passedCases ?? 0,
    electricHoldoutBrowserMetrics:
      electricHoldoutBrowserReport?.metrics ?? null,
    browserCaseCount: browserReport?.caseCount ?? 0,
    apiCaseCount: apiReport?.fixture?.caseCount ?? 0,
    apiPassed: Boolean(apiReport?.passed),
    browserMetrics: browserReport?.metrics ?? null,
    overallMetrics: apiReport?.overall ?? null,
    chatbotPostCount: chatbotPosts.length,
    jsonPostCount,
    streamPostCount,
    legacyPostCount,
    streamedPostCount,
    externalAiUsedCount: aiUsedTrue.length,
    aiUsedNotFalseCount: aiUsedNotFalse.length,
    previewModeMissingCount: previewModeMissing.length,
    runtimeBoundary,
    cacheEntryCount: responseCache.size,
    requestLog,
    failures,
    passed: failures.length === 0,
  };
  await writeFile(
    path.join(outputDirectory, "preview-conversation-audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        deployment,
        passed: report.passed,
        fixedCaseCount: report.fixedCaseCount,
        chatbotPostCount: report.chatbotPostCount,
        externalAiUsedCount: report.externalAiUsedCount,
        failures: report.failures,
        outputDirectory,
      },
      null,
      2,
    )}\n`,
  );
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  if (playwrightResult && !(await fileExists(playwrightLogPath))) {
    await writeFile(
      playwrightLogPath,
      `${JSON.stringify({ exitCode: playwrightResult.code })}\n`,
      "utf8",
    );
  }
  if (evaluationResult && !(await fileExists(evaluationLogPath))) {
    await writeFile(
      evaluationLogPath,
      `${JSON.stringify({ exitCode: evaluationResult.code })}\n`,
      "utf8",
    );
  }
  if (electricHoldoutResult && !(await fileExists(electricHoldoutLogPath))) {
    await writeFile(
      electricHoldoutLogPath,
      `${JSON.stringify({ exitCode: electricHoldoutResult.code })}\n`,
      "utf8",
    );
  }
  throw error;
} finally {
  postsEnabled = false;
  await close(proxy).catch(() => undefined);
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}
