#!/usr/bin/env node

/**
 * Fail-closed external-operations smoke for an SSO-protected Vercel Preview.
 *
 * The caller supplies immutable Preview and current-production deployment IDs.
 * It fails before network access when the pre-existing bypass is unavailable,
 * then authenticates read-only Vercel metadata before transmitting that secret.
 * Authenticated application
 * requests use Node's in-memory fetch headers because `vercel curl` eventually
 * copies its bypass header into a native curl argv. The secret is therefore
 * never placed in a child environment, argv, output, or a file.
 *
 * Mutating requests are denied by a local allowlist. Only the fixed synthetic
 * automation dry-run and the RUM fail-closed probe can issue POST requests, and
 * both run only after the Preview noindex/robots boundary has passed.
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const deploymentId = readArgument("deployment-id");
const productionDeploymentId = readArgument("production-deployment-id");
if (!/^dpl_[A-Za-z0-9]+$/u.test(deploymentId ?? "")) {
  throw new Error("--deployment-id must be an immutable Vercel deployment ID");
}
if (!/^dpl_[A-Za-z0-9]+$/u.test(productionDeploymentId ?? "")) {
  throw new Error(
    "--production-deployment-id must be the immutable current production deployment ID",
  );
}
if (deploymentId === productionDeploymentId) {
  throw new Error("Preview and production deployment IDs must differ");
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const linkedProject = JSON.parse(
  await readFile(path.join(repositoryRoot, ".vercel", "project.json"), "utf8"),
);
if (
  linkedProject.projectId !== "prj_b2brgXdwQpnpmEN6gc3vtNFm6m7a" ||
  linkedProject.orgId !== "team_fmzwEegB8SRsADNmwXkBUN34" ||
  linkedProject.projectName !== "safe-ai-site" ||
  linkedProject.settings?.rootDirectory !== "web"
) {
  throw new Error(".vercel/project.json is not the linked Safe AI web project");
}

const SAFE_REQUESTS = new Map([
  [
    "GET",
    new Set([
      "/",
      "/robots.txt",
      "/sitemap.xml",
      "/services/automation",
      "/heat-illness-prevention",
      "/heat-illness-prevention/slides",
      "/heat-illness-prevention/elearning",
      "/api/internal/external-operations-probe",
    ]),
  ],
  ["POST", new Set(["/api/automation-consult", "/api/rum"])],
]);
const PRODUCTION_HOSTS = new Set([
  "www.anzen-ai-portal.jp",
  "anzen-ai-portal.jp",
  "safe-ai-site.vercel.app",
]);
const MAX_CLI_OUTPUT_BYTES = 16 * 1024 * 1024;
const MAX_HTTP_BODY_BYTES = 8 * 1024 * 1024;

let deployment = "";
let protectionBypassSecret = "";
let requestSequence = 0;
const requestLog = [];

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

function sanitizedChildEnvironment() {
  const environment = { ...process.env };
  delete environment.ANSWER_FIRST_PREVIEW_BYPASS_SECRET;
  delete environment.VERCEL_AUTOMATION_BYPASS_SECRET;
  delete environment.VERCEL_DEBUG;
  delete environment.DEBUG;
  return environment;
}

function redacted(value) {
  if (!protectionBypassSecret) return value;
  return value.split(protectionBypassSecret).join("[REDACTED]");
}

function runChild({ args, environment, input = null, maxOutputBytes }) {
  return new Promise((resolve, reject) => {
    const executable = vercelCommand();
    const child = spawn(executable.command, [...executable.prefix, ...args], {
      cwd: repositoryRoot,
      env: environment,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdoutChunks = [];
    let stdoutBytes = 0;
    let stderr = "";
    let outputExceeded = false;

    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxOutputBytes) {
        outputExceeded = true;
        child.kill();
        return;
      }
      stdoutChunks.push(chunk);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 64 * 1024) stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (outputExceeded) {
        reject(new Error("Vercel CLI output exceeded the audit memory limit"));
        return;
      }
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks),
        stderr: redacted(stderr),
      });
    });
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

async function readDeploymentMetadata(identifier) {
  const endpoint = `/v13/deployments/${encodeURIComponent(
    identifier,
  )}?teamId=${encodeURIComponent(
    linkedProject.orgId,
  )}`;
  const result = await runChild({
    args: ["api", endpoint],
    environment: sanitizedChildEnvironment(),
    maxOutputBytes: MAX_CLI_OUTPUT_BYTES,
  });
  if (result.code !== 0) {
    throw new Error(
      `Unable to read deployment metadata (${result.code}): ${result.stderr.slice(-800)}`,
    );
  }
  try {
    return JSON.parse(result.stdout.toString("utf8"));
  } catch {
    throw new Error("Vercel returned invalid deployment metadata");
  }
}

function deploymentOwnerId(metadata) {
  return metadata.ownerId ?? metadata.team?.id ?? null;
}

function deploymentTarget(metadata) {
  return metadata.customEnvironment?.slug ?? metadata.target ?? "preview";
}

function assertLinkedDeployment(metadata, expectedId, expectedTarget) {
  if (
    metadata.id !== expectedId ||
    metadata.projectId !== linkedProject.projectId ||
    deploymentOwnerId(metadata) !== linkedProject.orgId ||
    metadata.name !== linkedProject.projectName ||
    deploymentTarget(metadata) !== expectedTarget ||
    metadata.readyState !== "READY"
  ) {
    throw new Error(
      `${expectedTarget} metadata does not prove a READY deployment in the linked project and organization`,
    );
  }
  if (expectedTarget === "preview" && metadata.customEnvironment) {
    throw new Error("A custom environment cannot be used as the required Preview target");
  }
  if (
    typeof metadata.url !== "string" ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/iu.test(metadata.url)
  ) {
    throw new Error(`${expectedTarget} metadata returned an invalid deployment URL`);
  }
}

async function resolveDeploymentBoundary() {
  // Both calls are authenticated, read-only metadata requests. Their child
  // environments explicitly exclude every automation bypass variable.
  const [previewMetadata, productionMetadata, currentProductionMetadata] =
    await Promise.all([
      readDeploymentMetadata(deploymentId),
      readDeploymentMetadata(productionDeploymentId),
      readDeploymentMetadata("www.anzen-ai-portal.jp"),
    ]);
  assertLinkedDeployment(previewMetadata, deploymentId, "preview");
  assertLinkedDeployment(
    productionMetadata,
    productionDeploymentId,
    "production",
  );
  assertLinkedDeployment(
    currentProductionMetadata,
    productionDeploymentId,
    "production",
  );
  if (!(currentProductionMetadata.alias ?? []).includes("www.anzen-ai-portal.jp")) {
    throw new Error(
      "The supplied production deployment is not the current www.anzen-ai-portal.jp target",
    );
  }

  const productionHosts = new Set([
    ...PRODUCTION_HOSTS,
    productionMetadata.url.toLowerCase(),
  ]);
  // Vercel keeps a mutable Git-branch alias in an older deployment's alias
  // history even after assigning that alias to a fresh Preview.  Treating
  // every historical alias as a production hostname makes a valid Preview
  // impossible to audit.  The canonical production domains above, the
  // project production alias, and the immutable current-production URL remain
  // release boundaries; current www ownership was separately proven above.
  const previewHosts = [
    previewMetadata.url,
    ...(previewMetadata.alias ?? []),
  ].map((value) => value.toLowerCase());
  if (previewHosts.some((hostname) => productionHosts.has(hostname))) {
    throw new Error("The proposed Preview deployment carries a production URL or alias");
  }

  const origin = new URL(`https://${previewMetadata.url}`);
  if (
    origin.protocol !== "https:" ||
    origin.port ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("Preview metadata did not resolve to an exact HTTPS origin");
  }
  deployment = origin.origin;
  return {
    preview: {
      id: previewMetadata.id,
      projectId: previewMetadata.projectId,
      ownerId: deploymentOwnerId(previewMetadata),
      target: deploymentTarget(previewMetadata),
      readyState: previewMetadata.readyState,
      url: previewMetadata.url,
    },
    production: {
      id: productionMetadata.id,
      target: deploymentTarget(productionMetadata),
      readyState: productionMetadata.readyState,
      verifiedCurrentAlias: "www.anzen-ai-portal.jp",
    },
  };
}

async function readLimitedBody(response, maximumBytes, description) {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new Error(`${description} exceeded the declared memory limit`);
  }
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maximumBytes) {
      await reader.cancel();
      throw new Error(`${description} exceeded the streamed memory limit`);
    }
    chunks.push(value);
  }
  const combined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return Buffer.from(combined);
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
    locationUrl?.protocol === "https:" &&
    !locationUrl.port &&
    !locationUrl.username &&
    !locationUrl.password &&
    locationUrl.hostname === "vercel.com" &&
    (locationUrl.pathname === "/sso-api" ||
      locationUrl.pathname.startsWith("/sso-api/"));
  await response.body?.cancel().catch(() => undefined);
  if (!protectedRedirect) {
    throw new Error(
      `Unauthenticated Preview probe did not prove Vercel SSO protection (${response.status})`,
    );
  }
  return {
    status: response.status,
    protectedRedirect,
    server,
  };
}

function requireExistingBypassSecret() {
  const secret = process.env.ANSWER_FIRST_PREVIEW_BYPASS_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Set ANSWER_FIRST_PREVIEW_BYPASS_SECRET to an existing Vercel automation bypass secret; this audit will not create one",
    );
  }
  if (/[\u0000\r\n]/u.test(secret)) {
    throw new Error("ANSWER_FIRST_PREVIEW_BYPASS_SECRET contains invalid characters");
  }
  protectionBypassSecret = secret;
}

async function runAuthenticatedRequest({
  requestPath,
  method = "GET",
  headers = {},
  body = null,
}) {
  const normalizedMethod = method.toUpperCase();
  if (!SAFE_REQUESTS.get(normalizedMethod)?.has(requestPath)) {
    throw new Error(`Preview smoke denied ${normalizedMethod} ${requestPath}`);
  }
  if (!protectionBypassSecret) {
    throw new Error("Authenticated Preview request attempted before bypass setup");
  }
  requestSequence += 1;
  const requestHeaders = new Headers({
    Accept: "*/*",
    "Accept-Encoding": "identity",
    Origin: deployment,
    "Sec-Fetch-Site": "same-origin",
    "X-Vercel-Protection-Bypass": protectionBypassSecret,
  });
  for (const [name, value] of Object.entries(headers)) {
    requestHeaders.set(name, value);
  }
  const networkResponse = await fetch(`${deployment}${requestPath}`, {
    method: normalizedMethod,
    headers: requestHeaders,
    body,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(120_000),
  });
  const location = networkResponse.headers.get("location");
  if (location && new URL(location, deployment).origin !== deployment) {
    throw new Error(
      `Authenticated ${normalizedMethod} ${requestPath} returned a cross-origin redirect`,
    );
  }
  const response = {
    status: networkResponse.status,
    headers: Object.fromEntries(networkResponse.headers.entries()),
    body: await readLimitedBody(
      networkResponse,
      MAX_HTTP_BODY_BYTES,
      `Authenticated ${normalizedMethod} ${requestPath} response`,
    ),
  };
  requestLog.push({
    sequence: requestSequence,
    method: normalizedMethod,
    path: requestPath,
    status: response.status,
    previewMode: response.headers["x-safe-ai-preview-mode"] ?? null,
  });
  return response;
}

