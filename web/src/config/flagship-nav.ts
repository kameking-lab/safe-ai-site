/** 7目玉の主要機能ナビゲーション定義 */

export type FlagshipSubItem = {
  label: string;
  href: string;
  description?: string;
};

export type FlagshipFeature = {
  /** ID（URLとは別の識別子） */
  id: string;
  /** ナビ表示用ラベル */
  label: string;
  /** カードの絵文字 */
  icon: string;
  /** トップ機能カード用の見出し */
  cardTitle: string;
  /** トップ機能カード用の説明文 */
  cardDescription: string;
  /** メインのリンク先 */
  href: string;
  /** ホバー時の Popover に並べる配下機能 */
  subItems: FlagshipSubItem[];
};

export const FLAGSHIP_FEATURES: FlagshipFeature[] = [
  {
    id: "safety-diary",
    label: "安全衛生日誌",
    icon: "📓",
    cardTitle: "安全衛生日誌",
    cardDescription:
      "現場の朝礼・作業内容・KY結果・ヒヤリハットを3〜5分で記録。月次まとめでトレンドが見える化。",
    href: "/safety-diary",
    subItems: [
      { label: "新規作成（必須5項目）", href: "/safety-diary/new" },
      { label: "詳細モード（任意8項目）", href: "/safety-diary/new/detail" },
      { label: "月次まとめ", href: "/safety-diary" },
    ],
  },
  {
    id: "ky",
    label: "KY簡易作成",
    icon: "📝",
    cardTitle: "KY簡易作成",
    cardDescription:
      "業種別プリセット・音声入力対応。3分で危険予知活動表を作成し、サイネージや日誌に転記できます。",
    href: "/ky",
    subItems: [
      { label: "新規KY作成", href: "/ky" },
      { label: "PDFエクスポート", href: "/pdf" },
      { label: "業種別プリセット", href: "/ky" },
    ],
  },
  {
    id: "chemical-ra",
    label: "化学物質RA",
    icon: "⚗️",
    cardTitle: "化学物質リスクアセスメント",
    cardDescription:
      "CREATE-SIMPLEに準拠した簡易RA。化学物質DB・SDS連携で、一般工業薬品から有機溶剤まで評価できます。",
    href: "/chemical-ra",
    subItems: [
      { label: "新規アセスメント", href: "/chemical-ra" },
      { label: "化学物質検索", href: "/chemical-database" },
      { label: "濃度基準値", href: "/chemical-database" },
    ],
  },
  {
    id: "signage",
    label: "サイネージ",
    icon: "📺",
    cardTitle: "サイネージ表示",
    cardDescription:
      "事務所モニター・現場掲示用。図面サンプル＋気象警報＋法改正＋ニュースを30分ごとに自動更新。",
    href: "/signage",
    subItems: [
      { label: "標準ダッシュボード", href: "/signage" },
      { label: "地図モード", href: "/signage/map" },
      { label: "ディスプレイ表示", href: "/signage/display" },
    ],
  },
  {
    id: "laws",
    label: "法改正一覧",
    icon: "📚",
    cardTitle: "法改正・通達",
    cardDescription:
      "厚労省・国土交通省・経産省などの安衛法関連改正を時系列で整理。施行日カウントダウン付き。",
    href: "/laws",
    subItems: [
      { label: "法改正一覧", href: "/laws" },
      { label: "通達・判例", href: "/laws/notices-precedents" },
      { label: "条文検索", href: "/law-search" },
      { label: "通達原文", href: "/circulars" },
    ],
  },
  {
    id: "chatbot",
    label: "安衛法AIチャット",
    icon: "💬",
    cardTitle: "安衛法AIチャット",
    cardDescription:
      "労働安全衛生法・関連省令・通達に特化したチャットボット。条文番号・出典付きで回答します。",
    href: "/chatbot",
    subItems: [
      { label: "AIに質問する", href: "/chatbot" },
      { label: "用語集", href: "/glossary" },
      { label: "Q&Aナレッジ", href: "/qa-knowledge" },
    ],
  },
  {
    id: "accidents",
    label: "重大事故ニュース",
    icon: "🚨",
    cardTitle: "重大事故・労災ニュース",
    cardDescription:
      "厚労省・自治体・報道から重大災害・死傷事故を集約。業種・作業区分でフィルタ可能。",
    href: "/accidents",
    subItems: [
      { label: "事故データベース", href: "/accidents" },
      { label: "労災死傷統計", href: "/stats" },
      { label: "リスク予測", href: "/risk-prediction" },
    ],
  },
];

export function getFlagshipById(id: string): FlagshipFeature | undefined {
  return FLAGSHIP_FEATURES.find((f) => f.id === id);
}
