import { RA_SHARE_METHODS } from "@/lib/workplace-share";

export function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") !== "same-origin") {
    return new Response(null, { status: 403 });
  }
  const method = RA_SHARE_METHODS.find(
    (value) => value === request.headers.get("x-share-method"),
  );
  if (!method) return new Response(null, { status: 400 });

  console.info(JSON.stringify({ event: "workplace_share", content_kind: "chemical_ra", method }));
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