function includesRobotsDirective(value, directive) {
  return (value ?? "")
    .toLowerCase()
    .split(",")
    .map((entry) => entry.trim())
    .includes(directive);
}

function defaultRobotsGroup(value) {
  return (
    value
      .split(/\r?\n\s*\r?\n/gu)
      .find((group) => /^User-agent:\s*\*\s*$/imu.test(group)) ?? ""
  );
}

function assertPreviewHeaders(route, response) {
  if (response.status !== 200) {
    throw new Error(`Preview GET ${route} returned ${response.status}`);
  }
  if (response.headers["x-safe-ai-preview-mode"] !== "dry-run") {
    throw new Error(`Preview GET ${route} did not prove dry-run mode`);
  }
  for (const directive of ["noindex", "nofollow", "noarchive"]) {
    if (!includesRobotsDirective(response.headers["x-robots-tag"], directive)) {
      throw new Error(`Preview GET ${route} is missing ${directive}`);
    }
  }
}

async function runGetOnlyPreflight() {
  const routes = [...SAFE_REQUESTS.get("GET")];
  const responses = await Promise.all(
    routes.map(async (route) => [
      route,
      await runAuthenticatedRequest({ requestPath: route }),
    ]),
  );
  const byRoute = new Map(responses);
  for (const [route, response] of responses) assertPreviewHeaders(route, response);

  const robots = byRoute.get("/robots.txt").body.toString("utf8");
  if (!/^Disallow:\s*\/\s*$/imu.test(defaultRobotsGroup(robots))) {
    throw new Error("Preview robots.txt does not disallow every crawler path");
  }
  if (/^Sitemap:/imu.test(robots)) {
    throw new Error("Preview robots.txt unexpectedly advertises a sitemap");
  }

  const automationBody = byRoute.get("/services/automation").body.toString("utf8");
  const forbiddenRuntimeLoaders = [
    "googletagmanager.com/gtag/js",
    "va.vercel-scripts.com",
    "/_vercel/insights/script.js",
    "/_vercel/speed-insights/script.js",
  ].filter((marker) => automationBody.includes(marker));
  if (forbiddenRuntimeLoaders.length > 0) {
    throw new Error("Preview HTML contains an analytics or RUM loader");
  }
  const contactState = [
    "Webフォーム受付中",
    "メール相談受付中",
    "受付停止中",
  ].find((label) => automationBody.includes(label));
  if (!contactState) {
    throw new Error("Automation page does not expose its current contact state");
  }

  const searchConsole = JSON.parse(
    byRoute.get("/api/internal/external-operations-probe").body.toString("utf8"),
  );
  if (
    searchConsole.mode !== "preview-read-only" ||
    searchConsole.productionMutations !== 0 ||
    searchConsole.previewUrlsSubmitted !== 0
  ) {
    throw new Error("Preview external-operations probe did not remain read-only");
  }

  const heatIndexHold = [
    "/heat-illness-prevention",
    "/heat-illness-prevention/slides",
    "/heat-illness-prevention/elearning",
  ].map((route) => {
    const response = byRoute.get(route);
    const body = response.body.toString("utf8");
    return {
      route,
      status: response.status,
      pageNoindexFollow:
        /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex[^"']*follow/iu.test(
          body,
        ),
      previewHeaderNoindexNofollow:
        includesRobotsDirective(response.headers["x-robots-tag"], "noindex") &&
        includesRobotsDirective(response.headers["x-robots-tag"], "nofollow"),
    };
  });
  if (
    heatIndexHold.some(
      (entry) => !entry.pageNoindexFollow || !entry.previewHeaderNoindexNofollow,
    )
  ) {
    throw new Error("Heat routes did not retain their noindex boundary in Preview");
  }

  const sitemap = byRoute.get("/sitemap.xml").body.toString("utf8");
  if (sitemap.includes(deployment)) {
    throw new Error("Preview deployment URL leaked into sitemap.xml");
  }
  return {
    routeCount: responses.length,
    robotsDisallowAll: true,
    analyticsAndRumLoaders: forbiddenRuntimeLoaders,
    contactState,
    searchConsole: {
      mode: searchConsole.mode,
      productionMutations: searchConsole.productionMutations,
      previewUrlsSubmitted: searchConsole.previewUrlsSubmitted,
      access: searchConsole.searchConsole?.access ?? null,
    },
    heatIndexHold,
  };
}

