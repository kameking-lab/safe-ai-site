import { findSourceRegistryRecord } from "@/data/source-registry";
import { MHLW_HEAT_NOTICE_0520_6_SNAPSHOT } from "@/data/source-snapshots/mhlw-heat-notice-0520-6";
import { verifiedLawArticles } from "@/data/laws/verified-corpus";

export type GenQualitySourceStatus =
  | "snapshot-hash-verified"
  | "human-content-verified"
  | "url-confirmed-content-review-pending"
  | "source-gap"
  | "superseded"
  | "quarantined";

export type GenQualitySourceRecord = {
  id: string;
  title: string;
  publisher: string;
  documentNumber: string;
  url: string;
  sourceClass: "primary" | "secondary";
  retrievedAt: string | null;
  /** Exact location within the primary document, not a fixture-authored summary. */
  locator: string | null;
  /** Exact committed primary-source text. Null means the claim must be held. */
  excerpt: string | null;
  /** Integrity hash for the committed excerpt/snapshot. Null means no integrity proof. */
  hash: string | null;
  status: GenQualitySourceStatus;
  humanReviewStatus: "reviewed" | "not-reviewed" | "unknown";
  independentPrimarySourceReview?: {
    reviewedAt: string;
    status: "matched";
    method: "独立一次資料照合";
    scope: string;
    humanLegalReviewStatus: "not-reviewed";
  };
  successorSourceId: string | null;
  lawRef?: {
    lawShort: string;
    articleNum: string;
  };
};

const article612 = verifiedLawArticles.find(
  (article) =>
    article.lawShort === "安衛則" && article.articleNum === "第612条の2",
);

const notice0520 = findSourceRegistryRecord("mhlw-heat-notice-0520-6");

/**
 * Claim-support records live outside the golden fixture. The law record is
 * derived from the committed e-Gov snapshot whose hashes are independently
 * recomputed by egov-verified-corpus.test.ts. The implementation notice is
 * fixed from the MHLW-hosted PDF; its bytes/hash and page-2 text are independently
 * recomputed by mhlw-heat-notice-0520-6.test.ts. This source integrity state is
 * separate from external legal/editorial review.
 */
export const GEN_QUALITY_SOURCE_RECORDS: readonly GenQualitySourceRecord[] = [
  {
    id: "egov-osh-rule-612-2",
    title: "労働安全衛生規則 第612条の2",
    publisher: "e-Gov法令検索",
    documentNumber: "昭和47年労働省令第32号",
    url:
      article612?.sourceUrl ??
      "https://laws.e-gov.go.jp/law/347M50002000032",
    sourceClass: "primary",
    retrievedAt: article612?.sourceFetchedAt ?? null,
    locator: article612?.articleNum ?? null,
    excerpt: article612?.text ?? null,
    hash: article612?.contentHash ?? null,
    status:
      article612?.verificationStatus === "snapshot-hash-verified" &&
      article612.contentHash &&
      article612.sourceHash
        ? "snapshot-hash-verified"
        : "source-gap",
    humanReviewStatus:
      article612?.humanReviewStatus === "not-reviewed"
        ? "not-reviewed"
        : "unknown",
    successorSourceId: null,
    lawRef: { lawShort: "安衛則", articleNum: "第612条の2" },
  },
  {
    id: "mhlw-heat-notice-0520-6",
    title:
      notice0520?.officialName ??
      "労働安全衛生規則の一部を改正する省令の施行等について",
    publisher: notice0520?.publisher ?? "厚生労働省",
    documentNumber: notice0520?.documentNumber ?? "基発0520第6号",
    url:
      MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.url,
    sourceClass: "primary",
    retrievedAt: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.retrievedAt,
    locator: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.locator,
    excerpt: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.excerpt,
    hash: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.pdfSha256,
    status:
      notice0520?.status === "quarantined"
        ? "quarantined"
        : "snapshot-hash-verified",
    humanReviewStatus: "not-reviewed",
    independentPrimarySourceReview:
      MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.independentPrimarySourceReview,
    successorSourceId: null,
  },
] as const;

export function findGenQualitySourceRecord(
  id: string,
  records: readonly GenQualitySourceRecord[] = GEN_QUALITY_SOURCE_RECORDS,
): GenQualitySourceRecord | undefined {
  return records.find((record) => record.id === id);
}
