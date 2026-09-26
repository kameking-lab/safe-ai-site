import { describe, expect, it } from "vitest";
import {
  PUBLIC_GOODS_RATING_DISCLOSURE,
  PUBLIC_SAFETY_GOODS_CATEGORIES,
} from "./public-safety-goods-categories";
import { GOODS_PRODUCT_FEATURES } from "./goods-product-features";

describe("public safety goods category contract", () => {
  it("keeps every category image-backed and sales-searchable", () => {
    for (const category of PUBLIC_SAFETY_GOODS_CATEGORIES) {
      expect(category.image).toMatch(
        /^\/safety-images\/library\/previews\/.+\.webp$/,
      );
      expect(category.searchQuery.trim().length).toBeGreaterThan(3);
      expect(category.selectionPrompt.trim().length).toBeGreaterThan(10);
    }
  });

  it("records the external rating source and checked date without publishing stale scores", () => {
    expect(PUBLIC_GOODS_RATING_DISCLOSURE.sourceUrl).toMatch(/^https:\/\//);
    expect(PUBLIC_GOODS_RATING_DISCLOSURE.checkedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(PUBLIC_GOODS_RATING_DISCLOSURE.ratingDisplayRequiresApi).toBe(true);
  });

  it("separates eight body-worn groups from support equipment and requires purpose choices", () => {
    const bodyWorn = PUBLIC_SAFETY_GOODS_CATEGORIES.filter((category) => category.group === "ppe");
    expect(bodyWorn).toHaveLength(8);
    expect(PUBLIC_SAFETY_GOODS_CATEGORIES.filter((category) => category.group === "support")).toHaveLength(8);
    for (const category of bodyWorn) {
      expect(GOODS_PRODUCT_FEATURES[category.id]?.filter((feature) => feature.searchQuery).length).toBeGreaterThanOrEqual(2);
    }
    expect(GOODS_PRODUCT_FEATURES.respiratory?.find((feature) => feature.id === "unknown")?.searchQuery).toBeNull();
    expect(GOODS_PRODUCT_FEATURES["chemical-gloves"]?.find((feature) => feature.id === "unknown")?.searchQuery).toBeNull();
    expect(GOODS_PRODUCT_FEATURES["chemical-clothing"]?.find((feature) => feature.id === "unknown")?.searchQuery).toBeNull();
  });

  it("keeps helmet queries anchored to 保護帽 and the certified use category", () => {
    // 2026-09-26 本番実測: 「産業用」を含む4語AND検索は総ヒット3〜4件で候補0件だった。
    const helmet = GOODS_PRODUCT_FEATURES["head-protection"] ?? [];
    expect(helmet.find((feature) => feature.id === "fall")?.searchQuery).toBe("保護帽 墜落時保護");
    expect(helmet.find((feature) => feature.id === "flying")?.searchQuery).toBe("保護帽 飛来 落下");
    for (const feature of helmet) {
      expect(feature.searchQuery).toContain("保護帽");
      expect(feature.searchQuery).toMatch(/墜落時保護|飛来|電気用/);
    }
  });
});
