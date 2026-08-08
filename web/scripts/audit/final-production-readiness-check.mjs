#!/usr/bin/env node

/**
 * Final production environment readiness check.
 *
 * This command is deliberately configuration-only. It does not make network
 * requests, authenticate, connect to a database, send mail/push, call Gemini,
 * create a Stripe checkout, or mutate any external state. It never includes
 * environment values in its output.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const argv = process.argv.slice(2);
const args = new Set(argv);

if (!args.has("--dry-run")) {
  process.stderr.write(
    "Refusing to run without --dry-run. This check must remain non-mutating.\n",
  );
  process.exit(2);
}

function option(name, fallback) {
  const prefix = `${name}=`;
  const item = argv.find((value) => value.startsWith(prefix));
  return item ? item.slice(prefix.length) : fallback;
}

const outputPath = resolve(
  option(
    "--output",
    "../docs/audits/evidence/final-production-candidate-2026-07-27/external-readiness/configuration-only.json",
  ),
);

const present = (name) => Boolean(process.env[name]?.trim());
const value = (name) => process.env[name]?.trim() ?? "";
const allPresent = (names) => names.every(present);
const booleanFlag = (name) => {
  const normalized = value(name).toLowerCase();
  if (!normalized) return "not_configured";
  if (normalized === "true") return "enabled";
  if (normalized === "false") return "disabled";
  return "invalid";
};
const looksLikeEmail = (candidate) =>
  /^[^\s@<>,;\r\n]+@[^\s@<>,;\r\n]+\.[^\s@<>,;\r\n]+$/.test(candidate);
const mailboxFrom = (candidate) => {
  const angle = candidate.match(/<([^<>]+)>/);
  return (angle?.[1] ?? candidate).trim();
};
const isHttpsUrl = (candidate) => {
  try {
    return new URL(candidate).protocol === "https:";
  } catch {
    return false;
  }
};
const check = (configured, valid) => ({
  configured: Boolean(configured),
  structurallyValid: Boolean(configured && valid),
});

function splitRecipients() {
  if (!present("AUTOMATION_CONSULT_RECIPIENTS")) return [];
  return value("AUTOMATION_CONSULT_RECIPIENTS")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripeMode() {
  const key = value("STRIPE_SECRET_KEY");
  if (!key) return "not_configured";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "unrecognized";
}

const recipients = splitRecipients();
const consultFrom = value("AUTOMATION_CONSULT_FROM") || value("NOTIFY_FROM");
const stateBackend =
  value("AUTOMATION_CONSULT_STATE_BACKEND").toLowerCase();
const sharedStateConfigured =
  (stateBackend === "upstash" &&
    allPresent([
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ])) ||
  (stateBackend === "postgres" && present("DATABASE_URL"));
const authConfigured = allPresent([
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
]);
const supabaseConfigured = allPresent([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);
const stripeConfigured = allPresent([
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM",
  "NEXT_PUBLIC_STRIPE_PRICE_PRO",
]);
const pushConfigured = allPresent([
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
]);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode: "configuration-only-no-network-no-secret-values",
  guarantees: {
    networkRequests: 0,
    externalWrites: 0,
    mailSent: 0,
    pushSent: 0,
    paymentsCreated: 0,
    aiInferenceCalls: 0,
    databaseConnections: 0,
    environmentValuesIncluded: false,
  },
  automationConsult: {
    recipients: {
      configured: recipients.length > 0,
      exactlyTwo: recipients.length === 2,
      duplicateFree:
        recipients.length === 2 && new Set(recipients).size === recipients.length,
      allSyntacticallyValid:
        recipients.length === 2 && recipients.every(looksLikeEmail),
      headerSafe:
        recipients.length === 2 &&
        recipients.every((item) => !/[\r\n]/.test(item)),
    },
    from: check(
      Boolean(consultFrom),
      looksLikeEmail(mailboxFrom(consultFrom)) && !/[\r\n]/.test(consultFrom),
    ),
    resendApiKey: check(
      present("RESEND_API_KEY"),
      value("RESEND_API_KEY").startsWith("re_"),
    ),
    stateBackend,
    stateBackendIsUpstash: stateBackend === "upstash",
    stateBackendIsPostgres: stateBackend === "postgres",
    sharedStateConfigured,
    upstashUrl: check(
      present("UPSTASH_REDIS_REST_URL"),
      isHttpsUrl(value("UPSTASH_REDIS_REST_URL")),
    ),
    upstashToken: check(
      present("UPSTASH_REDIS_REST_TOKEN"),
      value("UPSTASH_REDIS_REST_TOKEN").length >= 16,
    ),
    stateHashSecret: check(
      present("AUTOMATION_CONSULT_STATE_HASH_SECRET"),
      value("AUTOMATION_CONSULT_STATE_HASH_SECRET").length >= 32,
    ),
    senderDomainVerified:
      booleanFlag("AUTOMATION_CONSULT_FROM_VERIFIED"),
    bounceComplaintPolicyAcknowledged:
      booleanFlag("AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK"),
    sharedStateProbeVerified:
      booleanFlag("AUTOMATION_CONSULT_STATE_VERIFIED"),
    deliveryProbeVerified:
      booleanFlag("AUTOMATION_CONSULT_DELIVERY_VERIFIED"),
    productionDeliveryReady:
      recipients.length === 2 &&
      new Set(recipients).size === recipients.length &&
      recipients.every(looksLikeEmail) &&
      Boolean(consultFrom) &&
      looksLikeEmail(mailboxFrom(consultFrom)) &&
      present("RESEND_API_KEY") &&
      value("AUTOMATION_CONSULT_FROM_VERIFIED").toLowerCase() === "true" &&
      value("AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK").toLowerCase() ===
        "true" &&
      value("AUTOMATION_CONSULT_STATE_VERIFIED").toLowerCase() === "true" &&
      value("AUTOMATION_CONSULT_DELIVERY_VERIFIED").toLowerCase() === "true" &&
      sharedStateConfigured &&
      present("AUTOMATION_CONSULT_STATE_HASH_SECRET"),
  },
  auth: {
    credentials: check(
      authConfigured,
      value("AUTH_SECRET").length >= 32 &&
        value("AUTH_GOOGLE_ID").length >= 8 &&
        value("AUTH_GOOGLE_SECRET").length >= 8,
    ),
    siteUrlHttps: check(
      present("NEXT_PUBLIC_SITE_URL"),
      isHttpsUrl(value("NEXT_PUBLIC_SITE_URL")),
    ),
    expectedCallbackPath: "/api/auth/callback/google",
    liveLoginExecuted: false,
  },
  supabase: {
    credentials: check(
      supabaseConfigured,
      isHttpsUrl(value("NEXT_PUBLIC_SUPABASE_URL")) &&
        value("SUPABASE_SERVICE_ROLE_KEY").length >= 20,
    ),
    databaseUrl: check(
      present("DATABASE_URL"),
      /^(?:postgres|postgresql):\/\//.test(value("DATABASE_URL")),
    ),
    connectionAttempted: false,
    productionWriteAttempted: false,
  },
  gemini: {
    apiKey: check(
      present("GEMINI_API_KEY") || present("GOOGLE_API_KEY"),
      (value("GEMINI_API_KEY") || value("GOOGLE_API_KEY")).length >= 20,
    ),
    releaseFlag: booleanFlag("GEMINI_EXTERNAL_AI_ENABLED"),
    liveEvaluationExecuted: false,
  },
  stripe: {
    credentials: check(
      stripeConfigured,
      /^sk_(?:live|test)_/.test(value("STRIPE_SECRET_KEY")) &&
        value("STRIPE_WEBHOOK_SECRET").startsWith("whsec_") &&
        value("NEXT_PUBLIC_STRIPE_PRICE_PREMIUM").startsWith("price_") &&
        value("NEXT_PUBLIC_STRIPE_PRICE_PRO").startsWith("price_") &&
        value("NEXT_PUBLIC_STRIPE_PRICE_PREMIUM") !==
          value("NEXT_PUBLIC_STRIPE_PRICE_PRO"),
    ),
    secretKeyMode: stripeMode(),
    checkoutCreated: false,
    paymentExecuted: false,
  },
  push: {
    credentials: check(
      pushConfigured,
      value("NEXT_PUBLIC_VAPID_PUBLIC_KEY").length >= 40 &&
        value("VAPID_PRIVATE_KEY").length >= 20 &&
        /^(?:mailto:|https:\/\/)/.test(value("VAPID_SUBJECT")),
    ),
    releaseFlag: booleanFlag("PUSH_DELIVERY_ENABLED"),
    pushExecuted: false,
  },
  searchConsole: {
    verificationToken: check(
      present("GOOGLE_SITE_VERIFICATION"),
      /^[A-Za-z0-9_-]{20,200}$/.test(value("GOOGLE_SITE_VERIFICATION")),
    ),
    propertyWriteExecuted: false,
    sitemapSubmitted: false,
  },
  rum: {
    backend: value("RUM_SINK_BACKEND").toLowerCase() || "not_configured",
    endpoint: check(
      present("RUM_SINK_ENDPOINT"),
      isHttpsUrl(value("RUM_SINK_ENDPOINT")),
    ),
    postgresSink: check(
      value("RUM_SINK_BACKEND").toLowerCase() === "postgres",
      present("DATABASE_URL") &&
        value("RUM_RATE_LIMIT_HASH_SECRET").length >= 32,
    ),
    releaseFlag: booleanFlag("RUM_COLLECTION_ENABLED"),
    retentionDays: check(
      present("RUM_RETENTION_DAYS"),
      Number.isInteger(Number(value("RUM_RETENTION_DAYS"))) &&
        Number(value("RUM_RETENTION_DAYS")) >= 1 &&
        Number(value("RUM_RETENTION_DAYS")) <= 90,
    ),
    dpaApproval: booleanFlag("RUM_DPA_APPROVED"),
    edgeRateLimitVerified: booleanFlag("RUM_EDGE_RATE_LIMIT_VERIFIED"),
    sampleRate: check(
      present("RUM_SAMPLE_RATE"),
      Number(value("RUM_SAMPLE_RATE")) > 0 &&
        Number(value("RUM_SAMPLE_RATE")) <= 1,
    ),
    eventsSent: 0,
  },
};

const encoded = `${JSON.stringify(report, null, 2)}\n`;
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, encoded, "utf8");
const digest = createHash("sha256").update(encoded).digest("hex");
process.stdout.write(
  `${JSON.stringify({
    ok: true,
    outputPath,
    sha256: digest,
    mode: report.mode,
    environmentValuesIncluded: false,
  })}\n`,
);
