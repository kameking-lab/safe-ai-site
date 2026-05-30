/** 主要機能ナビゲーション定義 */

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
    label: "安全工程打合せ書",
    icon: "📋",
    cardTitle: "安全工程打合せ書・安全衛生指示書",
    cardDescription:
      "元請が前日5分で各社の作業・使用機械・予想災害・リスク・指示を1枚に。AI提案・点検項目・印刷・KY転記。",
    href: "/safety-diary",
    subItems: [
      { label: "打合せ書を作成", href: "/safety-diary" },
      { label: "保存一覧", href: "/safety-diary/list" },
    ],
  },
  {
    id: "ky",
    label: "KY簡易作成",
    icon: "📝",
    cardTitle: "KY簡易作成",
    cardDescription:
      "業種別プリセット・音声入力対応。3分で危険予知活動表を作成し、サイネージや日誌に転記できます。",
    href: "/ky/paper",
    subItems: [
      { label: "新規KY作成", href: "/ky/paper" },
      { label: "KY事例データベース", href: "/ky-examples", description: "5業種×10作業150件の危険予知実例。作業別に検索してKY用紙作成に活用" },
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
      { label: "通達・判例", href: "/circulars" },
      { label: "条文検索", href: "/law-search" },
      { label: "法令体系マップ", href: "/law-hierarchy", description: "法→政令→省令→告示の階層構造を俯瞰" },
      { label: "年次安全衛生計画ジェネレーター", href: "/strategy/plan-generator", description: "業種・規模別の39テンプレートから年次計画書を自動生成" },
      { label: "健康診断スケジューラ", href: "/health-checkup-scheduler", description: "業種・職種・物質・作業条件から必要健診と年間スケジュールを自動判定" },
      { label: "治療と仕事の両立支援", href: "/treatment-work-balance", description: "6疾患カテゴリの病態別労務配慮と両立支援プラン・主治医意見書テンプレ" },
      { label: "熱中症対策ハブ", href: "/heat-illness-prevention", description: "WBGT計算機・業種別リスク判定・R7安衛則改正チェックリストと社内文書テンプレ" },
      { label: "メンタルヘルス対策", href: "/mental-health-management", description: "ストレスチェック義務・産業医面接指導・小規模事業場向けの実務ガイドと書式" },
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
      { label: "FAQ 200問", href: "/faq", description: "法令・管理体制・化学物質・健康管理の200問を法令根拠付きで解説" },
      { label: "ご意見・改善提案", href: "/contact", description: "サイトへの要望・追加してほしい機能はこちらからお寄せください" },
    ],
  },
  {
    id: "accidents",
    label: "事故事例・分析",
    icon: "🚨",
    cardTitle: "事故事例データベース・分析",
    cardDescription:
      "厚労省の事例検索・業種別の自動分析レポート・統計ダッシュボード（約5,000件）・重大災害事例を横断できます。",
    href: "/accidents",
    subItems: [
      { label: "事故DB検索（事例・出典付き）", href: "/accidents", description: "厚労省の死傷・死亡災害事例を業種・原因・作業区分で検索" },
      { label: "業種別 事故分析レポート", href: "/accidents-reports", description: "5業種の事故型・原因・対策・関連法令を自動集計" },
      { label: "事故統計ダッシュボード", href: "/accidents-analytics", description: "事故型・業種・経年の傾向をグラフで把握" },
      { label: "重大災害事例（死亡災害）", href: "/accident-news", description: "公表事実・匿名・出典付きで業種・事故型・原因から類型検索" },
      { label: "業種別 安全管理ポータル", href: "/industries", description: "10業種の重点課題・関連法令・通達・推奨機能への動線をワンページに集約" },
      // P1-J: /stats はサンプル表示が露出するため主要機能ナビから除外
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
    cardTitle: "業種別ポータル 10業種",
    cardDescription:
      "建設・製造・運輸・医療福祉・サービス・小売・飲食・卸売・倉庫・事務系の10業種から、事故レポート・KY・通達・化学物質・特別教育・年次計画を横断的に活用。",
    href: "/industries",
    subItems: [
      {
        label: "建設業",
        href: "/industries/construction",
        description: "足場・重機・高所作業・石綿の安全管理。事故レポート・KY例・必要資格を10セクションで網羅。",
      },
      {
        label: "製造業",
        href: "/industries/manufacturing",
        description: "機械・化学物質・粉じん・ロボットのリスク管理。化学物質RAと特別教育を業種別に整理。",
      },
      {
        label: "運輸交通業",
        href: "/industries/transport",
        description: "改善基準告示・荷役・腰痛・健康起因事故対策。陸災防5大災害ベースの事故事例と年次計画。",
      },
      {
        label: "医療・福祉",
        href: "/industries/healthcare",
        description: "腰痛・感染症・暴力・メンタル対応。ノーリフトケア・ストレスチェック・健診スケジュール。",
      },
      {
        label: "サービス業（宿泊・清掃・教育）",
        href: "/industries/service",
        description: "転倒・ロープ高所・カスハラ・防火管理。雇入れ時教育と業種別KYテンプレートを活用。",
      },
      {
        label: "小売業（スーパー・コンビニ）",
        href: "/industries/retail",
        description: "品出し腰痛・転倒・カスハラ・深夜業健診。学生アルバイト教育と防火管理を集約。",
      },
      {
        label: "飲食業（レストラン・居酒屋）",
        href: "/industries/food",
        description: "厨房切創・やけど・熱中症・HACCP対応。年少者就業制限と若年労働者教育を業種別に整理。",
      },
      {
        label: "卸売業",
        href: "/industries/wholesale",
        description: "フォークリフト・荷役腰痛・配送中事故。改善基準告示と腰痛予防教育を集約。",
      },
      {
        label: "倉庫業（物流・3PL）",
        href: "/industries/warehouse",
        description: "自動倉庫・AGV・ピッキング・冷凍庫凍傷。物流DX対応の特別教育とリスクアセスメント。",
      },
      {
        label: "事務系（情報通信・金融・士業）",
        href: "/industries/office",
        description: "メンタルヘルス・VDT・長時間労働・テレワーク・ハラスメント。ストレスチェック実務を集約。",
      },
      {
        label: "安全衛生標識データベース",
        href: "/safety-signs",
        description: "JIS Z 9101準拠の110標識・業種別の必須／推奨セット・設置位置ガイド。",
      },
      {
        label: "外国人労働者支援",
        href: "/foreign-workers",
        description: "在留資格別の安全衛生義務・多言語教材・技能実習生対応ガイド。",
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
