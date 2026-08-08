import "server-only";

/**
 * Preview safety is selected only by trusted server/platform environment.
 * Query strings, headers, cookies, and request bodies can never enable it.
 *
 * SAFE_AI_STAGING_MODE is a local/custom-staging fail-safe. Setting it to true
 * only removes capabilities, so an accidental production setting fails closed.
 */
export function isPreviewSafetyMode(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.VERCEL_ENV === "preview" ||
    env.SAFE_AI_STAGING_MODE?.trim().toLowerCase() === "true"
  );
}

/** Paid/credentialed outbound services must not run in preview safety mode. */
export function externalCredentialedServicesAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return !isPreviewSafetyMode(env);
}

/**
 * External generative AI requires both the general credentialed-service gate
 * and an explicit production release flag. A key by itself never activates
 * paid inference.
 */
export function externalGenerativeAiAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    externalCredentialedServicesAllowed(env) &&
    env.GEMINI_EXTERNAL_AI_ENABLED?.trim().toLowerCase() === "true"
  );
}

const PREVIEW_SAFE_MUTATION_PATHS = new Set([
  "/contact/automation-email/draft",
  "/api/accident-news/search",
  "/api/accidents/analyze",
  "/api/automation-consult",
  "/api/chat",
  "/api/chatbot",
  "/api/chatbot/no-script",
  "/api/chatbot/stream",
  "/api/chemical-ra",
  "/api/chemical/legal-profile",
  "/api/chemical/mixture-suggest",
  "/api/chemical/sds-extract",
  "/api/chemical/search",
  "/api/construction-calc",
  "/api/export-preview",
  "/api/goods-chat",
  "/api/ky-assist",
  "/api/ky/suggest",
  "/api/law-summary",
  "/api/meeting/suggest",
  "/api/quiz-explain",
  "/api/ra/auto",
  "/api/safety-alert",
  "/api/sds/search",
  "/api/translate/article",
]);

const PREVIEW_BLOCKED_READ_PREFIXES = [
  "/api/auth/",
  "/api/cron/",
  "/api/newsletter/",
  "/api/seo/notify-search-console",
  "/api/stripe/",
  "/api/webhooks/",
];

/**
 * Preview APIs are deny-by-default for state-changing methods. The allowlist
 * contains only local computation/fallback routes plus the dedicated
 * automation-consult dry-run route.
 */
export function shouldBlockPreviewRequest(
  method: string,
  pathname: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!isPreviewSafetyMode(env)) return false;
  const normalizedMethod = method.toUpperCase();
  if (
    PREVIEW_BLOCKED_READ_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix),
    )
  ) {
    return true;
  }
  if (
    normalizedMethod === "POST" ||
    normalizedMethod === "PUT" ||
    normalizedMethod === "PATCH" ||
    normalizedMethod === "DELETE"
  ) {
    return !PREVIEW_SAFE_MUTATION_PATHS.has(pathname);
  }
  return false;
}
