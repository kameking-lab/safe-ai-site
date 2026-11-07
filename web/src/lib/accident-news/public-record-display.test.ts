import { describe, expect, it } from "vitest";
import { withoutEmergencyNumberSentences } from "./public-record-display";
import { filterSeriousCasesPage } from "./serious-cases";

describe("public record display without emergency numbers", () => {
  it("drops only the sentence that contains 110/119, keeping the rest verbatim", () => {
    expect(withoutEmergencyNumberSentences("被災者が倒れていた。同僚が発見し１１９番通報した。被災者は翌日に死亡した。"))
      .toBe("被災者が倒れていた。被災者は翌日に死亡した。");
    expect(withoutEmergencyNumberSentences("荷台の高さは１１０ｃｍであった。")).toBe("荷台の高さは１１０ｃｍであった。");
  });

  it("never shows 110/119 in the republished fatal accident narratives", () => {
    const page = filterSeriousCasesPage({ limit: 10_000, offset: 0 });
    expect(page.total).toBeGreaterThan(1000);
    expect(page.cases.some((item) => /(?:119|110|１１９|１１０)\s*番/u.test(item.description))).toBe(false);
  });
});
