import { realLawRevisions } from "@/data/mock/real-law-revisions";
import { loadRealRevisionsFromPayload, loadSampleRevisions, type RevisionsIngestSource } from "@/lib/revisions-ingest";
import type { LawRevisionCore } from "@/lib/types/domain";

// 将来の外部データ取込に備え、ingest 済みデータとの統合口を維持する。
const fallbackLawRevisions: LawRevisionCore[] = [
  {
    id: "lr-fallback-001",
    title: "法改正データを準備中です",
    publishedAt: "1970-01-01",
    revisionNumber: "未設定",
    kind: "notice",
    category: "通達",
    issuer: "発出元未設定",
    summary: "法改正データの読み込みに失敗しました。設定を確認してください。",
    source: {
      url: "",
      label: "参照元",
    },
  },
];

export const lawRevisionCores = (() => {
  const source = toIngestSource(process.env.NEXT_PUBLIC_REVISIONS_INGEST_SOURCE);

  if (source === "real") {
    const realPayload = process.env.REVISIONS_REAL_SOURCE_PAYLOAD_JSON;
    if (realPayload) {
      try {
        const loadedFromRealPayload = loadRealRevisionsFromPayload(JSON.parse(realPayload));
        if (loadedFromRealPayload.length > 0) {
          return loadedFromRealPayload;
        }
        return fallbackLawRevisions;
      } catch {
        return fallbackLawRevisions;
      }
    }
  }

  // 実データ（厚労省・官報・e-Gov等の公開情報に基づく）を基本とし、
  // sample revisions（ingest経由）があれば統合する。
  const loaded = loadSampleRevisions();
  const merged = [...loaded, ...realLawRevisions].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return merged.length > 0 ? merged : fallbackLawRevisions;
})();

function toIngestSource(value: string | undefined): RevisionsIngestSource {
  return value === "real" ? "real" : "sample";
}

export function getLawRevisionById(revisionId: string) {
  return lawRevisionCores.find((revision) => revision.id === revisionId) ?? null;
}
