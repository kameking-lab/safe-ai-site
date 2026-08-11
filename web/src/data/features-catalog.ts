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
import { isPublicRouteAvailable } from "@/lib/public-content-policy";

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
    summary: "公式法令の根拠候補を検索し、人の確認を支援",
    description:
      "生成AIによる自由回答は停止中です。e-Gov取得スナップショットから根拠候補を検索し、公式原文と対象時点を人が確認するための支援機能を案内します。",
    accent: "blue",
  },
  {
    id: "chemical-ra",
    title: "化学物質リスクアセスメント",
    summary: "CAS・SDS記載名と作業条件の確認を支援",
    description:
      "CAS番号による同一性確認、GHS分類・SDS・作業条件の整理、公式CREATE-SIMPLEへの案内、確認記録の作成を支援します。公式評価ロジックの代替ではありません。",
    accent: "violet",
  },
  {
    id: "ky",
    title: "KY（危険予知）",
    summary: "現場条件と人手確認を残すKY用紙",
    description:
      "作業場所、設備、重機、人員、天候、同時作業、変更点を記録し、候補は人が確認してから提出・承認します。未確認版は下書き表示付きで印刷でき、承認済みとは区別します。",
    accent: "amber",
  },
  {
    id: "construction-calc",
    title: "建設計算",
    summary: "検証済みの公開計算機だけを案内",
    description:
      "公開allowlistで検証済みの単位換算・数量計算だけを案内します。安全可否や法令適合を判定する旧計算機は再検証中で、自由記述AI案内も公開していません。",
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
    summary: "公開テーマは再検証中（検証済み0件）",
    description:
      "旧教材とクイズは一次資料との照合をやり直すため停止中です。検証済みの一般公開テーマは現在0件で、正式な法定教育・受講記録・修了証を代替しません。",
    accent: "emerald",
  },
  {
    id: "management",
    title: "管理ツール",
    summary: "端末内の帳票作成と確認状態を管理",
    description:
      "安全工程打合せ書など、現在公開中の帳票で確認状態と印刷状態を管理します。認証・多拠点LMS・DB本接続が必要な機能を利用可能とは案内しません。",
    accent: "indigo",
  },
  {
    id: "signage",
    title: "サイネージ",
    summary: "現場掲示用フルスクリーン表示",
    description:
      "事務所モニター・現場サイネージ向けに、気象庁の取得状態・対象地域・取得時刻と安全情報を表示します。取得不能を警報なしとは表示しません。",
    accent: "slate",
  },
];

