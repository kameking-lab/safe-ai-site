import { buildAutomationMailto } from "@/lib/automation-consult/mail-draft";

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

export function POST() {
  // Request bodyやqueryは読まず、server-only設定と定型文だけから生成する。
  const location = buildAutomationMailto();
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
