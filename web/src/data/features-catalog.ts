/**
 * 機能紹介ページ群で使う機能カタログ
 * - /features （トップ）
 * - /features/[category]
 * - /features/use-cases
 * - /features/comparison
 * - /features/quick-tour
 * - /features/print
 */

import { SITE_STATS } from "@/data/site-stats";

export type FeatureCategoryId =
  | "ai-chat"
  | "chemical-ra"
  | "ky"
  | "construction-calc"
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
    id: "construction-calc",
    title: "建設計算",
    summary: "玉掛け・足場・掘削勾配を法令根拠つきで即計算",
    description:
      "玉掛けワイヤの安全荷重、単管足場の基準チェック、掘削面の勾配判定など、建設現場の計算を安衛則・クレーン則の条文根拠つきで実行できます。計算は検証済みの計算式が行い、AIは自由記述からの計算機案内と結果の解説を担当します。",
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
    summary: "多拠点・点検・打合せ書・診断を一元管理",
    description:
      "LMS（多拠点管理）、安全工程打合せ書、コンプライアンス診断、助成金シミュレーターなど、安全担当者の管理業務を一元化します。",
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
    title: "安全工程打合せ書",
    summary: "元請が前日5分で各社の作業・指示を1枚に",
    description:
      "各社の作業・使用機械・予想災害・リスク評価・指示を1枚に集約。点検項目8カテゴリ・使用機械自動集計・月次まとめ・印刷・KY転記に対応します。",
    href: "/safety-diary",
    category: "ky",
    tags: ["打合せ書", "記録"],
  },
  // 建設計算
  {
    slug: "construction-calc",
    title: "建設計算（現場計算機ポータル）",
    summary: "法令根拠つきの現場計算機。自由記述からAIが案内",
    description:
      "玉掛け・足場・掘削などの現場計算を、プルダウンと数値入力で即実行。全計算機に安衛則等の根拠条文と注意事項を明記し、自由記述からはAIが計算機と入力値を用意します（計算は検証済みの計算式が実行）。",
    href: "/construction-calc",
    category: "construction-calc",
    tags: ["計算", "建設", "AI"],
  },
  {
    slug: "sling-wire-load",
    title: "玉掛けワイヤ安全荷重計算",
    summary: "掛け方モード係数・逆引き対応で安全係数6を即判定",
    description:
      "荷の質量・掛け方（2点/あだ巻き/半掛け/目通し）・吊り角度・ワイヤ構成（6×24 A種/6×37 A種）からモード係数方式で張力を計算し、クレーン等安全規則第213条の安全係数6以上を判定。荷重から適合ワイヤ径を選ぶ逆引きにも対応します。",
    href: "/construction-calc/sling-wire-load",
    category: "construction-calc",
    tags: ["玉掛け", "クレーン則", "逆引き"],
  },
  {
    slug: "scaffold-tankan-check",
    title: "単管足場の基準チェック",
    summary: "建地間隔・積載荷重・壁つなぎを一括判定",
    description:
      "建地間隔（けた行1.85m・はり間1.5m）、建地間の積載荷重400kg、壁つなぎ間隔（垂直5m・水平5.5m）など安衛則第570条・第571条の基準への適合を一括チェックします。",
    href: "/construction-calc/scaffold-tankan-check",
    category: "construction-calc",
    tags: ["足場", "安衛則"],
  },
  {
    slug: "excavation-slope",
    title: "掘削勾配チェック",
    summary: "地山の種類×深さから法定上限勾配を判定",
    description:
      "地山の種類と掘削面の高さから、安衛則第356条・第357条の法定上限勾配を判定。予定勾配の適合チェックと作業主任者選任（第359条）の要否も表示します。",
    href: "/construction-calc/excavation-slope",
    category: "construction-calc",
    tags: ["掘削", "安衛則"],
  },
  {
    slug: "soil-volume-conversion",
    title: "土量換算（地山・ほぐし・締固め）",
    summary: "土量変化率で3状態を換算＋10tダンプ台数",
    description:
      "土質区分の土量変化率（L・C）で地山・ほぐし・締固めの3状態を相互換算し、運搬に必要な10tダンプの概算台数も算出。変化率は道路土工要綱等の参考代表値を出典明記で収録（手入力も可）。",
    href: "/construction-calc/soil-volume-conversion",
    category: "construction-calc",
    tags: ["土工", "土量", "積算"],
  },
  {
    slug: "crane-rated-load",
    title: "クレーン必要定格総荷重の逆引き",
    summary: "吊り荷＋吊り具から必要定格総荷重を算出",
    description:
      "吊り荷質量に吊り具（フック・玉掛用具）の質量を加えた必要定格総荷重を計算。メーカーの定格表は載せず、作業半径での可否は定格総荷重表で確認する運用に誘導します（クレーン則66条の2の作業計画つき）。",
    href: "/construction-calc/crane-rated-load",
    category: "construction-calc",
    tags: ["クレーン", "揚重", "クレーン則"],
  },
  {
    slug: "formwork-shoring-check",
    title: "型枠支保工の基準チェック",
    summary: "パイプサポートの継ぎ・水平つなぎを条文判定",
    description:
      "パイプサポート・鋼管支柱の継ぎ本数・継手ボルト数・水平つなぎ間隔から、労働安全衛生規則第242条の基準（3本以上継がない・継手4ボルト以上・高さ3.5m超は2m以内ごと水平つなぎ2方向）への適合を判定します。",
    href: "/construction-calc/formwork-shoring-check",
    category: "construction-calc",
    tags: ["型枠", "支保工", "安衛則"],
  },
  {
    slug: "cable-ampacity",
    title: "電線（600V IV）の許容電流チェック",
    summary: "電線サイズ×電流減少係数で許容電流を判定",
    description:
      "電線サイズと施設条件（同一管内の本数＝電流減少係数）から許容電流を求め、使用電流が範囲内かを判定。許容電流は内線規程の代表値を出典明記で収録し、停電・近接作業の安衛則（339・349条）にも結線します。",
    href: "/construction-calc/cable-ampacity",
    category: "construction-calc",
    tags: ["電気", "許容電流", "内線規程"],
  },
  {
    slug: "wind-load-temporary",
    title: "仮設足場・仮囲いの風荷重",
    summary: "令87条の速度圧×充実率で足場の風力を概算",
    description:
      "基準風速・地表面粗度区分・高さから建築基準法施行令第87条・告示1454の速度圧を求め、風力係数と充実率（メッシュシート等）を掛けて足場・仮囲いの設計用風力を概算します。安全側（過大側）の概算で、仮設工業会指針の充実率・風力係数を出典明記で解説します。",
    href: "/construction-calc/wind-load-temporary",
    category: "construction-calc",
    tags: ["風荷重", "足場", "仮囲い"],
  },
  {
    slug: "earth-pressure-shoring",
    title: "土圧の概算（ランキン＋静水圧）",
    summary: "主働／静止土圧と静水圧の重ね合わせで側圧を算定",
    description:
      "土止め支保工の設計外力となる側圧を、ランキン主働土圧（または静止土圧）と静水圧の重ね合わせで概算します。土質定数（γ・φ・c）は土質調査値を入力し、道路土工「仮設構造物工指針」・安衛則の土止め支保工（第368条〜・作業主任者）に結線します。",
    href: "/construction-calc/earth-pressure-shoring",
    category: "construction-calc",
    tags: ["土圧", "土止め", "山留め"],
  },
  {
    slug: "anchor-pullout",
    title: "あと施工アンカーの引抜き耐力",
    summary: "コーン破壊／付着で許容引抜き荷重と安全率を判定",
    description:
      "コンクリート強度・埋込み長さ・アンカー径からコーン状破壊耐力を、証明書の付着強度から付着破壊耐力を求め、安全率で許容引抜き荷重を判定します。メーカー固有値は必ず認定・試験証明書の値を入力する方式（勝手な既定値は使いません）。",
    href: "/construction-calc/anchor-pullout",
    category: "construction-calc",
    tags: ["アンカー", "引抜き", "あと施工"],
  },
  {
    slug: "water-pressure",
    title: "水圧の概算（静水圧・揚圧・ボイリング）",
    summary: "深さ・水位差から静水圧・浮き上がり安全率・ボイリング安全率を算定",
    description:
      "深さ・水位差から静水圧（側圧）を、押さえ荷重から揚圧（浮き上がり）安全率を、Gs・eから限界動水勾配に対するボイリング安全率を算定します。土圧計算機（土圧の概算）の水圧項の単独版・釜場排水/矢板の検討補助です。",
    href: "/construction-calc/water-pressure",
    category: "construction-calc",
    tags: ["水圧", "揚圧", "ボイリング"],
  },
  {
    slug: "formwork-lateral-pressure",
    title: "型枠の側圧（コンクリート打込み・液圧近似）",
    summary: "単位体積重量×打込み高さで型枠側圧の上限値P=W・Hを算定",
    description:
      "フレッシュコンクリートの単位体積重量と打込み高さから、型枠側圧の液圧近似（安全側の上限値）を算定します。打上り速度・温度による低減はJASS5／コンクリート標準示方書の最新版で個別確認が必要なため見込まず、常に上限側の値を返します。型枠支保工の基準チェックと相互リンク。",
    href: "/construction-calc/formwork-lateral-pressure",
    category: "construction-calc",
    tags: ["型枠", "側圧", "JASS5"],
  },
  {
    slug: "shoring-member-check",
    title: "土止め支保工の部材基準チェック（安衛則368〜375条）",
    summary: "材料・組立図・部材の取付け・点検周期・作業主任者選任を一括判定",
    description:
      "材料・組立図・切りばりや腹おこしの取付け・継手・接続部の緊結・立入禁止・点検周期（7日以内ごと・地震/大雨後）・作業主任者の選任を、労働安全衛生規則第368条〜第375条の遵守事項に沿って一括判定します。掘削勾配計算機のNG時、土圧計算機の側圧算定後の受け皿として相互リンク。",
    href: "/construction-calc/shoring-member-check",
    category: "construction-calc",
    tags: ["土止め支保工", "点検", "安衛則"],
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
    slug: "law-navi",
    title: "法令ナビ",
    summary: "分野・現場ことばから条文原文へ最短到達",
    description:
      `労働安全衛生法体系を分野別・現場の言葉（俗称・条番号・別表の意味）から引ける条文ナビ。全文含め${SITE_STATS.lawNaviTotalArticleCount}件超の条文を収載し、AI解説・現場ことば版（やさしい言い換え）で読解を補助します。`,
    href: "/law-navi",
    category: "databases",
    tags: ["法令", "ナビ"],
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
    slug: "plain-language",
    title: "現場ことば版（やさしい言い換え）",
    summary: "条文を平易な言葉に言い換えて併記",
    description:
      "読みづらい条文の直下に、原文の意味を変えずに書き換えた「現場ことば版」を併記。法令ナビの各条文ページに収載し、正は原文であることを明示した上で理解を補助します。",
    href: "/law-navi",
    category: "databases",
    tags: ["法令", "やさしい日本語"],
  },
  {
    slug: "search",
    title: "サイト内横断検索",
    summary: "事故・通達・化学物質などを一括検索",
    description:
      "条文・現場ことば版・法改正・通達・化学物質・事故事例・判例・用語・FAQ・教育コースなど、サイト内の全コンテンツを1つの検索窓とカテゴリタブで横断検索できます（⌘K/Ctrl+Kでも起動可）。",
    href: "/search",
    category: "databases",
    tags: ["検索", "横断"],
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
    slug: "hazard-slides",
    title: "災害の型別 安全教育スライド",
    summary: "21分類×統計から自動生成する教育スライド",
    description:
      "厚労省「事故の型」21分類ごとに、統計→多い原因→対策チェック（根拠条文付き）→確認クイズのスライドを実データから自動生成。投影（16:9）とA4横印刷に対応し、朝礼・職長教育・サイネージで使えます。",
    href: "/education/hazard-slides",
    category: "education",
    tags: ["教育", "スライド"],
  },
  {
    slug: "edu-pack",
    title: "法定教育スライドパック（無償）",
    summary: "申請不要・編集可・法定対応表つきの無償教材",
    description:
      "特別教育の学科・労働衛生教育に使える無償の教育スライド（申請不要・編集可）。告示正本から構造化したカリキュラムレジストリとの機械照合（CI）で法定科目の網羅を検証し、法定対応表を同梱。統計は最新の災害データに自動追従。投影（16:9）とA4横印刷に対応。第1弾はフルハーネス・熱中症。教材の提供は教育の実施ではありません。",
    href: "/education/pack",
    category: "education",
    tags: ["特別教育", "無償教材", "スライド", "熱中症", "フルハーネス"],
  },
  // 管理ツール
  {
    slug: "plan-generator",
    title: "年次安全衛生計画ジェネレーター",
    summary: "業種・規模別の39テンプレートから年次計画を生成",
    description:
      "業種13種×規模3段階の39テンプレートから、基本方針・重点目標・実施事項・月別スケジュール・関連法令を含む年次安全衛生計画書の雛形を生成。PDF出力可。",
    href: "/strategy/plan-generator",
    category: "management",
    tags: ["年次計画", "コンプラ"],
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
  // LMS entry removed: pre-launch β waitlist only. Audit reference F-001.
  {
    slug: "notifications",
    title: "通知センター・配信設定",
    summary: "気象警報・法改正・重大災害情報を見逃さない",
    description:
      "ヘッダーの通知センター（ベル）、画面表示中のOS通知、メール配信、RSS購読の4経路で気象警報・法改正・重大災害情報を通知します。",
    href: "/notifications",
    category: "management",
    tags: ["通知", "配信"],
  },
  {
    slug: "stats",
    title: "サイト統計・運営者情報",
    summary: "労働安全衛生コンサルタント（登録番号260022）監修",
    description:
      "本サイトは労働安全衛生コンサルタント（登録番号260022）が個人で監修。利用統計・監修方針を公開しています。",
    href: "/about",
    category: "management",
    tags: ["運営者"],
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
