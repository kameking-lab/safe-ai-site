import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_SAFETY_GOODS_CATEGORIES } from "@/data/public-safety-goods-categories";
import { selectHighRatedGoodsProducts } from "@/lib/goods/rakuten-products";

const RAKUTEN_ITEM_SEARCH_URL = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

function reply(status: "not_configured" | "unavailable" | "no_qualified_items" | "ready", items: ReturnType<typeof selectHighRatedGoodsProducts>) {
  return NextResponse.json({ status, items, checkedAt: status === "ready" || status === "no_qualified_items" ? new Date().toISOString() : null }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("category") ?? "";
  const category = PUBLIC_SAFETY_GOODS_CATEGORIES.find((candidate) => candidate.id === categoryId);
  if (!category) return NextResponse.json({ error: "Unknown category" }, { status: 400 });

  const applicationId = process.env.RAKUTEN_APPLICATION_ID?.trim();
  const accessKey = process.env.RAKUTEN_ACCESS_KEY?.trim();
  const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID?.trim();
  if (!applicationId || !accessKey || !affiliateId) return reply("not_configured", []);

  const url = new URL(RAKUTEN_ITEM_SEARCH_URL);
  url.searchParams.set("applicationId", applicationId);
  url.searchParams.set("affiliateId", affiliateId);
  url.searchParams.set("keyword", category.searchQuery);
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
    if (!response.ok) return reply("unavailable", []);
    const items = selectHighRatedGoodsProducts(await response.json());
    return reply(items.length > 0 ? "ready" : "no_qualified_items", items);
  } catch {
    return reply("unavailable", []);
  }
}
