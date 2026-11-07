import verification from "@/data/laws/current-revision-verification.json";
import primaryVerification from "@/data/laws/primary-current-verification.json";
import type { LawArticle } from "@/data/laws/law-types";
import { normalizeSourceProvenance, type SourceProvenance } from "@/lib/source-provenance";

/** Historical confirmation facts, separate from the 31-day current-law decision. */
export function lawSourceProvenance(article: LawArticle): SourceProvenance | undefined {
  const revision = article.sourceVersionKind !== "historical" && article.sourceLawId && article.sourceRevisionId && article.sourceHash &&
    article.sourceUrl === `https://laws.e-gov.go.jp/law/${article.sourceLawId}`
    ? verification.records.find((record) =>
        record.lawId === article.sourceLawId && record.revisionId === article.sourceRevisionId &&
        record.snapshotHash === article.sourceHash && record.status === "CurrentEnforced" &&
        record.sourceUrl === `https://laws.e-gov.go.jp/api/2/law_data/${article.sourceLawId}`,
      )
    : undefined;
  const publication = article.sourceUrl && article.sourceHash
    ? primaryVerification.records.find((record) =>
        record.lawShort === article.lawShort && record.articleNum === article.articleNum &&
        record.sourceUrl === article.sourceUrl && record.sourceHash === article.sourceHash &&
        record.revisionId === (article.sourceRevisionId ?? null),
      )
    : undefined;
  return normalizeSourceProvenance({
    url: article.sourceUrl,
    version: article.sourceRevisionId,
    fetchedAt: article.sourceFetchedAt,
    checkedAt: revision?.checkedAt ?? publication?.checkedAt,
    checkKind: revision ? "revision" : publication ? "publication-excerpt" : undefined,
  });
}
