// Next.js 16 Proxy: request-scoped CSP nonce and Preview deny-by-default.
import { NextResponse, type NextRequest } from "next/server";
import {
  isPreviewSafetyMode,
  shouldBlockPreviewRequest,
} from "@/lib/server/deployment-safety";
import {
  buildContentSecurityPolicy,
  buildPreviewEnforcedContentSecurityPolicy,
  createCspNonce,
} from "@/lib/security/csp";

const NO_SCRIPT_CHATBOT_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
const PUBLIC_SAFETY_LEARNING_PATH =
  /^\/e-learning\/safety(?:\/(?:first-class-health-officer|second-class-health-officer|occupational-safety-consultant|occupational-health-consultant))?\/?$/;
const QUARANTINED_SAFETY_IMAGE_ASSET_PATH =
  /^\/safety-images\/(?:library|pilot)(?:\/|$)/;

function addCspResponseHeaders(
  response: NextResponse,
  strictPolicy: string,
  preview: boolean,
  development: boolean,
  secureTransport: boolean,
  noScriptChatbot: boolean,
): NextResponse {
  if (preview) {
    // Defense in depth for every dynamic Preview path. next.config.ts also
    // applies the same boundary to the global /(.*) matcher, including assets.
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (!response.headers.has("X-Safe-AI-Preview-Mode")) {
      response.headers.set("X-Safe-AI-Preview-Mode", "dry-run");
    }
  }
  if (noScriptChatbot) {
    // This endpoint returns a self-contained HTML document without framework
    // scripts. Keep its smaller route-level boundary enforced in every runtime;
    // the generic page CSP must not widen it after the Route Handler responds.
    response.headers.set("Content-Security-Policy", NO_SCRIPT_CHATBOT_CSP);
    response.headers.delete("Content-Security-Policy-Report-Only");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    if (!preview) {
      response.headers.set("X-Robots-Tag", "noindex, follow, noarchive");
    }
    return response;
  }
  const strictEnforcementVerified =
    !development &&
    !preview &&
    process.env.CSP_STRICT_ENFORCEMENT_VERIFIED?.trim().toLowerCase() ===
      "true";
  const strictEnforcementCandidate =
    !development &&
    preview &&
    process.env.CSP_STRICT_ENFORCEMENT_CANDIDATE?.trim().toLowerCase() ===
      "true";
  if (strictEnforcementVerified || strictEnforcementCandidate) {
    response.headers.set("Content-Security-Policy", strictPolicy);
    return response;
  }

  // Enforce the compatibility policy until a browser audit proves complete
  // framework, RSC, JSON-LD and third-party nonce coverage. A strict policy
  // that is known to report framework false positives is not useful telemetry;
  // promotion remains an explicit non-secret deployment switch above.
  response.headers.set(
    "Content-Security-Policy",
    buildPreviewEnforcedContentSecurityPolicy(development, secureTransport),
  );
  response.headers.delete("Content-Security-Policy-Report-Only");
  return response;
}

function sanitizedAuthPageUrl(request: NextRequest): URL | null {
  if (
    !["GET", "HEAD"].includes(request.method) ||
    !["/auth/error", "/auth/signin"].includes(request.nextUrl.pathname) ||
    !request.nextUrl.search
  ) {
    return null;
  }
  const sanitized = request.nextUrl.clone();
  sanitized.search = "";
  return sanitized;
}

export function proxy(request: NextRequest) {
  if (QUARANTINED_SAFETY_IMAGE_ASSET_PATH.test(request.nextUrl.pathname)) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  const nonce = createCspNonce();
  const preview = isPreviewSafetyMode();
  // Next/Turbopackの実行形式はNODE_ENVが正本。Playwright等がVercelの
  // deployment labelだけを付けたnext devを起動しても、dev runtimeのevalを
  // 誤って遮断しない。実Preview／production buildはいずれもNODE_ENV=production。
  const development = process.env.NODE_ENV !== "production";
  const forwardedProtocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "";
  const secureTransport =
    request.nextUrl.protocol === "https:" || forwardedProtocol === "https";
  const strictPolicy = buildContentSecurityPolicy({
    nonce,
    development,
    secureTransport,
  });
  const noScriptChatbot = request.nextUrl.pathname === "/api/chatbot/no-script";
  const sanitizedAuthUrl = sanitizedAuthPageUrl(request);
  if (sanitizedAuthUrl) {
    return addCspResponseHeaders(
      NextResponse.redirect(sanitizedAuthUrl, 307),
      strictPolicy,
      preview,
      development,
      secureTransport,
      noScriptChatbot,
    );
  }

  if (shouldBlockPreviewRequest(request.method, request.nextUrl.pathname)) {
    return addCspResponseHeaders(
      NextResponse.json(
        {
          ok: false,
          error: {
            code: "preview_side_effect_blocked",
            message: "検証環境では外部送信・保存・認証・決済を実行しません。",
          },
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex, nofollow, noarchive",
            "X-Safe-AI-Preview-Mode": "blocked",
          },
        },
      ),
      strictPolicy,
      preview,
      development,
      secureTransport,
      noScriptChatbot,
    );
  }

  // Next.js reads this request header and applies the nonce to framework and
  // page scripts. It must never be exposed as a stable identifier.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", strictPolicy);

  const response = addCspResponseHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    strictPolicy,
    preview,
    development,
    secureTransport,
    noScriptChatbot,
  );
  // These exact routes are public, reviewed, query-free documents with no
  // server-rendered personal state. Their HTML may therefore be retained by
  // the learning-only service-worker cache after a successful visit.
  if (
    !preview &&
    ["GET", "HEAD"].includes(request.method) &&
    !request.nextUrl.search &&
    PUBLIC_SAFETY_LEARNING_PATH.test(request.nextUrl.pathname)
  ) {
    response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    // Next/Vercel may replace Cache-Control after proxy execution because the
    // response carries a request-scoped CSP nonce. This explicit marker is
    // limited to the reviewed, non-personal route allowlist above and lets the
    // service worker distinguish those documents from every private response.
    response.headers.set("X-Safe-AI-Public-Offline", "safety-learning-v1");
  }
  return response;
}

export const config = {
  // HTML, route handlers, robots and sitemap need the security boundary.
  // Immutable assets do not need a per-request nonce.
  matcher: [
    "/safety-images/:path*",
    "/((?!_next/static|_next/image|favicon.ico|favicon-32.png|apple-touch-icon.png|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2)$).*)",
  ],
};
