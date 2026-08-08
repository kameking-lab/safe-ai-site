import { describe, expect, it } from "vitest";
import {
  getAccidentRelated,
  shouldWithholdAccidentPpeProducts,
} from "./accident-related";
import { ALL_ACCIDENT_TYPES } from "@/lib/types/domain";

describe("事故類型からのPPE商品提案境界", () => {
  it.each(ALL_ACCIDENT_TYPES)(
    "%s は事故型だけで保護具・適用条文・KYテンプレを決めない",
    (type) => {
      const related = getAccidentRelated(type);
      expect(shouldWithholdAccidentPpeProducts(type)).toBe(true);
      expect(related.categories).toEqual([]);
      expect(related.articles).toEqual([]);
      expect(related.template).toBe("");
      expect(related.rationale).toMatch(
        /事故類型だけでは.*現場条件と一次資料を人が確認/,
      );
    },
  );
});
