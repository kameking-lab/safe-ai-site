export type LawRevision = {
  id: string;
  title: string;
  publishedAt: string;
  summary: string;
};

export const lawRevisions: LawRevision[] = [
  {
    id: "lr-001",
    title: "高所作業時の墜落防止措置の強化",
    publishedAt: "2026-01-15",
    summary:
      "足場の点検頻度と安全帯の使用基準が見直され、現場責任者による作業前確認の明確化が求められます。",
  },
  {
    id: "lr-002",
    title: "化学物質のリスクアセスメント対象拡大",
    publishedAt: "2025-11-01",
    summary:
      "対象物質の範囲が拡大され、保管・取扱い工程ごとのリスク評価と作業手順書の更新が必要になります。",
  },
  {
    id: "lr-003",
    title: "熱中症対策に関する管理体制の明確化",
    publishedAt: "2025-07-10",
    summary:
      "WBGT値を踏まえた休憩計画、給水管理、体調報告の運用が明記され、夏季の現場管理基準が具体化されました。",
  },
];
