import { NextResponse } from "next/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Deprecation: "true",
  Link: '</services/automation#consult-form>; rel="alternate"',
};

/**
 * Retired legacy contact endpoint.
 *
 * The former browser-to-third-party hand-off exposed a destination identifier
 * and sent contact PII from the client to a third party. Keep the endpoint
 * fail-closed so old clients cannot mistake validation for delivery.
 */
export async function POST(_request: Request) {
  return NextResponse.json(
    {
      ok: false,
      error: "endpoint_retired",
      message:
        "この送信経路は廃止しました。業務相談は保護された専用フォームをご利用ください。",
      canonicalPath: "/services/automation#consult-form",
    },
    { status: 410, headers: NO_STORE_HEADERS },
  );
}
