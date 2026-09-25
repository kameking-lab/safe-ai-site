import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function request(category: string, feature?: string) {
  const url = new URL("https://www.anzen-ai-portal.jp/api/goods-products");
  url.searchParams.set("category", category);
  if (feature) url.searchParams.set("feature", feature);
  return new NextRequest(url);
}

function configure() {
  vi.stubEnv("RAKUTEN_APPLICATION_ID", "test-application");
  vi.stubEnv("RAKUTEN_ACCESS_KEY", "test-access-key");
  vi.stubEnv("RAKUTEN_GOODS_AFFILIATE_ID", "test-goods-affiliate");
  vi.stubEnv("NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID", "test-affiliate");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("goods product feed", () => {
  it("欠測や危険有害性不明を候補として公開しない", async () => {
    vi.stubEnv("RAKUTEN_APPLICATION_ID", "");
    expect(await (await GET(request("head-protection", "fall"))).json()).toMatchObject({
      status: "not_configured", items: [], checkedAt: null, reason: "credentials_missing",
    });
    expect(await (await GET(request("respiratory", "unknown"))).json()).toMatchObject({
      status: "selection_required", items: [], checkedAt: null,
    });
    expect((await GET(request("head-protection", "invalid"))).status).toBe(400);
  });

  it("選択した特徴で検索し、実測の高評価商品だけを短時間キャッシュする", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ items: [
      { itemCode: "shop:helmet-1", itemName: "産業用保護帽", mediumImageUrls: ["https://thumbnail.image.rakuten.co.jp/helmet.jpg"], reviewAverage: 4.6, reviewCount: 34, availability: 1, affiliateUrl: "https://item.rakuten.co.jp/shop/helmet-1/" },
      { itemCode: "shop:helmet-2", itemName: "低評価品", mediumImageUrls: ["https://thumbnail.image.rakuten.co.jp/low.jpg"], reviewAverage: 3.1, reviewCount: 200, availability: 1, affiliateUrl: "https://item.rakuten.co.jp/shop/helmet-2/" },
    ] }));
    vi.stubGlobal("fetch", fetchMock);
    const first = await (await GET(request("head-protection", "fall"))).json();
    const second = await (await GET(request("head-protection", "fall"))).json();
    expect(first).toMatchObject({ status: "ready", items: [{ rating: 4.6, reviewCount: 34 }], reason: null });
    expect(first.items).toHaveLength(1);
    expect(first.checkedAt).toBe(second.checkedAt);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get("keyword")).toBe("産業用 保護帽 墜落時保護");
    expect(url.searchParams.get("affiliateId")).toBe("test-goods-affiliate");
    expect(options.headers).toEqual({ accessKey: "test-access-key" });
    expect(JSON.stringify(first)).not.toContain("test-access-key");
  });

  it("回数制限を欠測として返し、失敗をキャッシュしない", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    for (let index = 0; index < 2; index += 1) {
      expect(await (await GET(request("eye-face-protection", "impact"))).json()).toMatchObject({
        status: "unavailable", reason: "rate_limited", items: [], checkedAt: null,
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
