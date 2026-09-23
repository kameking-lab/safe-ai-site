import { describe, expect, it } from "vitest";
import {
  PUBLIC_GOODS_RATING_DISCLOSURE,
  PUBLIC_SAFETY_GOODS_CATEGORIES,
} from "./public-safety-goods-categories";

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
    expect(PUBLIC_GOODS_RATING_DISCLOSURE.localRatingPublished).toBe(false);
  });
});
