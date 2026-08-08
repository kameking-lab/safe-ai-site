import { describe, expect, it } from "vitest";
import { mhlwNotices } from "@/data/mhlw-notices";
import {
  HUMAN_VERIFIED_NOTICE_IDS,
  INDIVIDUALLY_VERIFIED_NOTICE_IDS,
  isNoticeIndividuallyVerified,
  isNoticeSourceQuarantined,
  publicMhlwNotices,
  verifiedMhlwNotices,
} from "@/data/public-mhlw-notices";

describe("public MHLW notice quarantine", () => {
  it("quarantines the complete audited 0870-1069 range", () => {
    expect(isNoticeSourceQuarantined("mhlw-notice-0869")).toBe(false);
    expect(isNoticeSourceQuarantined("mhlw-notice-0870")).toBe(true);
    expect(isNoticeSourceQuarantined("mhlw-notice-0932")).toBe(true);
    expect(isNoticeSourceQuarantined("mhlw-notice-1069")).toBe(true);
  });

  it("removes all 200 records from publishable/searchable consumers", () => {
    expect(mhlwNotices.length - publicMhlwNotices.length).toBe(200);
    expect(publicMhlwNotices.some(isNoticeSourceQuarantined)).toBe(false);
  });

  it("fails closed for unknown identifier formats", () => {
    expect(isNoticeSourceQuarantined("unknown-notice")).toBe(true);
  });

  it("個別確認済みallowlistは基発0520第6号の1件だけ", () => {
    expect([...INDIVIDUALLY_VERIFIED_NOTICE_IDS]).toEqual([
      "mhlw-notice-0014",
    ]);
    expect(HUMAN_VERIFIED_NOTICE_IDS).toBe(
      INDIVIDUALLY_VERIFIED_NOTICE_IDS,
    );
    expect(verifiedMhlwNotices).toHaveLength(1);
    expect(isNoticeIndividuallyVerified("mhlw-notice-0014")).toBe(true);
    expect(isNoticeIndividuallyVerified("mhlw-notice-0001")).toBe(false);
  });

  it("基発0520第6号だけを厚労省の公式掲載ページ・PDFへ上書きする", () => {
    const notice = verifiedMhlwNotices[0];
    expect(notice).toMatchObject({
      id: "mhlw-notice-0014",
      title: "労働安全衛生規則の一部を改正する省令の施行等について",
      issuedDate: "2025-05-20",
      issuedDateRaw: "令和7年5月20日",
      noticeNumber: "基発0520第6号",
      issuer: "厚生労働省労働基準局長",
      sourceUrl:
        "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
      detailUrl:
        "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000116133.html",
      pdfUrl: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
      lawRef: "労働安全衛生規則第612条の2・熱中症",
    });
    expect(notice?.sourceUrl).not.toContain("jaish.gr.jp");
    expect(notice?.detailUrl).not.toContain("jaish.gr.jp");
  });
});
