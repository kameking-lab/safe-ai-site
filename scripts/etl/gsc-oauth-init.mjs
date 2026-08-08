/**
 * One-time local helper: obtain a Google OAuth refresh token for the
 * Search Console API.
 *
 * Background: service-account access to GSC is structurally impossible for
 * personal Gmail-owned properties (Google rejects the service-account email
 * at "Add user"). The runtime therefore authenticates as the property owner
 * using a long-lived refresh token. This script performs the one-time consent
 * flow that produces that token.
 *
 * Usage:
 *   GSC_OAUTH_CLIENT_ID=...       \
 *   GSC_OAUTH_CLIENT_SECRET=...   \
 *   GSC_OAUTH_OUTPUT_FILE=/absolute/path/outside/repository/gsc-token.env \
 *   node scripts/etl/gsc-oauth-init.mjs
 *
 * The script:
 *   1. Starts a localhost HTTP listener on port 8765.
 *   2. Opens a browser to Google's consent screen for the
 *      webmasters.readonly scope, with access_type=offline and
 *      prompt=consent so a refresh token is always returned.
 *   3. Receives the authorization code at /oauth2/callback.
 *   4. Exchanges the code for an access + refresh token pair.
 *   5. Writes the refresh token to an explicitly named file outside the
 *      repository. POSIXでは0600を要求する。WindowsではmodeだけでACLを保証
 *      できないため、出力先ACLを事前確認し、直ちにsecret managerへ移して
 *      ローカルファイルを安全に削除する。Token values are never printed.
 *
 * The redirect URI registered in the GCP OAuth client MUST be exactly:
 *   http://localhost:8765/oauth2/callback
 */

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { URL } from "node:url";
import { writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CLIENT_ID = process.env.GSC_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_OAUTH_CLIENT_SECRET;
const OUTPUT_FILE_RAW = process.env.GSC_OAUTH_OUTPUT_FILE;
const PORT = 8765;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2/callback`;
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function fail(message) {
  console.error(`[gsc-oauth-init] ${message}`);
  process.exit(1);
}

if (!CLIENT_ID) fail("GSC_OAUTH_CLIENT_ID is not set.");
if (!CLIENT_SECRET) fail("GSC_OAUTH_CLIENT_SECRET is not set.");
if (!OUTPUT_FILE_RAW || !isAbsolute(OUTPUT_FILE_RAW)) {
  fail(
    "GSC_OAUTH_OUTPUT_FILE must be an absolute path outside the repository.",
  );
}

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const OUTPUT_FILE = resolve(OUTPUT_FILE_RAW);
const outputRelativeToRepository = relative(REPOSITORY_ROOT, OUTPUT_FILE);
if (
  outputRelativeToRepository === "" ||
  (!outputRelativeToRepository.startsWith("..") &&
    !isAbsolute(outputRelativeToRepository))
) {
  fail("GSC_OAUTH_OUTPUT_FILE must be outside the repository.");
}

const state = randomBytes(16).toString("hex");

const authUrl = new URL(AUTH_ENDPOINT);
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");
authUrl.searchParams.set("state", state);

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === "win32" ? "cmd" : platform === "darwin" ? "open" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", '""', url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
  } catch {
    // Non-fatal: the user can copy the URL manually.
  }
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok)
    throw new Error(`token exchange failed with HTTP ${resp.status}`);
  try {
    return await resp.json();
  } catch {
    throw new Error("token exchange returned invalid JSON");
  }
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("bad request");
    return;
  }
  const u = new URL(req.url, `http://localhost:${PORT}`);
  if (u.pathname !== "/oauth2/callback") {
    res.writeHead(404).end("not found");
    return;
  }

  const error = u.searchParams.get("error");
  if (error) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`OAuth error: ${error}`);
    console.error(`[gsc-oauth-init] OAuth error: ${error}`);
    server.close();
    process.exit(1);
  }

  const returnedState = u.searchParams.get("state");
  if (returnedState !== state) {
    res.writeHead(400).end("state mismatch");
    console.error("[gsc-oauth-init] state mismatch — aborting.");
    server.close();
    process.exit(1);
  }

  const code = u.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("missing code");
    server.close();
    process.exit(1);
  }

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(
        "No refresh_token in response. Re-run after revoking the existing grant at https://myaccount.google.com/permissions",
      );
      console.error("[gsc-oauth-init] Response did not include refresh_token.");
      server.close();
      process.exit(1);
    }

    writeFileSync(
      OUTPUT_FILE,
      `GSC_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      '<!doctype html><meta charset="utf-8"><title>GSC OAuth complete</title>' +
        '<body style="font-family:system-ui;padding:2rem;max-width:480px;margin:auto">' +
        "<h1>Refresh token saved.</h1>" +
        "<p>The token value was not displayed. You can close this tab.</p>" +
        "</body>",
    );

    console.log(`[gsc-oauth-init] Refresh token saved to ${OUTPUT_FILE}.`);
    console.log(
      "[gsc-oauth-init] The token value was not printed. Move it to the secret manager, then securely remove the local file.",
    );
    if (process.platform === "win32") {
      console.log(
        "[gsc-oauth-init] Windows notice: mode 0600 does not prove the file ACL; verify the destination ACL before use.",
      );
    }

    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 250);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Token exchange failed: ${message}`);
    console.error(`[gsc-oauth-init] ${message}`);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[gsc-oauth-init] Listening on ${REDIRECT_URI}`);
  console.log("[gsc-oauth-init] Opening browser. If it does not open, visit:");
  console.log("");
  console.log(authUrl.toString());
  console.log("");
  console.log(
    "Sign in with the configured GSC property-owner account and approve the webmasters.readonly scope.",
  );
  openBrowser(authUrl.toString());
});

server.on("error", (e) => {
  fail(`Failed to start local listener on port ${PORT}: ${e.message}`);
});
