/**
 * 機能紹介ページ群で使う機能カタログ
 * - /features （トップ）
 * - /features/[category]
 * - /features/use-cases
 * - /features/comparison
 * - /features/quick-tour
 * - /features/print
 */

export type FeatureCategoryId =
  | "ai-chat"
  | "chemical-ra"
  | "ky"
  | "safety-equipment"
  | "databases"
  | "education"
  | "management"
  | "signage";

export type FeatureItem = {
  /** スクショ・URL用スラッグ */
  slug: string;
  /** 表示名 */
  title: string;
  /** 1行説明（カード用） */
  summary: string;
  /** 詳細説明（カテゴリページ用） */
  description: string;
  /** 実機能のページパス */
  href: string;
  /** カテゴリ */
  category: FeatureCategoryId;
  /** タグ */
  tags?: string[];
};

export type FeatureCategory = {
  id: FeatureCategoryId;
  title: string;
  summary: string;
  description: string;
  /** Tailwindの色トークン（emerald, blue …） */
  accent: string;
};

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: "ai-chat",
    title: "AI機能",
    summary: "安衛法の解釈・現場質問にAIが即回答",
    description:
      "労働安全衛生法・通達・告示を学習したAIが、現場の質問に根拠つきで回答します。チャットボット、リスク予測、化学物質RAなど、判断に時間がかかる業務をAIで支援します。",
    accent: "blue",
  },
  {
    id: "chemical-ra",
    title: "化学物質リスクアセスメント",
    summary: "改正安衛法（2024年4月施行）対応のRA一式",
    description:
      "GHS分類・SDS取込・CREATE-SIMPLE互換のばく露見積もり・記録保管まで、改正安衛法に準拠した化学物質リスクアセスメントを一貫支援します。",
    accent: "violet",
  },
  {
    id: "ky",
    title: "KY（危険予知）",
    summary: "現場で5分、AI補助つきKYミーティング",
    description:
      "業種別プリセット、AIによるリスク抽出、署名つき記録、PDF出力までスマホ完結。ベテラン不在の現場でも質の高いKYが回せます。",
    accent: "amber",
  },
  {
    id: "safety-equipment",
    title: "安全装備・グッズ",
    summary: "用途・規格から選べる装備カタログ",
    description:
      "墜落制止用器具・保護具・標識など、JIS/JT8など規格と用途から横断検索できます。発注前の規格確認や、研修教材としても利用可能です。",
    accent: "red",
  },
  {
    id: "databases",
    title: "データベース",
    summary: "事故・通達・法令・化学物質を横断検索",
    description:
      "厚労省公表データを基に、死傷災害事例・行政通達・法令・化学物質情報を横断検索できます。現場の判断材料として、また監査対応の資料として活用可能です。",
    accent: "sky",
  },
  {
    id: "education",
    title: "教育・学習",
    summary: "Eラーニング・特別教育・資格試験",
    description:
      "業種別カリキュラム、進捗管理、修了証発行までEラーニングで完結。労働安全衛生法に基づく特別教育・資格試験対策も用意しています。",
    accent: "emerald",
  },
  {
    id: "management",
    title: "管理ツール",
    summary: "多拠点・点検・日誌・診断を一元管理",
    description:
      "LMS（多拠点管理）、安全衛生日誌、コンプライアンス診断、助成金シミュレーターなど、安全担当者の管理業務を一元化します。",
    accent: "indigo",
  },
  {
    id: "signage",
    title: "サイネージ",
    summary: "現場掲示用フルスクリーン表示",
    description:
      "事務所モニター・現場サイネージで自動巡回表示。気象警報・注意喚起・KSD注意点をリアルタイムに表示できます。",
    accent: "slate",
  },
];

