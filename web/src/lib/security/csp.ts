const GOOGLE_SCRIPT_ORIGINS = [
  "https://www.googletagmanager.com",
  "https://pagead2.googlesyndication.com",
] as const;

export type CspBuildOptions = {
  nonce: string;
  development: boolean;
  secureTransport?: boolean;
};

function compactDirectives(directives: string[]): string {
  return directives.filter(Boolean).join("; ");
}

/**
 * Next.js App Router向けのrequest-scoped CSP。
 * production strict policyはscript-src unsafe-inline/unsafe-evalを含まない。
 */
export function buildContentSecurityPolicy({
  nonce,
  development,
  secureTransport = true,
}: CspBuildOptions): string {
  const scriptSources = [
    "'self'",
    ...(development
      ? [
          // Next.js dev/Turbopack emits framework bootstrap scripts without
          // request nonce propagation. A nonce in the same directive would
          // make browsers ignore unsafe-inline, so development deliberately
          // omits it. This exception never reaches Preview or production
          // because both run with NODE_ENV=production.
          "'unsafe-inline'",
          "'unsafe-eval'",
        ]
      : [`'nonce-${nonce}'`, "'strict-dynamic'"]),
    ...GOOGLE_SCRIPT_ORIGINS,
  ];

  return compactDirectives([
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "script-src-attr 'none'",
    // React style属性、地図座標、印刷・forced-colors補助が多数あるため、
    // styleはscriptと分離して現段階ではunsafe-inlineを維持する。
    "style-src 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://pagead2.googlesyndication.com",
    "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    development || !secureTransport ? "" : "upgrade-insecure-requests",
  ]);
}

/**
 * Previewでstrict policyをReport-Only検証するときの互換用enforced policy。
 * nonceを含めないため、CSP Level 3ブラウザーでも既存inline scriptを妨げない。
 * productionでは使用しない。
 */
export function buildPreviewEnforcedContentSecurityPolicy(
  development: boolean,
  secureTransport = true,
): string {
  return compactDirectives([
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""} ${GOOGLE_SCRIPT_ORIGINS.join(" ")}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://pagead2.googlesyndication.com",
    "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    development || !secureTransport ? "" : "upgrade-insecure-requests",
  ]);
}

export function createCspNonce(): string {
  return Buffer.from(crypto.randomUUID(), "utf8").toString("base64");
}
