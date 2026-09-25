import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_SAFETY_GOODS_CATEGORIES } from "@/data/public-safety-goods-categories";
import { getGoodsProductFeature } from "@/data/goods-product-features";
import { selectHighRatedGoodsProducts } from "@/lib/goods/rakuten-products";

const RAKUTEN_ITEM_SEARCH_URL = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

type ProductStatus = "not_configured" | "unavailable" | "no_qualified_items" | "ready" | "selection_required";
type FailureReason = "credentials_missing" | "authorization_failed" | "rate_limited" | "upstream_error" | "timeout" | null;
type ProductResult = { status: ProductStatus; items: ReturnType<typeof selectHighRatedGoodsProducts>; checkedAt: string | null; reason: FailureReason };
const CACHE_TTL_MS = 5 * 60 * 1000;
const productCache = new Map<string, { expiresAt: number; result: ProductResult }>();

function reply(result: ProductResult) {
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("category") ?? "";
  const featureId = request.nextUrl.searchParams.get("feature");
  const category = PUBLIC_SAFETY_GOODS_CATEGORIES.find((candidate) => candidate.id === categoryId);
  if (!category) return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  const feature = featureId ? getGoodsProductFeature(categoryId, featureId) : null;
  if (featureId && !feature) return NextResponse.json({ error: "Unknown feature" }, { status: 400 });
  if (feature?.searchQuery === null) return reply({ status: "selection_required", items: [], checkedAt: null, reason: null });

  const applicationId = process.env.RAKUTEN_APPLICATION_ID?.trim();
  const accessKey = process.env.RAKUTEN_ACCESS_KEY?.trim();
  const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID?.trim();
  if (!applicationId || !accessKey || !affiliateId) return reply({ status: "not_configured", items: [], checkedAt: null, reason: "credentials_missing" });

  const cacheKey = `${applicationId}:${affiliateId}:${categoryId}:${featureId ?? "all"}`;
  const cached = productCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return reply(cached.result);

  const url = new URL(RAKUTEN_ITEM_SEARCH_URL);
  url.searchParams.set("applicationId", applicationId);
  url.searchParams.set("affiliateId", affiliateId);
  url.searchParams.set("keyword", feature?.searchQuery ?? category.searchQuery);
  url.searchParams.set("formatVersion", "2");
  url.searchParams.set("hits", "30");
  url.searchParams.set("sort", "-reviewCount");
  url.searchParams.set("imageFlag", "1");
  url.searchParams.set("hasReviewFlag", "1");
  url.searchParams.set("availability", "1");
  url.searchParams.set("elements", "itemCode,itemName,affiliateUrl,mediumImageUrls,reviewAverage,reviewCount,availability");

  try {
    const response = await fetch(url, {
      headers: { accessKey },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return reply({ status: "unavailable", items: [], checkedAt: null, reason: response.status === 401 || response.status === 403 ? "authorization_failed" : response.status === 429 ? "rate_limited" : "upstream_error" });
    const items = selectHighRatedGoodsProducts(await response.json());
    const result: ProductResult = { status: items.length > 0 ? "ready" : "no_qualified_items", items, checkedAt: new Date().toISOString(), reason: null };
    productCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return reply(result);
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return reply({ status: "unavailable", items: [], checkedAt: null, reason: timedOut ? "timeout" : "upstream_error" });
  }
}
