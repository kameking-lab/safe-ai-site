import { NextResponse } from "next/server";
import { filterSeriousCasesPage } from "@/lib/accident-news/serious-cases";

const PAGE_SIZE = 30;

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const industry = text(body.industry, 100);
  const type = text(body.type, 100);
  const yearText = text(body.year, 4);
  const q = text(body.q, 200).trim();
  const requestedPage = Math.max(
    1,
    Math.min(500, Number.isFinite(body.page) ? Number(body.page) : 1),
  );
  const query = {
    industry: industry || undefined,
    type: type || undefined,
    year: /^\d{4}$/.test(yearText) ? Number(yearText) : undefined,
    q: q || undefined,
  };
  const first = filterSeriousCasesPage({
    ...query,
    limit: PAGE_SIZE,
    offset: (requestedPage - 1) * PAGE_SIZE,
  });
  const pageCount = Math.max(1, Math.ceil(first.total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const result =
    page === requestedPage
      ? first
      : filterSeriousCasesPage({
          ...query,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        });

  return NextResponse.json(
    { ...result, page, pageCount },
    { headers: { "cache-control": "private, no-store" } },
  );
}
