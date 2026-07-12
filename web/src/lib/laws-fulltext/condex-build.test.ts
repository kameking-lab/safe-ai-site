import { describe, expect, it } from "vitest";
import { buildCondex } from "./condex-build";
import { FULLTEXT_LAW_IDS } from "./loader";
import { getFulltextNaviEntries } from "@/lib/law-navi/fulltext-navi";

/**
 * FT-D4 condex ビルダーの機械固定。
 *
 * committed 全文 → 軽量索引（条番号＋見出し＋スラグのみ）の射影が:
 *   - FULLTEXT_LAW_IDS を過不足なくカバーする（FT-D5 の法令追加にビルド時追従）
 *   - 生成ページ集合（getFulltextNaviEntries）と 1:1（幽霊 URL 0）
 *   - 本文（text/paragraphs）を一切含まない（クライアントに全文を載せない）
 * を固定する。
 */
describe("buildCondex — 全文の軽量射影（条番号＋見出しのみ）", () => {
  it("condex の法令集合は FULLTEXT_LAW_IDS と一致する", async () => {
    const { laws } = await buildCondex();
    const ids = laws.map((l) => l.egovLawId).sort();
    expect(ids).toEqual([...FULLTEXT_LAW_IDS].sort());
  });

  it("各法令の条集合は生成ページ（getFulltextNaviEntries）と 1:1", async () => {
    const { laws } = await buildCondex();
    for (const law of laws) {
      const gap = await getFulltextNaviEntries(law.egovLawId);
      expect(law.articles.length).toBe(gap.length);
      const condexSlugs = new Set(law.articles.map((a) => a.artSlug));
      for (const g of gap) expect(condexSlugs.has(g.artSlug)).toBe(true);
    }
  });

  it("安衛則の代表条を条番号＋見出し＋スラグで収載する（第630条・多段枝番 第34条の2の3）", async () => {
    const { laws } = await buildCondex();
    const anei = laws.find((l) => l.egovLawId === "347M50002000032");
    expect(anei).toBeTruthy();
    const a630 = anei!.articles.find((a) => a.artSlug === "630");
    expect(a630?.articleNum).toBe("第630条");
    expect(a630?.caption).toBe("（食堂及び炊事場）");
    expect(anei!.articles.some((a) => a.artSlug === "34-2-3")).toBe(true);
  });

  it("curated 収録済みの条（第577条の2）は condex に含めない（curated が正本・dual-exclusion）", async () => {
    const { laws } = await buildCondex();
    const anei = laws.find((l) => l.egovLawId === "347M50002000032");
    expect(anei!.articles.some((a) => a.artSlug === "577-2")).toBe(false);
  });

  it("本文（text）を一切含まない（全文はクライアントに載せない）", async () => {
    const { laws } = await buildCondex();
    const allowed = new Set(["articleNum", "artSlug", "caption", "isDeleted"]);
    for (const law of laws) {
      for (const a of law.articles) {
        expect(new Set(Object.keys(a))).toEqual(allowed);
        expect(a).not.toHaveProperty("text");
        expect(a).not.toHaveProperty("paragraphs");
      }
    }
  });
});
