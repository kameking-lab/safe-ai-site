import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifiedPrimaryNoticeArticles } from "./verified-primary-notices";

describe("確認済み厚労省一次資料", () => {
  it("告示276号の固定本文hash・公式URL・確認状態を保持する", () => {
    const notice = verifiedPrimaryNoticeArticles[0]!;
    expect(createHash("sha256").update(notice.text).digest("hex")).toBe(
      notice.sourceHash,
    );
    expect(notice.sourceUrl).toMatch(/^https:\/\/www\.mhlw\.go\.jp\//);
    expect(notice).toMatchObject({
      sourceKind: "mhlw-official-primary",
      verificationStatus: "primary-source-verified",
      humanReviewStatus: "reviewed",
    });
    expect(notice.text).toMatch(/船舶石綿含有資材調査者/);
    expect(notice.text).toMatch(/工作物石綿事前調査者/);
  });
});