async function runPostChecks() {
  const syntheticConsultation = Buffer.from(
    JSON.stringify({
      consultationType: "automation",
      name: "プレビュー検証用（架空）",
      email: "preview-smoke@example.test",
      organization: "",
      currentProblem:
        "Preview dry-run の固定合成入力です。実在する相談や個人情報ではありません。",
      desiredSupport: "実メールや外部保存を行わない境界だけを確認します。",
      currentTools: "",
      timing: "undecided",
      budget: "",
      deliveryPreference: "undecided",
      privacyConsent: true,
      website: "",
      sourcePage: "/services/automation",
    }),
  );
  const idempotencyKey = `${Date.now().toString(36)}.preview-smoke-${randomUUID()
    .replaceAll("-", "")
    .slice(0, 20)}`;

  const automationResponse = await runAuthenticatedRequest({
    requestPath: "/api/automation-consult",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: syntheticConsultation,
  });
  let automationResult;
  try {
    automationResult = JSON.parse(automationResponse.body.toString("utf8"));
  } catch {
    throw new Error("Automation dry-run returned invalid JSON");
  }
  const responseRecipientFields = Object.keys(automationResult).filter((key) =>
    /recipient|email|name|organization|problem|support/iu.test(key),
  );
  if (
    automationResponse.status !== 200 ||
    automationResponse.headers["x-safe-ai-preview-mode"] !== "dry-run" ||
    !["noindex", "nofollow", "noarchive"].every((directive) =>
      includesRobotsDirective(
        automationResponse.headers["x-robots-tag"],
        directive,
      ),
    ) ||
    automationResult.ok !== true ||
    automationResult.deliveryMode !== "dry-run" ||
    responseRecipientFields.length > 0
  ) {
    throw new Error("Automation consultation did not complete as a non-echoing dry-run");
  }

  const rumResponse = await runAuthenticatedRequest({
    requestPath: "/api/rum",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: Buffer.from('{"synthetic":"preview-fail-closed-probe"}'),
  });
  let rumResult = null;
  try {
    rumResult = JSON.parse(rumResponse.body.toString("utf8"));
  } catch {
    // Status and Preview boundary headers remain the authoritative block proof.
  }
  if (
    rumResponse.status !== 503 ||
    rumResponse.headers["x-safe-ai-preview-mode"] !== "blocked" ||
    !["noindex", "nofollow", "noarchive"].every((directive) =>
      includesRobotsDirective(rumResponse.headers["x-robots-tag"], directive),
    ) ||
    rumResult?.error?.code !== "preview_side_effect_blocked"
  ) {
    throw new Error("Preview RUM endpoint did not fail closed before collection");
  }

  return {
    automationConsult: {
      status: automationResponse.status,
      previewMode: automationResponse.headers["x-safe-ai-preview-mode"],
      deliveryMode: automationResult.deliveryMode,
      syntheticRecipientDomain: "example.test",
      responseRecipientFieldCount: responseRecipientFields.length,
    },
    rum: {
      status: rumResponse.status,
      previewMode: rumResponse.headers["x-safe-ai-preview-mode"],
      blockCode: rumResult.error.code,
    },
  };
}

requireExistingBypassSecret();
const metadata = await resolveDeploymentBoundary();
const deploymentProtection = await proveDeploymentProtection();
const getOnlyPreflight = await runGetOnlyPreflight();
const postChecks = await runPostChecks();

const output = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  deployment,
  metadata,
  authenticatedTransport: "node-fetch-in-memory-bypass-header",
  deploymentProtection,
  getOnlyPreflight,
  postChecks,
  requests: requestLog,
  accepted: true,
};
process.stdout.write(`${JSON.stringify(output)}\n`);
