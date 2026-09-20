import {
  buildConsultationMailto,
  type ConsultationMailKind,
} from "@/lib/automation-consult/mail-draft";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export const dynamic = "force-dynamic";

export function GET() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: {
      ...PRIVATE_HEADERS,
      Allow: "POST",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export function POST(request?: Request) {
  const requestedType = request
    ? new URL(request.url).searchParams.get("type")
    : null;
  if (
    requestedType !== null &&
    requestedType !== "automation" &&
    requestedType !== "ppe-selection"
  ) {
    return new Response("Unknown consultation type", {
      status: 400,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
  // 利用者入力はメール本文へ流さず、許可した種別の固定テンプレートだけを使う。
  const kind: ConsultationMailKind =
    requestedType === "ppe-selection" ? "ppe-selection" : "automation";
  const location = buildConsultationMailto(kind);
  if (!location) {
    return new Response(
      "現在、メール相談を開始できません。料金ページへ戻ってください。",
      {
        status: 503,
        headers: {
          ...PRIVATE_HEADERS,
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
  }

  return new Response(null, {
    status: 303,
    headers: {
      ...PRIVATE_HEADERS,
      Location: location,
    },
  });
}
