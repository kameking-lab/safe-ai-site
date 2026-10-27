import { loadSupplements, supplementsEnabled } from "@/lib/legal-supplements/loader";
import { renderSupplementDocument } from "@/lib/legal-supplements/render";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (!supplementsEnabled()) return new Response("Not found", { status: 404 });
  const id = new URL(request.url).searchParams.get("documentId");
  if (!id || id.length > 1000) return new Response("Not found", { status: 404 });
  try {
    const dataset = await loadSupplements();
    const document = dataset.documents.find(item => item.id === id);
    if (!document) return new Response("Not found", { status: 404 });
    return new Response(renderSupplementDocument(dataset, document), { headers: {
      "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
    } });
  } catch {
    return new Response("検証済み原典を読み込めません。", { status: 503 });
  }
}
