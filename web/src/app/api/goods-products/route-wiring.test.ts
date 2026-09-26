import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { GoodsSearch } from "@/lib/goods/rakuten-service";
import { GET } from "./route";

const { getProducts } = vi.hoisted(() => ({
  getProducts: vi.fn(async (search: GoodsSearch) => {
    void search;
    return { status: "no_qualified_items" as const, items: [], checkedAt: null, reason: null };
  }),
}));
vi.mock("@/lib/goods/rakuten-store", () => ({ createPostgresRakutenGoodsStore: () => null }));
vi.mock("@/lib/server/deployment-safety", () => ({ externalCredentialedServicesAllowed: () => true }));
vi.mock("@/lib/goods/rakuten-service", () => ({ createRakutenGoodsService: () => getProducts }));

function request(category: string, feature?: string) {
  const url = new URL("https://www.anzen-ai-portal.jp/api/goods-products");
  url.searchParams.set("category", category);
  if (feature) url.searchParams.set("feature", feature);
  return new NextRequest(url);
}

afterEach(() => { vi.unstubAllEnvs(); getProducts.mockClear(); });

describe("goods product feed wiring", () => {
  it("passes each feature's use-category name terms to the product service", async () => {
    vi.stubEnv("RAKUTEN_APPLICATION_ID", "test-application");
    vi.stubEnv("RAKUTEN_ACCESS_KEY", "test-access-key");
    vi.stubEnv("RAKUTEN_GOODS_AFFILIATE_ID", "test-affiliate");
    await GET(request("head-protection", "fall"));
    await GET(request("head-protection", "flying"));
    await GET(request("safety-footwear", "toe"));
    expect(getProducts.mock.calls.map(([search]) => [search.keyword, search.nameMustInclude])).toEqual([
      ["保護帽 墜落時保護", ["墜落"]],
      ["保護帽 飛来 落下", ["飛来", "落下物"]],
      ["安全靴 先芯 作業用", []],
    ]);
  });
});