const ALL_FEATURES: FeatureItem[] = [
  // AI機能
  {
    slug: "chatbot",
    title: "安衛法チャットボット",
    summary: "作業条件から法令本文と公式根拠を確認",
    description:
      "普段の言葉で質問すると、法令本文から結論・条件・公式原文を確認できます。",
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
    summary: "公式CREATE-SIMPLEを利用する前の入力整理支援",
    description:
      "CAS・SDS記載名と作業条件を整理します。ばく露濃度やリスクレベルは本サイトで判定せず、厚生労働省のCREATE-SIMPLEによる公式評価へ案内します。",
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
    summary: "現場条件＋候補の人手確認＋状態付き印刷",
    description:
      "作業場所・設備・人員・変更点等を記録し、候補の人手確認と提出・承認条件を表示するKY用紙です。入力名は電子署名ではなく、未確認版の印刷には下書き状態を表示します。",
    href: "/ky",
    category: "ky",
    tags: ["KY", "現場"],
  },
  {
    slug: "safety-diary",
    title: "安全工程打合せ書",
    summary: "元請が各社の作業・指示を1枚に整理",
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
    slug: "slope-ratio-convert",
    title: "斜面勾配 割⇔角度⇔百分率 換算＋すりつけ長",
    summary: "1:n・角度・百分率を相互換算しすりつけ長も算出",
    description:
      "1:n（割）⇔角度⇔百分率の勾配表記を相互換算し、高低差からのすりつけ長（水平距離）も計算します。掘削勾配チェック計算機の補助ツールで、法定上限勾配の判定は行いません。",
    href: "/construction-calc/slope-ratio-convert",
    category: "construction-calc",
    tags: ["勾配", "換算", "法面"],
  },
  {
    slug: "sling-angle-geometry",
    title: "揚重ワイヤの必要長さ・吊り角度逆算",
    summary: "吊り幅と高さ／ワイヤ長さから吊り角度を逆算",
    description:
      "吊り幅（アイ間距離）と、吊り点までの高さまたはワイヤ1本の長さのどちらかから、吊り角度と必要なワイヤ長さを幾何計算で逆算します。玉掛けワイヤの安全荷重計算機（sling-wire-load）の入力を現場寸法から求める補助ツールです。",
    href: "/construction-calc/sling-angle-geometry",
    category: "construction-calc",
    tags: ["玉掛け", "吊り角度", "揚重"],
  },
  {
    slug: "voltage-drop",
    title: "電圧降下チェック（内線規程）",
    summary: "こう長×電流×断面積で電圧降下率を判定",
    description:
      "こう長・電流・電線サイズから内線規程の簡略式（e=35.6LI/1000A・e=30.8LI/1000A）で電圧降下を計算し、標準電圧に対する許容電圧降下率と比較します。電線許容電流チェック（cable-ampacity）の姉妹版です。",
    href: "/construction-calc/voltage-drop",
    category: "construction-calc",
    tags: ["電気", "電圧降下", "内線規程"],
  },
  {
    slug: "beam-deflection",
    title: "単純梁・片持ち梁のたわみ／曲げ応力概算",
    summary: "単管・H形鋼のたわみと曲げ応力を許容値で判定",
    description:
      "仮設材（単管STK500・H形鋼）の単純梁（等分布荷重）・片持ち梁（先端集中荷重）の最大たわみ・最大曲げ応力を概算し、許容たわみ比・許容応力度で判定します。断面はプリセットまたはI・Z直接入力に対応します。",
    href: "/construction-calc/beam-deflection",
    category: "construction-calc",
    tags: ["たわみ", "曲げ応力", "仮設材"],
  },
  {
    slug: "safety-net-check",
    title: "安全ネット（防網）の基準チェック",
    summary: "告示の式で落下高さ・下部の空きを判定",
    description:
      "墜落防止用の安全ネット（防網）について、告示（墜落による危険を防止するためのネットの構造等の安全基準に関する技術上の指針）の式から落下高さの上限・ネット下部の空きの下限を求め、実際の設置条件が基準に適合するかチェックします。",
    href: "/construction-calc/safety-net-check",
    category: "construction-calc",
    tags: ["安全ネット", "防網", "墜落防止"],
  },
  {
    slug: "scaffold-load-summary",
    title: "足場荷重の集計（自重＋積載→建地1本負担）",
    summary: "1スパン積載を400kg限度と比較、建地1本負担を集計",
    description:
      "足場の自重合計と作業床の積載荷重を入力すると、1スパンあたりの積載荷重（安衛則571条1項4号の400kg限度）と、建地1本あたりの負担荷重の目安を集計します。単管足場チェックと連携。",
    href: "/construction-calc/scaffold-load-summary",
    category: "construction-calc",
    tags: ["足場荷重", "建地", "安衛則"],
  },
  {
    slug: "protective-canopy-check",
    title: "防護棚（朝顔）の設置基準チェック",
    summary: "ふ角・水平距離から設置要否と段数・張出し幅を判定",
    description:
      "建築工事を行う部分の高さと前面道路・隣地までの水平距離から、建設工事公衆災害防止対策要綱（建築工事等編）第28条の防護棚（朝顔）の設置要否・必要段数・突出し幅・角度の基準適合をチェックします。",
    href: "/construction-calc/protective-canopy-check",
    category: "construction-calc",
    tags: ["防護棚", "朝顔", "公衆災害防止"],
  },
  {
    slug: "suspended-scaffold-check",
    title: "吊り足場の基準チェック",
    summary: "ワイヤ・鎖・支点の安全係数と作業床幅を判定",
    description:
      "つりワイヤロープ・つり鎖・つりフック・支点等の破断荷重と実荷重から安全係数（安衛則562条2項：ワイヤ10・鎖/フック5・支点鋼材2.5/木材5）を判定し、作業床の幅・隙間（574条）も併せてチェックします。",
    href: "/construction-calc/suspended-scaffold-check",
    category: "construction-calc",
    tags: ["吊り足場", "つり足場", "安全係数"],
  },
  {
    slug: "ladder-stepladder-check",
    title: "移動はしご・脚立の基準チェック",
    summary: "はしごの幅・脚立の開き角度・昇降設備要否を判定",
    description:
      "移動はしごの幅（安衛則527条）、脚立の開き角度75度以下（528条）への適合と、高さ1.5m超で必要となる昇降設備（526条）の要否をチェックします。",
    href: "/construction-calc/ladder-stepladder-check",
    category: "construction-calc",
    tags: ["はしご", "脚立", "安衛則"],
  },
  {
    slug: "work-platform-opening-check",
    title: "作業床・開口部の基準チェック",
    summary: "作業床の幅・隙間・手すり・開口部の囲いを一括判定",
    description:
      "足場の作業床の幅・隙間、手すり・中桟の高さ、開口部の囲いの設置状況を入力すると、安衛則第563条・第519条・第518条の基準に適合するかを一括チェックします。単管足場チェックと相互リンク。",
    href: "/construction-calc/work-platform-opening-check",
    category: "construction-calc",
    tags: ["作業床", "開口部", "安衛則"],
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
  {
    slug: "rebar-mass",
    title: "鉄筋の質量・本数換算（JIS G 3112）",
    summary: "呼び名（D10〜D51）の単位質量で長さ×本数⇔総質量を相互換算",
    description:
      "JIS G 3112の呼び名（D10〜D51）から公称直径ベースで単位質量を算定し、長さ×本数→総質量、または総質量→本数を相互換算します。径ズレ（呼び名の取り違え）を防ぐため公称直径から都度計算する方式。定尺ロス・継手・フックの割増は含みません。",
    href: "/construction-calc/rebar-mass",
    category: "construction-calc",
    tags: ["鉄筋", "JIS", "質量計算"],
  },
  {
    slug: "concrete-volume",
    title: "生コンクリート数量の概算（打設量・発注量・車両台数）",
    summary: "部材寸法×ロス率で発注量とアジテータ車の概算台数を算定",
    description:
      "部材寸法（縦×横×高さ）または体積の直接入力から打設量を求め、ロス率を加味した発注量と生コン車（アジテータ車）の概算台数を算定します。配合（水セメント比等）はJASS5等の参照表記に留め、数値は生コン工場の配合計画書で確認してください。鉄筋質量換算と相互リンク。",
    href: "/construction-calc/concrete-volume",
    category: "construction-calc",
    tags: ["生コン", "コンクリート数量", "JASS5"],
  },
  {
    slug: "chain-sling-load",
    title: "つりチェーンの安全荷重計算",
    summary: "掛け方・吊り角度・切断荷重から安全係数4/5を判定",
    description:
      "荷の質量・掛け方（1本/2点/3点4点）・吊り角度と、チェーン1本の切断荷重（製造者証明書の値）から、クレーン等安全規則第213条の2の安全係数（原則5以上、伸び0.5%以下かつ径減少10%以下の条件を満たせば4以上）を判定します。玉掛けワイヤの計算機と同じモード係数方式です。",
    href: "/construction-calc/chain-sling-load",
    category: "construction-calc",
    tags: ["つりチェーン", "玉掛け", "クレーン則"],
  },
  {
    slug: "fiber-sling-load",
    title: "繊維スリングの使用荷重判定",
    summary: "ストレート/バスケット/チョークで使用荷重を算定",
    description:
      "ベルトスリングの基本使用荷重（WLL・製品ラベル値）に掛け方（ストレート/バスケット/チョーク）と吊り角度の係数を掛けて使用荷重を求め、荷の質量と比較します。当て物・劣化・不適格品の使用禁止（クレーン則第218条）も明記します。",
    href: "/construction-calc/fiber-sling-load",
    category: "construction-calc",
    tags: ["繊維スリング", "ベルトスリング", "玉掛け"],
  },
  {
    slug: "rigging-hardware-check",
    title: "玉掛用具（シャックル・アイボルト・フック）の使用荷重チェック",
    summary: "WLLと作用荷重を比較。アイボルトの斜め引きは使用不可",
    description:
      "シャックル・アイボルト・フックの使用荷重（WLL・製品カタログ/証明書の値）と作用荷重を比較して使用可否を判定します（クレーン則第214条・第217条）。アイボルトへの斜め引きはメーカー確認が必要な範囲として原則使用不可で扱います。",
    href: "/construction-calc/rigging-hardware-check",
    category: "construction-calc",
    tags: ["シャックル", "アイボルト", "フック"],
  },
  {
    slug: "hoist-rated-check",
    title: "つり上げ装置（巻上ワイヤ・フック）の安全係数チェック",
    summary: "ワイヤ6以上・フック5以上を切断/破断荷重から同時判定",
    description:
      "実荷重に対して、巻上ワイヤの安全係数6以上（クレーン則第213条）・フックの安全係数5以上（同第214条）を同時に満たすかを、切断荷重・破断荷重の入力から判定します。クレーン必要定格総荷重（crane-rated-load）と相互リンクします。",
    href: "/construction-calc/hoist-rated-check",
    category: "construction-calc",
    tags: ["クレーン", "安全係数", "クレーン則"],
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
      "厚労省の死亡災害データ（2019〜2023年）を業種・事故型・起因物分類で検索。出典はデータセット単位で、個別行の逆引きは未整備です。",
    href: "/accident-news",
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
    slug: "visual-ky",
    title: "5分でできる ビジュアルKYT",
    summary: "現場イラストから危険と優先対策を学ぶ15問",
    description:
      "日本の建設・製造・物流現場を想定した合成イラストから危険箇所を探し、事故の理由、対策の優先順位、作業中止条件を5分で学びます。画像なし教材、朝礼用進行、KY用紙連携にも対応します。",
    href: "/training/visual-ky",
    category: "education",
    tags: ["KYT", "危険予知訓練", "安全教育", "朝礼", "KY"],
  },
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
    summary: "一次根拠付き安全資格問題を公開",
    description:
      "第一種・第二種衛生管理者、労働安全・労働衛生コンサルタントの独自問題を、全選択肢の公式根拠付きで提供します。回答・学習時間・長期進捗は保存しません。",
    href: "/e-learning",
    category: "education",
    tags: ["Eラーニング"],
  },
  {
    slug: "hazard-slides",
    title: "災害の型別 安全教育スライド",
    summary: "外部レビュー完了まで公開停止中",
    description:
      "旧スライドは一次資料、対象時点、対策根拠を再確認中です。外部レビュー完了まで教育用途での公開・配布を停止しています。",
    href: "/education/hazard-slides",
    category: "education",
    tags: ["教育", "スライド"],
  },
  {
    slug: "edu-pack",
    title: "法定教育スライドパック（無償）",
    summary: "法定科目との照合をやり直すため公開停止中",
    description:
      "旧教材は法定科目、講師要件、対象時点、外部レビューの再確認中です。検証済みの一般公開教材は現在0件です。",
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
      "ヘッダーの通知センター（ベル）、画面表示中のOS通知、RSS購読を提供します。気象警報メール配信は、重複防止と配信監視の整備中です。",
    href: "/notifications",
    category: "management",
    tags: ["通知", "配信"],
  },
  {
    slug: "stats",
    title: "サイト統計・運営者情報",
    summary: "運営方針と各ページの確認状態を公開",
    description:
      "安全AIポータル編集部が運用する研究プロジェクトとして、利用統計、出典の確認方針、ページごとのレビュー状態と限界を公開しています。",
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
      "事務所モニター・現場用のフルスクリーン表示です。気象情報は取得状態・対象地域・取得時刻を併記し、取得不能時は未確認として表示します。",
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

/**
 * The public feature catalog must never advertise a quarantined destination as
 * an operational tool. The full legacy list remains above for audit history.
 */
export const FEATURES: FeatureItem[] = ALL_FEATURES.filter(
  (feature) =>
    feature.slug !== "construction-calc" &&
    isPublicRouteAvailable(feature.href),
);

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
