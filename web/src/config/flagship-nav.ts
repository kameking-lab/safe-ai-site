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
      { label: "業種別プリセット", href: "/ky#presets" },
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
      { label: "濃度基準値", href: "/chemical-database#limits" },
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
      { label: "法令体系マップ", href: "/law-hierarchy", description: "法→政令→省令→告示の階層構造を俯瞰" },
      { label: "年次安全衛生計画ジェネレーター", href: "/strategy/plan-generator", description: "業種・規模別の30テンプレートから年次計画書を自動生成" },
      { label: "健康診断スケジューラ", href: "/health-checkup-scheduler", description: "業種・職種・物質・作業条件から必要健診と年間スケジュールを自動判定" },
      { label: "治療と仕事の両立支援", href: "/treatment-work-balance", description: "6疾患カテゴリの病態別労務配慮と両立支援プラン・主治医意見書テンプレ" },
      { label: "熱中症対策ハブ", href: "/heat-illness-prevention", description: "WBGT計算機・業種別リスク判定・R7安衛則改正チェックリストと社内文書テンプレ" },
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
      { label: "業種別 安全管理ポータル", href: "/industries", description: "5業種の重点課題・関連法令・推奨機能への動線をワンページに集約" },
      { label: "業種別 事故分析レポート", href: "/accidents-reports", description: "5業種の事故型・原因・対策・関連法令を自動集計" },
      { label: "事故統計ダッシュボード", href: "/accidents-analytics" },
      { label: "労災死傷統計", href: "/stats" },
      { label: "リスク予測", href: "/risk-prediction" },
    ],
  },
  {
    id: "education-certification",
    label: "特別教育・技能講習",
    icon: "🎓",
    cardTitle: "特別教育・技能講習DB",
    cardDescription:
      "安衛則第36条の特別教育（約60種）・技能講習（約40種）を完全収録。業種・作業から必要資格を即時判定。根拠条文付き。",
    href: "/education-certification",
    subItems: [
      {
        label: "資格判定ツール",
        href: "/education-certification/finder",
        description: "業種・作業を選んで必要資格を自動判定",
      },
      {
        label: "特別教育一覧（安衛則第36条）",
        href: "/education-certification#special",
        description: "約60種の特別教育を根拠条文付きで確認",
      },
      {
        label: "技能講習一覧（就業制限）",
        href: "/education-certification#skill",
        description: "約40種の技能講習・就業制限業務",
      },
      {
        label: "Eラーニング・受講申込",
        href: "/education",
        description: "特別教育コースのオンライン受講",
      },
      {
        label: "石綿（アスベスト）対応支援",
        href: "/asbestos-management",
        description: "R4.4施行の事前調査結果報告義務に対応した判定ツール・届出書類自動生成・作業計画テンプレ",
      },
    ],
  },
  {
    id: "industries",
    label: "業種から探す",
    icon: "🏭",
    cardTitle: "業種別ポータル",
    cardDescription:
      "建設・製造・運輸・医療福祉・サービスの5業種から、事故レポート・KY事例・健診・資格・年次計画を横断的に活用。",
    href: "/industries",
    subItems: [
      {
        label: "建設業",
        href: "/industries/construction",
        description: "足場・重機・高所作業の安全管理。事故レポート・KY事例・必要資格を確認。",
      },
      {
        label: "製造業",
        href: "/industries/manufacturing",
        description: "機械・化学物質・騒音のリスク管理。業種別分析レポートと必要資格を確認。",
      },
      {
        label: "運輸交通業",
        href: "/industries/transport",
        description: "交通労災・荷役・長時間労働対策。事故事例と年次計画テンプレートを活用。",
      },
      {
        label: "医療・福祉",
        href: "/industries/healthcare",
        description: "腰痛・感染症・メンタルヘルス対応。業種特有の健診スケジュールを確認。",
      },
      {
        label: "サービス業",
        href: "/industries/service",
        description: "転倒・労務管理・顧客対応ストレス。業種別ポータルからツールを横断利用。",
      },
    ],
  },
  {
    id: "work-environment",
    label: "作業環境測定",
    icon: "🔬",
    cardTitle: "作業環境測定 管理区分判定",
    cardDescription:
      "安衛令第21条の10種類の測定対象を自動判定。A測定・B測定から管理区分（第1〜第3）を算出し、区分別改善措置を提案。作業環境測定法準拠。",
    href: "/work-environment-measurement",
    subItems: [
      {
        label: "測定対象作業場チェッカー",
        href: "/work-environment-measurement/target-finder",
        description: "業種・工程・物質から測定義務対象を判定",
      },
      {
        label: "管理区分 判定ツール",
        href: "/work-environment-measurement/management-class-judge",
        description: "A測定・B測定値から第1〜第3区分を算出",
      },
    ],
  },
];

export function getFlagshipById(id: string): FlagshipFeature | undefined {
  return FLAGSHIP_FEATURES.find((f) => f.id === id);
}
