const SAFE_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

export type ChatbotRequestBoundary =
  | { allowed: true }
  | { allowed: false; status: 403 | 415; message: string };

function firstForwardedValue(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

function requestOrigins(request: Request): Set<string> {
  const internalUrl = new URL(request.url);
  const origins = new Set([internalUrl.origin]);
  const protocol =
    firstForwardedValue(request.headers.get("x-forwarded-proto")) ??
    internalUrl.protocol.replace(/:$/, "");

  for (const value of [
    firstForwardedValue(request.headers.get("x-forwarded-host")),
    request.headers.get("host")?.trim() || null,
  ]) {
    if (!value) continue;
    try {
      origins.add(new URL(`${protocol}://${value}`).origin);
    } catch {
      // A malformed proxy/Host value is never added to the allowlist.
    }
  }
  return origins;
}

export const CHATBOT_UNDECODABLE_TEXT_MESSAGE =
  "文字コードを読み取れない文字が含まれています。UTF-8で送信してください。";

/**
 * `request.json()` always decodes UTF-8. A Shift_JIS / CP932 body (for
 * example an inline Japanese string sent from Windows PowerShell 5.1 or a
 * CP932 console curl) silently becomes U+FFFD replacement characters, which
 * then match no law text and produce a plausible "回答を保留" no-hit answer
 * (and a cache entry) instead of an error. Reject such text explicitly.
 */
export function containsUndecodableText(values: readonly unknown[]): boolean {
  return values.some(
    (value) => typeof value === "string" && value.includes("�"),
  );
}

/**
 * JSON-only is the primary CSRF boundary. Browser origin metadata is checked
 * whenever it is present; origin-less requests remain available to trusted
 * server-side clients and diagnostics.
 */
export function validateChatbotRequestBoundary(
  request: Request,
): ChatbotRequestBoundary {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return {
      allowed: false,
      status: 415,
      message: "JSON形式のリクエストだけを受け付けます。",
    };
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && !SAFE_FETCH_SITES.has(fetchSite)) {
    return {
      allowed: false,
      status: 403,
      message: "同一サイトからのリクエストだけを受け付けます。",
    };
  }

  const originHeader = request.headers.get("origin");
  if (!originHeader) return { allowed: true };

  try {
    if (originHeader === "null") throw new TypeError("opaque origin");
    const suppliedOrigin = new URL(originHeader).origin;
    if (!requestOrigins(request).has(suppliedOrigin)) {
      return {
        allowed: false,
        status: 403,
        message: "同一サイトからのリクエストだけを受け付けます。",
      };
    }
  } catch {
    return {
      allowed: false,
      status: 403,
      message: "同一サイトからのリクエストだけを受け付けます。",
    };
  }

  return { allowed: true };
}
