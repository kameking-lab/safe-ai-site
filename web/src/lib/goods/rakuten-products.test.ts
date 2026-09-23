import { describe, expect, it } from "vitest";
import { selectHighRatedGoodsProducts } from "./rakuten-products";

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

  it("API値がないとき商品を捏造しない", () => {
    expect(selectHighRatedGoodsProducts({ items: [{ itemName: "写真なし", reviewAverage: 5 }] })).toEqual([]);
    expect(selectHighRatedGoodsProducts(null)).toEqual([]);
  });
});
