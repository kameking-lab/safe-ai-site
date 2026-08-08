/**
 * RAカードの「物質リスト収載候補」バッジ導出。
 *
 * P0是正（2026-07-11）: かつて結論カードのバッジは AI 自由文の regulatoryNotes への
 * 言及正規表現（/特定化学物質|特化則/ 等）で点灯しており、
 * 「特定化学物質障害予防規則：非該当とされています」のような否定文からも
 * 偽バッジが出た（本番カプサイシンで実発生）。
 * バッジは正本突合済みの /api/chemical/legal-profile（substance-legal-audit /
 * other-laws-audit の監査対象データ）だけから導出する。AI 自由文からは導出しない。
 */

/** legal-profile API 応答のうちバッジ導出に使う部分 */
export type LegalProfileTagSource = {
  resolved: boolean;
  /** 安衛法特別則の導出タグ（tokutei-1/2/3, yuki-1/2/3, namari, sekimen 等） */
  oshaTags?: string[];
  /** 表示・通知対象物質リスト上の収載。個別作業への義務適用ではない。 */
  raTarget?: boolean;
};

/** oshaTag → 物質リスト上の収載候補ラベル。 */
const OSHA_TAG_SHORT: Record<string, string> = {
  "tokutei-1": "特化則収載候補",
  "tokutei-2": "特化則収載候補",
  "tokutei-3": "特化則収載候補",
  "yuki-1": "有機則収載候補",
  "yuki-2": "有機則収載候補",
  "yuki-3": "有機則収載候補",
  namari: "鉛則収載候補",
  yonalkyl: "四アルキル鉛則収載候補",
  sekimen: "石綿則収載候補",
  sankketsu: "酸欠則収載候補",
  funjin: "粉じん則収載候補",
};

/**
 * 監査済みプロファイルから結論カードの法規制バッジを導出する純関数。
 * 未解決（収載外）・取得失敗は空配列＝バッジなし。
 */
export function auditedRegulationTags(
  profile: LegalProfileTagSource | null | undefined,
): string[] {
  if (!profile?.resolved) return [];
  const out: string[] = [];
  for (const t of profile.oshaTags ?? []) {
    const short = OSHA_TAG_SHORT[t];
    if (short && !out.includes(short)) out.push(short);
  }
  if (
    profile.raTarget &&
    !out.includes("表示・通知対象物質リスト収載候補")
  ) {
    out.push("表示・通知対象物質リスト収載候補");
  }
  return out;
}
