import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/goods/rakuten-store", () => ({ createPostgresRakutenGoodsStore: () => null }));

function request(category: string, feature?: string) {
  const url = new URL("https://www.anzen-ai-portal.jp/api/goods-products");
  url.searchParams.set("category", category);
  if (feature) url.searchParams.set("feature", feature);
  return new NextRequest(url);
}

afterEach(() => vi.unstubAllEnvs());

describe("goods product feed contract", () => {
  it("invalid and unsafe selections remain fail closed", async () => {
    expect((await GET(request("head-protection", "invalid"))).status).toBe(400);
    expect(await (await GET(request("respiratory", "unknown"))).json()).toMatchObject({
      status: "selection_required", items: [], checkedAt: null, reason: null,
    });
  });

  it("missing credentials and unavailable shared state never call Rakuten", async () => {
    vi.stubEnv("RAKUTEN_APPLICATION_ID", "");
    expect(await (await GET(request("head-protection", "fall"))).json()).toMatchObject({
      status: "not_configured", items: [], checkedAt: null, reason: "credentials_missing",
    });
    vi.stubEnv("RAKUTEN_APPLICATION_ID", "test-application");
    vi.stubEnv("RAKUTEN_ACCESS_KEY", "test-access-key");
    vi.stubEnv("RAKUTEN_GOODS_AFFILIATE_ID", "test-affiliate");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await (await GET(request("head-protection", "fall"))).json();
    expect(response).toMatchObject({ status: "unavailable", items: [], checkedAt: null, reason: "upstream_error" });
    expect(JSON.stringify(response)).not.toContain("test-access-key");
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
