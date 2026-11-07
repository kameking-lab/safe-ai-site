import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_SAFETY_GOODS_CATEGORIES } from "@/data/public-safety-goods-categories";
import { getGoodsProductFeature } from "@/data/goods-product-features";
import { createRakutenGoodsService } from "@/lib/goods/rakuten-service";
import { createPostgresRakutenGoodsStore } from "@/lib/goods/rakuten-store";
import { unavailable, type ProductResult } from "@/lib/goods/product-result";
import { externalCredentialedServicesAllowed } from "@/lib/server/deployment-safety";

function reply(result: ProductResult) {
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
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
  // Keep the existing affiliate ID priority and preserve the API's affiliateUrl.
  const affiliateId = process.env.RAKUTEN_GOODS_AFFILIATE_ID?.trim() || process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID?.trim();
  if (!applicationId || !accessKey || !affiliateId) return reply({ status: "not_configured", items: [], checkedAt: null, reason: "credentials_missing" });
  if (!externalCredentialedServicesAllowed()) return reply(unavailable("upstream_error"));

  const getProducts = createRakutenGoodsService(createPostgresRakutenGoodsStore());
  return reply(await getProducts({
    categoryId,
    featureId,
    keyword: feature?.searchQuery ?? category.searchQuery,
    nameMustInclude: feature?.nameMustInclude ?? [],
    applicationId,
    accessKey,
    affiliateId,
    environment: process.env.VERCEL_ENV === "production" ? "production" : process.env.VERCEL_ENV === "preview" ? `preview:${process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown"}` : "development",
  }));
}
