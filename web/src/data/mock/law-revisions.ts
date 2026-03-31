import { loadSampleRevisions } from "@/lib/revisions-ingest";
import type { LawRevisionCore } from "@/lib/types/domain";

// 将来の外部データ取込に備え、手書き配列ではなく ingest 済みデータを利用する。
const fallbackLawRevisions: LawRevisionCore[] = [
  {
    id: "lr-fallback-001",
    title: "法改正データを準備中です",
    publishedAt: "1970-01-01",
    revisionNumber: "未設定",
    kind: "notice",
    category: "通達",
    issuer: "発出元未設定",
    summary: "サンプル法改正データの読み込みに失敗しました。設定を確認してください。",
    source: {
      url: "",
      label: "参照元",
    },
  },
];

export const lawRevisionCores = (() => {
  const loaded = loadSampleRevisions();
  return loaded.length > 0 ? loaded : fallbackLawRevisions;
})();

export function getLawRevisionById(revisionId: string) {
  return lawRevisionCores.find((revision) => revision.id === revisionId) ?? null;
}