export const FEATURES: FeatureItem[] = [
  // AI機能
  {
    slug: "chatbot",
    title: "安衛法チャットボット",
    summary: "労働安全衛生法を学習したAIに質問できる",
    description:
      "労働安全衛生法・施行令・規則・告示・通達を学習したAIが、自然言語の質問に根拠条文つきで回答します。",
    href: "/chatbot",
    category: "ai-chat",
    tags: ["AI", "法令", "Q&A"],
  },
  {
    slug: "risk-prediction",
    title: "AIリスク予測",
    summary: "作業内容からリスクと対策をAIが提案",
    description:
      "作業内容・場所・人員・天候を入力すると、想定リスクと対策案をAIが提示。KY前の予習や新規工程の事前検討に。",
    href: "/risk-prediction",
    category: "ai-chat",
    tags: ["AI", "リスク評価"],
  },
  {
    slug: "chemical-ra",
    title: "化学物質リスクアセスメント",
    summary: "GHS分類とCREATE-SIMPLE互換のRA",
    description:
      "化学物質の有害性区分・ばく露見積もり・対策レベルの判定を、改正安衛法対応で実施できます。",
    href: "/chemical-ra",
    category: "chemical-ra",
    tags: ["化学物質", "RA"],
  },
  {
    slug: "chemical-database",
    title: "化学物質検索DB",
    summary: "GHS分類・SDS情報を横断検索",
    description:
      "厚労省・経産省のオープンデータを統合した化学物質データベース。CAS番号・物質名・用途から検索できます。",
    href: "/chemical-database",
    category: "chemical-ra",
    tags: ["化学物質", "DB"],
  },
  // KY
  {
    slug: "ky",
    title: "KY用紙（危険予知）",
    summary: "業種別プリセット＋AI補助＋署名記録",
    description:
      "建設・製造・林業など業種別プリセット、AIによるリスク提案、参加者署名、PDF出力を備えたKYツール。",
    href: "/ky",
    category: "ky",
    tags: ["KY", "現場"],
  },
  {
    slug: "safety-diary",
    title: "安全衛生日誌",
    summary: "毎日の安全活動をスマホで記録",
    description:
      "朝礼・KY・点検・指導内容を日誌形式で記録。月次集計や監査対応の証跡として活用できます。",
    href: "/safety-diary",
    category: "ky",
    tags: ["日誌", "記録"],
  },
  // 安全装備
  {
    slug: "equipment-finder",
    title: "安全グッズ・装備検索",
    summary: "規格・用途から保護具を横断検索",
    description:
      "墜落制止用器具・保護具・安全標識など、規格と用途から検索できる装備カタログ。",
    href: "/goods",
    category: "safety-equipment",
    tags: ["装備", "保護具"],
  },
  {
    slug: "resources",
    title: "資料ライブラリ",
    summary: "厚労省リーフレット・通達を集約",
    description:
      "厚生労働省が公表したリーフレット・通達・パンフレットを集約。出典リンクつきでダウンロード可能です。",
    href: "/resources",
    category: "safety-equipment",
    tags: ["資料"],
  },
  // データベース
  {
    slug: "accidents",
    title: "事故データベース",
    summary: "死傷災害事例を業種・原因で検索",
    description:
      "厚労省「労働災害事例」を構造化したデータベース。業種・起因物・原因から検索でき、KYの参考事例として活用できます。",
    href: "/accidents",
    category: "databases",
    tags: ["事故", "DB"],
  },
  {
    slug: "law-search",
    title: "法令検索",
    summary: "労働安全衛生法・規則を全文検索",
    description:
      "労働安全衛生法・施行令・規則・関連告示を全文検索。条文へのパーマリンクと改正履歴を表示します。",
    href: "/law-search",
    category: "databases",
    tags: ["法令", "検索"],
  },
  {
    slug: "circulars",
    title: "通達・法改正",
    summary: "厚労省通達・法改正の最新動向",
    description:
      "労働基準局通達・基発・基安発などの公式通達と、安衛法の改正動向を時系列でフォローできます。",
    href: "/laws",
    category: "databases",
    tags: ["通達", "法改正"],
  },
  {
    slug: "qa-knowledge",
    title: "安全用語辞書",
    summary: "現場用語・法令用語の解説集",
    description:
      "安衛法用語・現場用語・略語を平易な言葉で解説。新人研修やふりがな表示と組み合わせて使えます。",
    href: "/glossary",
    category: "databases",
    tags: ["辞書", "用語"],
  },
  // 教育
  {
    slug: "education",
    title: "特別教育",
    summary: "安衛法の特別教育・能力向上教育",
    description:
      "労働安全衛生法に基づく特別教育（フルハーネス・足場・玉掛けなど）と能力向上教育を提供します。",
    href: "/education",
    category: "education",
    tags: ["特別教育", "資格"],
  },
  {
    slug: "e-learning",
    title: "Eラーニング",
    summary: "業種別カリキュラム・進捗管理",
    description:
      "建設・製造・林業・運輸・医療福祉など業種別の安全教育カリキュラム。進捗管理・修了証発行まで対応。",
    href: "/e-learning",
    category: "education",
    tags: ["Eラーニング"],
  },
  {
    slug: "exam-quiz",
    title: "資格試験過去問",
    summary: "労働安全衛生コンサルタント等の過去問",
    description:
      "労働安全衛生コンサルタント・衛生管理者・安全管理者選任時研修などの過去問・模擬試験を収録。",
    href: "/exam-quiz",
    category: "education",
    tags: ["資格", "過去問"],
  },
  // 管理ツール
  {
    slug: "wizard",
    title: "コンプラ診断ウィザード",
    summary: "10問でコンプライアンス状況を診断",
    description:
      "10問程度の質問に答えると、労働安全衛生法上の必須対応項目と未着手項目を自動判定します。",
    href: "/wizard",
    category: "management",
    tags: ["診断", "コンプラ"],
  },
  {
    slug: "subsidies-calculator",
    title: "助成金シミュレーター",
    summary: "活用できる助成金を即時試算",
    description:
      "事業規模・業種・取り組み内容を入力すると、エイジフレンドリー補助金・人材開発支援助成金などの試算を表示します。",
    href: "/subsidies/calculator",
    category: "management",
    tags: ["助成金"],
  },
  {
    slug: "lms",
    title: "LMS（多拠点管理）",
    summary: "事業所横断の教育・点検管理",
    description:
      "支店・現場ごとの受講状況・点検実績を一元管理。経営層向けの集計レポートも自動生成します。",
    href: "/lms",
    category: "management",
    tags: ["LMS", "多拠点"],
  },
  {
    slug: "consulting",
    title: "月額顧問",
    summary: "労働安全コンサルタントの月額契約",
    description:
      "登録労働安全コンサルタントが月額で安全管理を支援。リスクアセスメント・安全パト・教育設計まで対応します。",
    href: "/consulting",
    category: "management",
    tags: ["顧問", "サービス"],
  },
  {
    slug: "services",
    title: "受託業務",
    summary: "安全書類・教育設計・職場巡視の代行",
    description:
      "安全書類作成、特別教育設計、職場巡視同行、是正指導書作成などをスポット契約で受託します。",
    href: "/services",
    category: "management",
    tags: ["受託"],
  },
  {
    slug: "stats",
    title: "サイト統計・運営者情報",
    summary: "登録番号260022の労働安全コンサルタント監修",
    description:
      "本サイトは登録労働安全コンサルタント（登録番号260022）が監修。利用統計・監修方針を公開しています。",
    href: "/about",
    category: "management",
    tags: ["運営者"],
  },
  {
    slug: "about-cases",
    title: "導入事例",
    summary: "実際の導入事例とビフォーアフター",
    description:
      "建設・製造・運輸・医療福祉など、各業種での導入事例とビフォーアフターを紹介します。",
    href: "/cases",
    category: "management",
    tags: ["事例"],
  },
  {
    slug: "community-cases",
    title: "利用者の声",
    summary: "現場担当者からのフィードバック",
    description:
      "実際にANZEN AIを使っている現場担当者・安全管理者の声を集約。改善要望・追加機能の提案窓口も。",
    href: "/cases",
    category: "management",
    tags: ["利用者"],
  },
  // サイネージ
  {
    slug: "signage",
    title: "サイネージ",
    summary: "現場掲示用フルスクリーン表示",
    description:
      "事務所モニター・現場用サイネージで自動巡回表示。気象警報・注意喚起・KSD注意点を表示できます。",
    href: "/signage",
    category: "signage",
    tags: ["サイネージ", "現場"],
  },
  {
    slug: "quick",
    title: "クイックアクセス",
    summary: "頻出機能への即アクセス",
    description:
      "KY用紙・事故DB・法令検索・チャットボットなど、現場で頻繁に使う機能へのショートカット集。",
    href: "/quick",
    category: "signage",
    tags: ["クイック"],
  },
  {
    slug: "home",
    title: "ポータルトップ",
    summary: "全機能を1画面に集約したポータル",
    description:
      "天候リスク・最新通達・事故事例・KY・事業所情報を1画面に集約。事務所のメインダッシュボードとして使えます。",
    href: "/",
    category: "signage",
    tags: ["ポータル"],
  },
];

export function getFeaturesByCategory(categoryId: FeatureCategoryId): FeatureItem[] {
  return FEATURES.filter((f) => f.category === categoryId);
}

export function getCategoryById(categoryId: string): FeatureCategory | undefined {
  return FEATURE_CATEGORIES.find((c) => c.id === categoryId);
}

/**
 * カテゴリのアクセント色 → Tailwind classes
 */
export function categoryColorClasses(accent: string) {
  const map: Record<string, { bg: string; text: string; border: string; ring: string; gradient: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", ring: "ring-blue-500", gradient: "from-blue-500 to-blue-700" },
    violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", ring: "ring-violet-500", gradient: "from-violet-500 to-violet-700" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", ring: "ring-amber-500", gradient: "from-amber-500 to-amber-700" },
    red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", ring: "ring-red-500", gradient: "from-red-500 to-red-700" },
    sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", ring: "ring-sky-500", gradient: "from-sky-500 to-sky-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", ring: "ring-emerald-500", gradient: "from-emerald-500 to-emerald-700" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", ring: "ring-indigo-500", gradient: "from-indigo-500 to-indigo-700" },
    slate: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", ring: "ring-slate-500", gradient: "from-slate-500 to-slate-700" },
  };
  return map[accent] || map.emerald;
}
