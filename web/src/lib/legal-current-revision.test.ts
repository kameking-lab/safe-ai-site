import { describe, expect, it } from "vitest";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";
import { verifiedPrimaryNoticeArticles } from "@/data/laws/verified-primary-notices";
import { verifiedCurrentPrimaryDate, verifiedCurrentRevisionDate } from "./legal-current-revision";
import { buildServiceFirstLegalAnswer } from "./legal-extractive-answer";
import { validateServiceFirstLegalClaimSupport } from "./legal-claim-support";

const now = new Date("2026-10-11T00:00:00+09:00");
const decree = verifiedLawArticles.find((article) => article.lawShort === "安衛令" && article.articleNum === "第20条")!;
const act = verifiedLawArticles.find((article) => article.lawShort === "安衛法" && article.articleNum === "第61条")!;

describe("現行版の独立確認と回答の断定度", () => {
  it("e-Gov現行施行版・取得本文ハッシュ・確認日が一致する場合だけ確認済みとする", () => {
    expect(verifiedCurrentRevisionDate(decree, now)).toBe("2026-10-11");
    expect(verifiedCurrentRevisionDate({ ...decree, sourceRevisionId: "20260401_507CO0000000361" }, now)).toBeNull();
    expect(verifiedCurrentRevisionDate({ ...decree, sourceHash: "wrong-hash" }, now)).toBeNull();
    expect(verifiedCurrentRevisionDate({ ...decree, sourceVersionKind: "historical" }, now)).toBeNull();
    expect(verifiedCurrentRevisionDate(decree, new Date("2026-10-10T00:00:00+09:00"))).toBeNull();
    expect(verifiedCurrentRevisionDate(decree, new Date("2026-11-12T00:00:00+09:00"))).toBeNull();
    expect(verifiedCurrentRevisionDate(decree, new Date("invalid"))).toBeNull();
  });

  it("重要根拠の片方が未確認なら先頭結論で保留し、折り畳み根拠へ隠さない", () => {
    const answer = buildServiceFirstLegalAnswer({ query: "最大荷重1トン以上のフォークリフトの資格は？", articles: [act, { ...decree, sourceRevisionId: "old-revision" }], now });
    expect(answer).toContain("根拠の現行版を確認できない");
    expect(answer).toContain("確認不能（根拠の現行版を再確認）");
    expect(answer).not.toContain("修了者");
    expect(validateServiceFirstLegalClaimSupport({ query: "最大荷重1トン以上のフォークリフトの資格は？", answer, articles: [act, { ...decree, sourceRevisionId: "old-revision" }], now }).supported).toBe(true);
    expect(validateServiceFirstLegalClaimSupport({ query: "最大荷重1トン以上のフォークリフトの資格は？", answer, articles: [act, decree], now }).supported).toBe(false);
  });

  it("公式抜粋も本文・版・URLの再照合が一致し、期限内にある場合だけ確認済みとする", () => {
    const current = new Date("2026-10-12T00:00:00+09:00");
    const education = verifiedPrimaryNoticeArticles.find((row) => row.lawShort === "特別教育規程")!;
    const qa = verifiedPrimaryNoticeArticles.find((row) => row.lawShort === "経産省電工Q&A")!;
    expect(verifiedCurrentPrimaryDate(education, current)).toBe("2026-10-12");
    expect(verifiedCurrentPrimaryDate({ ...education, sourceHash: "wrong" }, current)).toBeNull();
    expect(verifiedCurrentPrimaryDate({ ...education, sourceUrl: "https://example.com" }, current)).toBeNull();
    expect(verifiedCurrentPrimaryDate(education, now)).toBeNull();
    expect(verifiedCurrentPrimaryDate(education, new Date("2026-11-13T00:00:00+09:00"))).toBeNull();
    expect(verifiedCurrentPrimaryDate(qa, current)).toBeNull();
    const answer = buildServiceFirstLegalAnswer({ query: "測定器をクリップ留めするだけなら電工いる？", articles: [qa], now: current });
    expect(answer).toContain("根拠の現行版を確認できない");
    expect(answer).not.toContain("工事する必要はない");
  });
});
