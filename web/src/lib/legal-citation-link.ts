import type { LawArticle } from "@/data/laws/law-types";

const LAW_ID = /^[0-9A-Z]{15}$/;
const REVISION_ID = /^(?:([0-9A-Z]{15})_)?\d{8}_[0-9A-Z]{15}$/;

/**
 * Preserve a verified source's locator verbatim; never infer an e-Gov anchor or
 * occasion_date from a provision number or revision date. Integrity metadata
 * here describes the stored source, not currentness or legal applicability.
 */
export function legalCitationLink(
  article: LawArticle,
  metadataLawId?: string,
): string | undefined {
  if (article.sourceUrl === undefined) {
    // Legacy articles without source metadata can still offer the known law's
    // landing page. Do not silently replace a missing historical source.
    return !article.sourceKind && !article.sourceRevisionId &&
      article.sourceVersionKind !== "historical" && metadataLawId && LAW_ID.test(metadataLawId)
      ? `https://laws.e-gov.go.jp/law/${metadataLawId}`
      : undefined;
  }

  if (
    article.sourceUrl.length > 2048 ||
    /[\s\\]/.test(article.sourceUrl) ||
    Array.from(article.sourceUrl).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
    !article.sourceKind ||
    !["snapshot-hash-verified", "primary-source-verified"].includes(article.verificationStatus ?? "") ||
    !/^[a-f0-9]{64}$/i.test(article.sourceHash ?? "")
  ) return undefined;

  let url: URL;
  try {
    url = new URL(article.sourceUrl);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;

  if (url.hostname !== "laws.e-gov.go.jp") {
    // Other government publications (including ministry PDFs and Q&A pages)
    // retain their exact verified URL instead of becoming an e-Gov law link.
    return article.sourceKind !== "egov-fulltext-snapshot" && url.hostname.endsWith(".go.jp")
      ? article.sourceUrl
      : undefined;
  }

  const lawId = article.sourceLawId ?? metadataLawId;
  if (!lawId || !LAW_ID.test(lawId) || (metadataLawId && metadataLawId !== lawId)) return undefined;
  const revision = article.sourceRevisionId;
  if (revision) {
    const match = REVISION_ID.exec(revision);
    if (!match || (match[1] && match[1] !== lawId)) return undefined;
  }

  const canonicalPath = `/law/${lawId}`;
  const fullRevision = revision?.startsWith(`${lawId}_`) ? revision : revision ? `${lawId}_${revision}` : undefined;
  // A supplied version URL is retained only if it identifies the stored
  // revision exactly. This does not generate a new URL or locator schema.
  if (url.pathname !== canonicalPath && url.pathname !== `${canonicalPath}/` &&
    (!fullRevision || url.pathname !== `/law/${fullRevision}`)) return undefined;
  return article.sourceUrl;
}
