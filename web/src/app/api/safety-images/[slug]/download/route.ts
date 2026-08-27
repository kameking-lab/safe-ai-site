export const dynamic = "force-dynamic";

function unavailableResponse(): Response {
  return new Response("Safety sign downloads are temporarily unavailable.", {
    status: 410,
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export async function GET(): Promise<Response> {
  return unavailableResponse();
}

export async function HEAD(): Promise<Response> {
  const response = unavailableResponse();
  return new Response(null, { status: response.status, headers: response.headers });
}

export async function POST(): Promise<Response> {
  return unavailableResponse();
}
