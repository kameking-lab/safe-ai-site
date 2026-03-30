export type LawRevision = {
  id: string;
  title: string;
  publishedAt: string;
  summary: string;
  aiSummary: {
    threeLineSummary: [string, string, string];
    workplaceActions: string[];
    targetIndustries: string[];
  };
};

export const lawRevisions: LawRevision[] = [
  {
    id: "lr-001",
    title: "高所作業時の墜落防止措置の強化",
    publishedAt: "2026-01-15",
    summary:
      "足場の点検頻度と安全帯の使用基準が見直され、現場責任者による作業前確認の明確化が求められます。",
    aiSummary: {
      threeLineSummary: [
        "高所作業前に足場と安全帯の点検を毎日行う必要があります。",
        "作業責任者による開始前チェックの記録が法的に重要になります。",
        "墜落リスクが高い工程では二重の確認体制が推奨されます。",
      ],
      workplaceActions: [
        "始業前チェックシートに足場・安全帯点検項目を追加する",
        "高所作業の責任者サイン欄を設けて記録を残す",
        "危険箇所の再教育を月1回実施する",
      ],
      targetIndustries: ["建設業", "設備工事業", "物流業（高所作業含む）"],
    },
  },
  {
    id: "lr-002",
    title: "化学物質のリスクアセスメント対象拡大",
    publishedAt: "2025-11-01",
    summary:
      "対象物質の範囲が拡大され、保管・取扱い工程ごとのリスク評価と作業手順書の更新が必要になります。",
    aiSummary: {
      threeLineSummary: [
        "リスクアセスメント対象に新規化学物質が追加されます。",
        "保管・投入・廃棄まで工程単位で危険性を見直す必要があります。",
        "手順書と保護具選定の更新を同時に進めることが有効です。",
      ],
      workplaceActions: [
        "SDSを再確認し、対象物質リストを更新する",
        "工程ごとにばく露リスク評価を実施する",
        "保護具の着用基準を現場掲示物に反映する",
      ],
      targetIndustries: ["製造業", "化学工業", "清掃・メンテナンス業"],
    },
  },
  {
    id: "lr-003",
    title: "熱中症対策に関する管理体制の明確化",
    publishedAt: "2025-07-10",
    summary:
      "WBGT値を踏まえた休憩計画、給水管理、体調報告の運用が明記され、夏季の現場管理基準が具体化されました。",
    aiSummary: {
      threeLineSummary: [
        "WBGT値に応じて作業と休憩の間隔を調整する運用が必要です。",
        "給水・塩分補給と体調報告の仕組みを明文化することが求められます。",
        "夏季は責任者による巡回頻度を増やし早期発見を徹底します。",
      ],
      workplaceActions: [
        "WBGT計の測定結果を朝礼で共有する",
        "休憩所の冷却設備と飲料補充を当番制で管理する",
        "体調不良時の連絡フローを全員に周知する",
      ],
      targetIndustries: ["建設業", "製造業", "運送業", "警備業"],
    },
  },
];
