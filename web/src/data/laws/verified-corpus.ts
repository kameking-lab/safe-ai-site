/**
 * サーバー側AI検索・引用専用のe-Gov本文コーパス。
 *
 * 生成元の各スナップショットは全条配列のSHA-256、各レコードは個別条文の
 * canonical JSON hashを保持する。`egov-verified-corpus.test.ts` がコミット済み
 * JSONから再計算して一致を強制する。
 *
 * これは機械的な完全性確認であり、現在性、人手による法的解釈、個別事案への
 * 適用可能性の確認ではない。クライアントコンポーネントからimportしないこと。
 */
import { verifiedLawArticles as generatedVerifiedLawArticles } from "./egov-verified-corpus.generated";
import { withVerifiedRevisionMetadata } from "./law-revision-metadata";

export const verifiedLawArticles = generatedVerifiedLawArticles.map(
  withVerifiedRevisionMetadata,
);

function snapshotVersionHash(values: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const value of values) {
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(36);
}

/**
 * Cache namespace for answers built from the verified e-Gov snapshots.
 * It changes automatically when a source revision, acquisition, or snapshot
 * hash changes, so a warm process cannot serve an answer from an older corpus.
 */
const verifiedSnapshotIdentities = [
  ...new Set(
    verifiedLawArticles.map((article) =>
      [
        article.sourceLawId ?? "unknown-law",
        article.sourceRevisionId ?? "unknown-revision",
        article.sourceFetchedAt ?? "unknown-fetch",
        article.sourceHash ?? "unknown-hash",
        article.amendmentPromulgatedOn ?? "unknown-amendment-promulgation",
        article.amendmentHistory?.[0]?.amendmentLawNumber ?? "unknown-amendment",
      ].join("|"),
    ),
  ),
].sort();

export const VERIFIED_LEGAL_SOURCE_VERSION = `egov-${verifiedSnapshotIdentities.length}-${snapshotVersionHash(verifiedSnapshotIdentities)}`;
