/**
 * Read-only Search Console credential probe.
 *
 * The output is deliberately restricted to credential presence, validation
 * stage, HTTP status, sanitized OAuth error code, and access to one of the
 * known production properties. Tokens, client identifiers, service-account
 * addresses, and raw provider responses are never printed.
 */
import { GoogleAuth } from "google-auth-library";

const PRODUCTION_PROPERTIES = new Set([
  "sc-domain:anzen-ai-portal.jp",
  "https://www.anzen-ai-portal.jp/",
  "https://anzen-ai-portal.jp/",
]);
const READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function parseCredentialJson(raw) {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function safeOAuthError(value) {
  return typeof value === "string" && /^[a-z0-9_-]{1,80}$/i.test(value)
    ? value
    : "unknown";
}

async function listSites(accessToken) {
  const response = await fetch(
    "https://searchconsole.googleapis.com/webmasters/v3/sites",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) {
    return {
      api_access: false,
      http_status: response.status,
      production_property_access: false,
      production_property: null,
      permission_level: null,
    };
  }
  const payload = await response.json();
  const property = (payload.siteEntry ?? []).find(
    (entry) =>
      PRODUCTION_PROPERTIES.has(entry?.siteUrl) &&
      typeof entry?.permissionLevel === "string" &&
      entry.permissionLevel !== "siteUnverifiedUser",
  );
  return {
    api_access: true,
    http_status: response.status,
    production_property_access: Boolean(property),
    production_property: property?.siteUrl ?? null,
    permission_level: property?.permissionLevel ?? null,
  };
}

async function probeServiceAccount(envName) {
  const raw = process.env[envName];
  const credentials = parseCredentialJson(raw);
  if (!raw?.trim()) {
    return {
      source: envName,
      configured: false,
      parsed: false,
      token_acquired: false,
      api_access: false,
      production_property_access: false,
      status: "missing-credential",
    };
  }
  if (
    !credentials ||
    credentials.type !== "service_account" ||
    typeof credentials.client_email !== "string" ||
    typeof credentials.private_key !== "string"
  ) {
    return {
      source: envName,
      configured: true,
      parsed: false,
      token_acquired: false,
      api_access: false,
      production_property_access: false,
      status: "invalid-credential",
    };
  }

  try {
    const auth = new GoogleAuth({ credentials, scopes: [READONLY_SCOPE] });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const accessToken =
      typeof token === "string" ? token : token && token.token;
    if (!accessToken) {
      return {
        source: envName,
        configured: true,
        parsed: true,
        token_acquired: false,
        api_access: false,
        production_property_access: false,
        status: "invalid-credential",
      };
    }
    const result = await listSites(accessToken);
    return {
      source: envName,
      configured: true,
      parsed: true,
      token_acquired: true,
      ...result,
      status: result.production_property_access
        ? "active"
        : result.api_access
          ? "blocked-external"
          : "invalid-credential",
    };
  } catch (error) {
    return {
      source: envName,
      configured: true,
      parsed: true,
      token_acquired: false,
      api_access: false,
      production_property_access: false,
      error_class:
        error && error.constructor ? error.constructor.name : "unknown",
      status: "invalid-credential",
    };
  }
}

async function probeOAuth() {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) {
    return {
      configured: false,
      token_acquired: false,
      api_access: false,
      production_property_access: false,
      status: "missing-credential",
    };
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (
      !response.ok ||
      typeof payload.access_token !== "string" ||
      !payload.access_token
    ) {
      return {
        configured: true,
        token_acquired: false,
        api_access: false,
        production_property_access: false,
        http_status: response.status,
        oauth_error: safeOAuthError(payload.error),
        status: "invalid-credential",
      };
    }
    const result = await listSites(payload.access_token);
    return {
      configured: true,
      token_acquired: true,
      ...result,
      status: result.production_property_access
        ? "active"
        : result.api_access
          ? "blocked-external"
          : "invalid-credential",
    };
  } catch (error) {
    return {
      configured: true,
      token_acquired: false,
      api_access: false,
      production_property_access: false,
      error_class:
        error && error.constructor ? error.constructor.name : "unknown",
      status: "invalid-credential",
    };
  }
}

const serviceAccounts = [];
for (const envName of [
  "GA4_SERVICE_ACCOUNT_JSON",
  "GOOGLE_APPLICATION_CREDENTIALS_JSON",
]) {
  serviceAccounts.push(await probeServiceAccount(envName));
}

const serviceAccountReady = serviceAccounts.some(
  (result) => result.production_property_access,
);
const oauth = serviceAccountReady
  ? {
      configured: Boolean(
        process.env.GSC_OAUTH_CLIENT_ID?.trim() &&
          process.env.GSC_OAUTH_CLIENT_SECRET?.trim() &&
          process.env.GSC_OAUTH_REFRESH_TOKEN?.trim(),
      ),
      attempted: false,
      status: "not-applicable",
      reason: "higher-priority-service-account-active",
    }
  : { attempted: true, ...(await probeOAuth()) };

process.stdout.write(
  `${JSON.stringify({
    service_accounts: serviceAccounts,
    oauth,
    tokens_included: false,
    account_addresses_included: false,
    credential_values_included: false,
  })}\n`,
);
