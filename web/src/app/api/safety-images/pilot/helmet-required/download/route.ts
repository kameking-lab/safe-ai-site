export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
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
