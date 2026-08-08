import { NextResponse } from "next/server";
import {
  MHLW_MERGED_CHEMICAL_COUNT_SLIM,
  searchMergedChemicalsSlim,
} from "@/lib/mhlw-chemicals-slim";
import { noStoreHeaders } from "@/lib/api-cache";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";

export const dynamic = "force-dynamic";

type SearchBody = {
  query?: unknown;
  limit?: unknown;
  selection?: {
    cas?: unknown;
    primaryName?: unknown;
    originalQuery?: unknown;
  };
};

function normalizeIdentity(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
}

/**
 * 同梱済み固定索引をサーバー側で検索する。検索語をURLへ載せず、ログにも出さない。
 * 外部API・DBには接続せず、候補の最大30件だけを返す。
 */
export async function POST(request: Request) {
  const limited = await sharedRateLimitGuard(
    request,
    {
      routeKey: "chemical-search",
      limit: 120,
      windowMs: 10 * 60 * 1_000,
    },
    { previewGlobalSubject: true },
  );
  if (limited) return limited;

  let body: SearchBody;
  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", items: [] },
      { status: 400, headers: noStoreHeaders() },
    );
  }
  if (body.selection !== undefined) {
    const cas =
      typeof body.selection?.cas === "string" ? body.selection.cas.trim() : "";
    const primaryName =
      typeof body.selection?.primaryName === "string"
        ? body.selection.primaryName.trim()
        : "";
    const originalQuery =
      typeof body.selection?.originalQuery === "string"
        ? body.selection.originalQuery.trim()
        : null;
    if (
      !/^\d{2,7}-\d{2,3}-\d{1,2}$/.test(cas) ||
      !primaryName ||
      primaryName.length > 200 ||
      (originalQuery !== null &&
        (!originalQuery || originalQuery.length > 120))
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_selection_identity",
          item: null,
        },
        { status: 400, headers: noStoreHeaders() },
      );
    }
    const exact = searchMergedChemicalsSlim(cas, 30).filter(
      (item) => item.cas === cas && item.primaryName === primaryName,
    );
    if (exact.length !== 1) {
      return NextResponse.json(
        {
          ok: false,
          code: "identity_mismatch_or_ambiguous",
          item: null,
        },
        { status: 409, headers: noStoreHeaders() },
      );
    }
    if (originalQuery !== null) {
      const normalizedQuery = normalizeIdentity(originalQuery);
      const exactIdentityMatches = searchMergedChemicalsSlim(
        originalQuery,
        30,
      ).filter(
        (item) =>
          normalizeIdentity(item.cas ?? "") === normalizedQuery ||
          normalizeIdentity(item.primaryName) === normalizedQuery ||
          item.aliases.some(
            (alias) => normalizeIdentity(alias) === normalizedQuery,
          ),
      );
      if (
        exactIdentityMatches.length !== 1 ||
        exactIdentityMatches[0]?.cas !== cas ||
        exactIdentityMatches[0]?.primaryName !== primaryName
      ) {
        return NextResponse.json(
          {
            ok: false,
            code: "query_identity_not_unique",
            item: null,
          },
          { status: 409, headers: noStoreHeaders() },
        );
      }
    }
    return NextResponse.json(
      {
        ok: true,
        mode: "confirmed",
        item: exact[0],
      },
      { headers: noStoreHeaders() },
    );
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query || query.length > 120) {
    return NextResponse.json(
      { ok: false, code: "invalid_query", items: [] },
      { status: 400, headers: noStoreHeaders() },
    );
  }
  const requestedLimit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.trunc(body.limit)
      : 8;
  const limit = Math.min(30, Math.max(1, requestedLimit));
  const items = searchMergedChemicalsSlim(query, limit);
  return NextResponse.json(
    {
      ok: true,
      catalogCount: MHLW_MERGED_CHEMICAL_COUNT_SLIM,
      items,
    },
    { headers: noStoreHeaders() },
  );
}
