import { describe, expect, it } from "vitest";
import { describeRakutenResponse, selectGoodsProductsWithStats, selectHighRatedGoodsProducts } from "./rakuten-products";

const valid = {
  itemCode: "shop:helmet-1",
  itemName: "作業用ヘルメット 型番A",
  affiliateUrl: "https://item.rakuten.co.jp/shop/helmet-1/",
  mediumImageUrls: ["https://thumbnail.image.rakuten.co.jp/@0_mall/shop/cabinet/helmet.jpg"],
  reviewAverage: 4.6,
  reviewCount: 34,
  availability: 1,
};

describe("selectHighRatedGoodsProducts", () => {
  it("実画像と購入者評価を備えた高評価商品のみ表示する", () => {
    const items = selectHighRatedGoodsProducts({ items: [
      valid,
      { ...valid, itemCode: "low-rating", reviewAverage: 3.8 },
      { ...valid, itemCode: "few-reviews", reviewCount: 1 },
      { ...valid, itemCode: "no-photo", mediumImageUrls: [] },
      { ...valid, itemCode: "sold-out", availability: 0 },
      { ...valid, itemCode: "bad-url", mediumImageUrls: ["https://example.com/not-a-product.jpg"] },
      valid,
    ] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "shop:helmet-1", rating: 4.6, reviewCount: 34 });
  });

  it("実応答の大文字キー Items/Item と {imageUrl} 形式の画像も読む", () => {
    const expected = { id: "shop:helmet-1", imageUrl: valid.mediumImageUrls[0], rating: 4.6, reviewCount: 34 };
    expect(selectHighRatedGoodsProducts({ Items: [valid] })).toEqual([expect.objectContaining(expected)]);
    expect(selectHighRatedGoodsProducts({ Items: [{ Item: {
      ...valid, mediumImageUrls: [{ imageUrl: valid.mediumImageUrls[0] }] } }] })).toEqual([expect.objectContaining(expected)]);
    expect(selectHighRatedGoodsProducts({ Items: [{ ...valid, mediumImageUrls: [{ imageUrl: "https://example.com/x.jpg" }] }] })).toEqual([]);
  });

  it("表示は6件までのまま、内訳は受信した全件を数える", () => {
    const list = Array.from({ length: 9 }, (_, i) => ({ ...valid, itemCode: `shop:helmet-${i}` }));
    const { items, stats } = selectGoodsProductsWithStats({ Items: [...list, { ...valid, itemCode: "low", reviewAverage: 4.19 }] });
    expect(items).toHaveLength(6);
    expect(stats).toMatchObject({ received: 10, qualified: 9, lowRating: 1 });
    expect(selectGoodsProductsWithStats(null).stats.received).toBe(0);
  });

  it("応答の形は件数・キー有無/型だけで要約する", () => {
    expect(describeRakutenResponse({ count: 0 })).toEqual({ count: 0, itemsKey: "absent", hasErrors: false });
    expect(describeRakutenResponse({ count: 3, items: [], Items: {} })).toEqual({ count: 3, itemsKey: "array", hasErrors: false });
    expect(describeRakutenResponse({ count: 1.5, Items: "x", error: "e" })).toEqual({ count: null, itemsKey: "other", hasErrors: true });
    expect(describeRakutenResponse({ count: 20_000_000, Items: null })).toEqual({ count: null, itemsKey: "other", hasErrors: false });
  });

  it("API値がないとき商品を捏造しない", () => {
    expect(selectHighRatedGoodsProducts({ items: [{ itemName: "写真なし", reviewAverage: 5 }] })).toEqual([]);
    expect(selectHighRatedGoodsProducts(null)).toEqual([]);
  });
});
