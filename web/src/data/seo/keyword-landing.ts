/**
 * SEO-001 keyword landing data
 *
 * Centralised content for the four "guides" landing pages added to address
 * audit finding SEO-001 (主要4キーワード全 top10 圏外) on 2026-05-19.
 *
 * These pages are *information-intent* hubs whose primary job is to rank for
 * the exact 4 keywords and funnel readers into the matching tool page. The
 * pages are written in plain Japanese, cite primary sources (厚労省/JISHA/
 * e-Gov) and keep the individual-research-project framing — they do not
 * make overstated authority claims.
 *
 * Editing rules:
 *   1. Do NOT inline the verbatim text of laws (use citation references).
 *   2. Update `dateModified` whenever you touch the copy meaningfully.
 *   3. Long-tail variants live in `longTail` and feed both H2 and FAQPage.
 */
import { SITE_URL } from "@/lib/seo-metadata";

export type LongTailSeed = {
  /** 主要キーワード周辺のロングテール語句 (FAQ + H2 + 構造化データ keywords に再利用) */
  query: string;
  /** Plain-text answer (FAQPage schema acceptedAnswer) — 200-400字目安 */
  answer: string;
};

export type StepGuide = {
  name: string;
  text: string;
  url?: string;
};

export type SourceRef = {
  label: string;
  url: string;
  note?: string;
};

export type KeywordLanding = {
  /** /guides/<slug> */
  slug: string;
  /** Primary keyword string we want to rank for */
  primaryKeyword: string;
  /** SEO title (<= 60 jp chars) */
  title: string;
  /** Meta description (95-120 jp chars) */
  description: string;
  /** H1 — kept distinct from <title> for keyword variation */
  h1: string;
  /** Lead paragraph (~120 字) above-the-fold */
  lead: string;
  /** Funnel target — the existing tool page */
  toolHref: string;
  /** Funnel CTA label */
  toolCta: string;
  /** Article datePublished — initial publish */
  datePublished: string;
  /** Article dateModified — bump on edits */
  dateModified: string;
  /** Short keywords[] for Article schema + meta keywords */
  keywords: string[];
  /** 4-7 long-tail Q&A — re-used as H2 and FAQPage entries */
  longTail: LongTailSeed[];
  /** HowTo step list — feeds HowTo schema + visible numbered list */
  steps: StepGuide[];
  /** Primary-source citations (一次資料) */
  sources: SourceRef[];
  /** Related internal pages (SEO-D hub & spoke) */
  related: { href: string; label: string; description: string }[];
};

export const KEYWORD_LANDINGS: KeywordLanding[] = [
  {
    slug: "anzeneho-ai-chatbot",
    primaryKeyword: "安衛法 AI チャットボット",
    title: "安衛法AIチャットボットとは｜無料で使える法令質問AI",
    description:
      "安衛法AIチャットボットの仕組み・対応法令・精度評価を解説。労働安全衛生法/安衛則/特化則など50法令以上を一次出典付きで即答する無料ツールの使い方と検索意図別の活用例。",
    h1: "安衛法AIチャットボットとは：無料で使える労働安全衛生法の質問AI",
    lead: "「安衛法AIチャットボット」は、労働安全衛生法・労働安全衛生規則・特定化学物質障害予防規則など50法令以上の条文をRAG検索し、質問に対して根拠条文付きで回答する無料のAIアシスタントです。当ページでは仕組み・対応範囲・精度評価・限界をまとめ、実際に使えるチャット画面へ案内します。",
    toolHref: "/chatbot",
    toolCta: "AIチャットを開いて法令を質問する",
    datePublished: "2026-05-19",
    dateModified: "2026-05-19",
    keywords: [
      "安衛法 AI チャットボット",
      "労働安全衛生法 AI",
      "安衛則 質問",
      "特化則 AI",
      "労働安全 法令 質問",
      "労働災害防止 AI",
    ],
    longTail: [
      {
        query: "安衛法AIチャットボットとは",
        answer:
          "労働安全衛生法（安衛法）・労働安全衛生規則（安衛則）・有機溶剤中毒予防規則・特定化学物質障害予防規則・粉じん障害防止規則・酸素欠乏症等防止規則・じん肺法・石綿障害予防規則など50法令以上を対象に、RAG（検索拡張生成）方式で根拠条文を引きながら回答するAIです。e-Gov公開条文と厚労省通達を一次ソースとし、回答ごとに『この回答は安衛則第○条に基づく』の出典表示を行います。一般的な汎用ChatGPTと異なり、出典が法令本文に紐づくため『どの条文を根拠に答えているか』を読者が検証できます。",
      },
      {
        query: "安衛法AIチャットボットは無料で使える？",
        answer:
          "はい。安全AIポータルの安衛法AIチャットボットは個人運営の研究プロジェクトとして無料公開しています。アカウント登録不要・回数制限なしで利用できます。ただし将来的にAPI利用量が著しく増えた場合は、回数制限や有料プランの導入を検討する旨を/pricingで開示しています。",
      },
      {
        query: "安衛法AIチャットボットの対応法令は？",
        answer:
          "労働安全衛生法、労働安全衛生法施行令、労働安全衛生規則、特定化学物質障害予防規則、有機溶剤中毒予防規則、鉛中毒予防規則、四アルキル鉛中毒予防規則、粉じん障害防止規則、酸素欠乏症等防止規則、電離放射線障害防止規則、高気圧作業安全衛生規則、事務所衛生基準規則、じん肺法、じん肺法施行規則、石綿障害予防規則、ボイラー及び圧力容器安全規則、クレーン等安全規則、ゴンドラ安全規則、機械等貸与者等の講ずべき措置、機械等検定規則、化学物質取扱事業者向け関連通達など50法令以上を収録しています。最新の収録法令一覧は/about/data-sourcesに公開しています。",
      },
      {
        query: "安衛法AIチャットボットの精度・Recall@5は？",
        answer:
          "ベンチマーク用50問の評価セットでRecall@5（上位5件の検索結果に正解条文が含まれる割合）60%超を目標値として運用しています。最新の評価結果と方法論は/about/chatbot-evalで公開しており、誤答パターン・改善計画もコミット履歴で追跡可能です。AI回答は最終判断ではなく、必ず根拠条文の原文と監督署・専門家のご確認を併用してください。",
      },
      {
        query: "安衛法AIチャットボットと一般的なChatGPTとの違いは？",
        answer:
          "一般的なChatGPT/Geminiは学習時点までの一般知識から推測回答するため、安衛法のような専門領域では『古い条番号』『廃止済み通達』『存在しない条文』を出力するハルシネーション事故が報告されています。本ツールは（a）e-Govから取得した最新条文をベクトル検索する設計、（b）回答に根拠条文の引用を必須化、（c）見つからない場合は『該当条文を発見できませんでした』と明示する設計、により法令専門領域でのハルシネーションを抑制しています。",
      },
      {
        query: "安衛法AIチャットボットでよくある質問例",
        answer:
          "実際に多い質問例として、（1）『フルハーネス特別教育の科目と時間は？』→安衛則第36条41号関連、（2）『化学物質RAは誰が実施するのか』→安衛法第57条の3、（3）『熱中症のWBGT管理基準』→安衛則第612条の2、（4）『産業医の選任義務はどこから？』→安衛法第13条、（5）『安全衛生委員会の議題と頻度』→安衛則第23条、などが挙げられます。回答は出典条文へのリンク付きで返ります。",
      },
      {
        query: "安衛法AIチャットボットの限界・使ってはいけないケースは？",
        answer:
          "AIチャットボットは（1）監督署からの個別行政指導への回答、（2）労災請求や訴訟戦略の助言、（3）資格試験での回答そのものの代用、（4）国家試験の模範解答の代用、には使用しないでください。法令条文の理解の補助、社内教育資料の下書き、安全衛生委員会の論点整理、KY/RAの導入時の質問対応、特別教育や講習会の事前学習、などの用途で活用してください。",
      },
    ],
    steps: [
      {
        name: "チャット画面を開く",
        text: "右上のメニューもしくは下記の『AIチャットを開く』ボタンから/chatbotに移動します。ログイン・アカウント登録は不要です。",
        url: "/chatbot",
      },
      {
        name: "質問を日本語で入力",
        text: "『フルハーネス特別教育 何時間？』『化学物質RA 義務化 いつから』のように、口語で構いません。条文番号がわからなくてもAIが該当条文を検索します。",
      },
      {
        name: "回答の根拠条文を確認",
        text: "AIの回答に表示される根拠条文（例：安衛則第36条41号）リンクをクリックし、e-Gov原文で文言を必ず確認します。AI回答そのままを社内資料に転載しないでください。",
      },
      {
        name: "関連機能で深掘りする",
        text: "/lawsで条文一覧を見る、/circularsで通達・告示を確認する、/strategy/plan-generatorで年次計画書に落とし込む、など他の機能と組み合わせて運用します。",
      },
    ],
    sources: [
      {
        label: "e-Gov 法令検索｜労働安全衛生法",
        url: "https://laws.e-gov.go.jp/law/347AC0000000057",
        note: "条文の一次出典",
      },
      {
        label: "厚生労働省｜職場のあんぜんサイト",
        url: "https://anzeninfo.mhlw.go.jp/",
        note: "事故事例・統計の一次出典",
      },
      {
        label: "中央労働災害防止協会（JISHA）",
        url: "https://www.jisha.or.jp/",
        note: "RST・特別教育・OSHMS資料",
      },
    ],
    related: [
      {
        href: "/laws",
        label: "労働安全衛生法 条文一覧",
        description: "条文番号・章節からも検索できる安衛法・関連法令の一覧",
      },
      {
        href: "/circulars",
        label: "厚労省 通達・告示一覧",
        description: "発出年・発番でフィルタできる通達・告示のインデックス",
      },
      {
        href: "/law-search",
        label: "全文検索（条文・通達）",
        description: "キーワード横断検索 — 質問が複数条文にまたがるときの起点",
      },
      {
        href: "/about/chatbot-eval",
        label: "AIチャット精度評価レポート",
        description: "Recall@5・回答正確性の評価方法と直近の結果",
      },
      {
        href: "/guides/annual-safety-plan-generator",
        label: "ガイド：年次安全衛生計画 業種別 ジェネレーター",
        description: "AIチャットの回答を年次計画書に落とし込むときの導線解説",
      },
      {
        href: "/guides/chemical-ra-create-simple",
        label: "ガイド：化学物質RA（CREATE-SIMPLE 無料）",
        description: "化学物質関連の質問はチャットと併用してRAツールへ",
      },
    ],
  },
  {
    slug: "industry-accident-reports",
    primaryKeyword: "労働災害 業種別 分析 レポート",
    title: "労働災害 業種別 分析レポートとは｜5業種5,000件のデータ解説",
    description:
      "建設・製造・運輸・医療福祉・サービスの5業種について、5,000件超の労働災害事例を業種別に自動分析。事故型ランキング・原因・推奨対策・関連法令を含む無料の業種別レポートの読み方と活用法を解説。",
    h1: "労働災害 業種別 分析レポート：5業種5,000件超のデータと読み方",
    lead: "「労働災害 業種別 分析レポート」は、厚生労働省『職場のあんぜんサイト』死亡災害DB・労働者死傷病報告オープンデータと当サイトcurated事例を統合した5,000件超の労働災害について、5業種に分けて事故型・起因物・原因・推奨対策を自動集計したレポート群です。当ページでは業種別の読み方、JISHA/厚労省レポートとの併用方法、コンサル現場での活用例を解説します。",
    toolHref: "/accidents-reports",
    toolCta: "業種別レポートを開く",
    datePublished: "2026-05-19",
    dateModified: "2026-05-19",
    keywords: [
      "労働災害 業種別 分析 レポート",
      "業種別 労働災害 統計",
      "建設業 労働災害 分析",
      "製造業 死亡災害",
      "労働災害 原因 業種別",
      "業種別 事故傾向",
    ],
    longTail: [
      {
        query: "労働災害 業種別 分析レポートとは",
        answer:
          "労働災害を業種ごとに分け、事故型（墜落・転落、はさまれ・巻き込まれ等）・起因物・原因・推奨対策・関連法令まで一覧化したレポートです。厚労省『職場のあんぜんサイト』の死亡災害DB（公式の死亡災害一覧）と労働者死傷病報告のオープンデータ、JISHA公開資料を統合し、自サイトでは建設・製造・運輸・医療福祉・サービスの5業種に分割した自動分析を提供しています。安全衛生委員会の年次振り返り、業種別KY/RAの根拠資料、コンサル提案書の引用元として活用できます。",
      },
      {
        query: "建設業の労働災害 分析レポートで何がわかる？",
        answer:
          "建設業の業種別レポートでは、（1）墜落・転落の発生件数と工事種別ごとの差分、（2）はさまれ・巻き込まれの起因機械、（3）熱中症・酸欠の発生月別ピーク、（4）足場・型枠・解体など作業別事故型、（5）下請次数別の発生比率、（6）安衛則と建災防ガイドラインの該当条項、を確認できます。元請の安全衛生管理計画策定、職長教育のテーマ選定、特別教育の優先度判断に使えます。",
      },
      {
        query: "製造業の労働災害 分析レポート — はさまれ・巻き込まれが多い理由",
        answer:
          "製造業ではプレス機械・コンベヤ・ロボット・工作機械の停止前清掃や非定常作業中のはさまれ・巻き込まれが最多事故型として継続しています。当サイトの製造業レポートではこれら起因機械別件数、安衛則第107条（掃除等の場合の運転停止）、第151条の145（産業用ロボット）、第131条以下のプレス機械関連、リスクアセスメント実施率との相関を確認できます。",
      },
      {
        query: "運輸業 労働災害 分析 — トラック墜落・荷役事故",
        answer:
          "運輸業ではトラック荷台からの墜落、荷役作業中のはさまれ、フォークリフト事故が継続的に上位を占めます。当サイトの運輸業レポートでは、陸上貨物運送事業労働災害防止規程、安衛則第151条の70以下（荷役運搬機械）、墜落制止用器具規則の改正（2022年1月）の現場運用状況、年齢層別の発生件数、を確認できます。",
      },
      {
        query: "医療福祉の労働災害 分析 — 腰痛・転倒の業種特性",
        answer:
          "医療福祉では介護現場の腰痛（人力介助）、施設内の転倒、注射針刺し・血液曝露が主要事故型です。当サイトの医療福祉レポートでは『職場における腰痛予防対策指針』（厚労省）、転倒予防のチェック項目、針刺し事故報告手順、感染症対策ガイドラインの該当箇所と連動した分析を提供します。",
      },
      {
        query: "サービス業 労働災害 分析 — 小売・飲食の事故傾向",
        answer:
          "サービス業（小売・飲食・宿泊・対人サービス）では転倒、無理な動作、切れ・こすれ、交通事故が上位事故型として継続しています。当サイトのサービス業レポートでは厚生労働省『STOP！転倒災害プロジェクト』ガイドラインに沿った原因分類、年齢層別件数、業態別パターンを集計しています。",
      },
      {
        query: "業種別レポートのデータソース・更新頻度",
        answer:
          "データソースは（1）厚生労働省『職場のあんぜんサイト』死亡災害DB、（2）労働者死傷病報告オープンデータ、（3）公開された事故事例から匿名化・再構成したcurated事例、（4）JISHA・建災防など公的団体の公開資料、です。集計は日次自動更新で、最新の確定値が厚労省から公開され次第、速報集計値（『想定例』ラベル付き）を順次差し替えています。",
      },
      {
        query: "JISHA・厚労省の労働災害レポートとの違いは？",
        answer:
          "JISHA・厚労省レポートはPDFの全国集計が中心で、（a）業種比較が手作業、（b）月次更新が反映されない、（c）リンク先の条文が固定されていない、という運用上の課題があります。当サイトの業種別レポートはWebネイティブのため、業種横断比較ビュー（/accidents-reports/compare）、関連条文の自動リンク、事故事例の個票への遷移、を実現しています。コンサル現場では公的レポートを一次資料として併用しつつ、当サイトを比較・要約レイヤーとして使う運用が想定されます。",
      },
    ],
    steps: [
      {
        name: "業種別レポート一覧を開く",
        text: "/accidents-reportsから5業種のカードを表示し、目的の業種を選びます。各カードに事例数・死亡件数・最多事故型のサマリが表示されます。",
        url: "/accidents-reports",
      },
      {
        name: "業種詳細レポートを確認",
        text: "業種カードをクリックし、事故型ランキング・原因 Top10・業種特有パターン・推奨対策・関連法令を確認します。各事例には個別個票へのリンクが付いています。",
      },
      {
        name: "業種を横断比較",
        text: "/accidents-reports/compareで2〜5業種を選び、死亡率・主要事故型・原因・推奨対策を並列表示します。コンサル提案書のベンチマーク用途に最適です。",
        url: "/accidents-reports/compare",
      },
      {
        name: "年次計画書に反映",
        text: "/strategy/plan-generatorで業種を選び、レポートで見つけた業種特有事故型を重点目標・実施事項に組み込んだ年次安全衛生計画書を生成します。",
        url: "/strategy/plan-generator",
      },
    ],
    sources: [
      {
        label: "厚生労働省｜職場のあんぜんサイト 死亡災害データベース",
        url: "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.aspx",
        note: "死亡災害一覧の一次出典",
      },
      {
        label: "厚生労働省｜労働災害発生状況",
        url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/anzeneisei11/index.html",
        note: "年次統計・四半期報",
      },
      {
        label: "中央労働災害防止協会｜統計資料",
        url: "https://www.jisha.or.jp/research/statistics/",
        note: "業種別資料",
      },
      {
        label: "建設業労働災害防止協会｜統計・調査",
        url: "https://www.kensaibou.or.jp/",
        note: "建設業特有データ",
      },
    ],
    related: [
      {
        href: "/accidents-reports",
        label: "業種別レポート（5業種）",
        description: "業種ごとに事故型・原因・対策を集計したメインのレポート",
      },
      {
        href: "/accidents-reports/compare",
        label: "業種横断比較ビュー",
        description: "2〜5業種を並べて事故傾向を比較するベンチマーク用途",
      },
      {
        href: "/accidents",
        label: "事故データベース（全件）",
        description: "業種横断の生データ・個票・絞り込み検索",
      },
      {
        href: "/accidents-analytics",
        label: "事故統計ダッシュボード（25軸）",
        description: "年次推移・年代別・業種別など25軸で可視化",
      },
      {
        href: "/guides/annual-safety-plan-generator",
        label: "ガイド：年次安全衛生計画 業種別 ジェネレーター",
        description: "業種別事故傾向を年次計画の重点目標に反映する流れ",
      },
      {
        href: "/guides/anzeneho-ai-chatbot",
        label: "ガイド：安衛法AIチャットボット",
        description: "業種別事故の根拠条文・関連法令はAIチャットで補完",
      },
    ],
  },
  {
    slug: "annual-safety-plan-generator",
    primaryKeyword: "年次安全衛生計画 業種別 ジェネレーター",
    title: "年次安全衛生計画ジェネレーター（業種別13種）｜無料・PDF出力",
    description:
      "建設業・製造業・運輸業・医療福祉ほか13業種×規模3段階の39テンプレートから年次安全衛生計画書を無料で自動生成。基本方針・重点目標・実施事項・月別スケジュール・関連法令まで網羅。PDF出力可。",
    h1: "年次安全衛生計画ジェネレーター（業種別）：無料で使える計画書テンプレート",
    lead: "「年次安全衛生計画ジェネレーター」は、業種13種×規模3段階の39テンプレートから、基本方針・重点目標・実施事項・月別スケジュール・関連法令を含む年次安全衛生計画書を自動生成する無料ツールです。安衛法第10条・第12条・第18条で求められる安全衛生管理体制の年次計画運用を支援します。当ページでは作成手順・各項目の意味・カスタマイズの考え方を解説します。",
    toolHref: "/strategy/plan-generator",
    toolCta: "年次計画ジェネレーターを開く",
    datePublished: "2026-05-19",
    dateModified: "2026-05-19",
    keywords: [
      "年次安全衛生計画 業種別 ジェネレーター",
      "年次安全衛生計画 雛形 無料",
      "安全衛生計画書 業種別 PDF",
      "年度安全衛生計画 テンプレート",
      "安全衛生計画 月別スケジュール",
      "安全衛生計画 重点目標",
    ],
    longTail: [
      {
        query: "年次安全衛生計画ジェネレーターとは",
        answer:
          "業種と規模を選ぶだけで、基本方針・重点目標・実施事項・月別スケジュール・関連法令を含む『年次安全衛生計画書』の雛形を自動生成する無料ツールです。安衛法第10条（総括安全衛生管理者）・第12条（衛生管理者）・第18条（衛生委員会）の体制を前提に、年度計画として運用される文書を業種特有の事故傾向と全国安全週間（7月）・全国労働衛生週間（10月）等のイベントに合わせて構築します。",
      },
      {
        query: "対応する業種は13種類 — 具体的に何が選べる？",
        answer:
          "建設業、製造業、運輸業（陸上貨物・倉庫含む）、医療福祉、サービス業、小売業、飲食業、卸売業、倉庫業、事務系オフィス、農業、林業、漁業の13業種に対応しています。それぞれの業種で代表的な事故型（建設業=墜落・転落、製造業=はさまれ・巻き込まれ、運輸業=荷役・道路、医療福祉=腰痛・転倒、サービス業=転倒・対人、農林漁業=機械・自然災害・水中作業）に対応した重点目標と実施事項が雛形に組み込まれています。",
      },
      {
        query: "規模3段階とは — 何が変わる？",
        answer:
          "小規模（50人未満）・中規模（50-299人）・大規模（300人以上）の3段階を選択できます。規模により、安衛法上の選任義務（産業医・衛生管理者・統括安全衛生責任者など）と、衛生委員会の設置義務（50人以上）の有無が雛形に反映されます。小規模事業場では『健康診断結果に基づく医師等からの意見聴取の運用』のような中小事業場向けの実施事項が優先表示されます。",
      },
      {
        query: "PDF出力は可能？",
        answer:
          "はい。ブラウザの印刷ダイアログから直接PDF出力できます。Word/Excel様式が必要な場合は、生成後の文章を選択してWord/Excelに貼り付けることで再編集可能です。生成された雛形は安全衛生委員会で審議のうえ、自社の作業実態・前年度の災害発生状況・健診結果に応じて修正することを想定しています。",
      },
      {
        query: "月別スケジュールにはどんなイベントが入る？",
        answer:
          "全国安全週間（7月1日〜7日／準備期間6月）、全国労働衛生週間（10月1日〜7日／準備期間9月）、防災の日（9月1日）、年末年始無災害運動（12〜1月）、健康診断（春・秋）、ストレスチェック（年1回）、定期巡視、安全衛生委員会（毎月）、教育訓練（特別教育・職長教育の頻度）、各種点検（消防設備・避難訓練・電気設備）など年間イベントが業種に応じて配置されます。",
      },
      {
        query: "重点目標はどう決める？",
        answer:
          "業種別の主要事故型に基づき、（1）墜落・転落ゼロ（建設業）、（2）はさまれ・巻き込まれゼロ（製造業）、（3）荷役・交通災害削減（運輸業）、（4）腰痛・転倒予防（医療福祉）、（5）転倒予防（サービス業）などの定量目標を雛形に組み込みます。前年度の自社災害発生状況・健診結果・ヒヤリハット報告と照らし合わせ、具体数値（前年比50%削減など）にカスタマイズします。",
      },
      {
        query: "関連法令の自動掲載は何条文？",
        answer:
          "安衛法本則の安全衛生管理体制（第10〜25条）、安衛則の安全衛生委員会（第21〜23条）、健康診断（第43〜52条）、特別教育（第36条）、化学物質RA（安衛法第57条の3）、リスクアセスメント実施（安衛則第24条の11関連）、業種別では建設業の元方事業者責任（第15条以下）、製造業の機械等関連（安衛則第101条以下）など、業種・規模に応じて該当条文を雛形末尾に自動掲載します。",
      },
      {
        query: "他の安全衛生計画書テンプレートとの違い",
        answer:
          "公的団体（JISHA等）が配布するWord/PDFテンプレートは（a）業種共通、（b）規模区分なし、（c）法改正反映が手作業、という運用上の課題があります。本ジェネレーターは（a）業種×規模の39パターン、（b）月別スケジュール自動配置、（c）安衛則・特化則の関連条文自動掲載、（d）全国安全週間等の年次イベント自動反映、により雛形の質と運用効率を高めています。",
      },
    ],
    steps: [
      {
        name: "業種と規模を選択",
        text: "/strategy/plan-generatorで業種（13種）と規模（小・中・大）を選びます。39の組み合わせから自社に近いテンプレートが選ばれます。",
        url: "/strategy/plan-generator",
      },
      {
        name: "雛形を生成・確認",
        text: "基本方針・重点目標・実施事項・月別スケジュール・関連法令の各セクションが表示されます。前年度の自社状況（災害件数・健診結果・ヒヤリハット）と照らし合わせ、必要な修正点を洗い出します。",
      },
      {
        name: "安全衛生委員会で審議",
        text: "雛形を安全衛生委員会（衛生委員会）で審議し、自社固有の重点目標・数値目標を設定します。委員会議事録に審議結果を残します。",
      },
      {
        name: "PDF出力・社内配布",
        text: "ブラウザの印刷ダイアログからPDF出力し、各事業場・各課に配布します。月別スケジュールは安全衛生掲示板にも掲示します。",
      },
      {
        name: "月次でPDCAを回す",
        text: "毎月の安全衛生委員会で実施事項の進捗を確認し、未達項目は原因分析・対策見直しを行います。年度末に総括し、翌年度のジェネレーター実行に反映します。",
      },
    ],
    sources: [
      {
        label: "e-Gov 法令検索｜労働安全衛生法 第10〜25条",
        url: "https://laws.e-gov.go.jp/law/347AC0000000057",
        note: "安全衛生管理体制",
      },
      {
        label: "e-Gov 法令検索｜労働安全衛生規則 第21〜23条",
        url: "https://laws.e-gov.go.jp/law/347M50002000032",
        note: "安全衛生委員会",
      },
      {
        label: "厚生労働省｜全国安全週間",
        url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/sangyouanzen/index.html",
        note: "毎年7月の年次イベント",
      },
      {
        label: "厚生労働省｜全国労働衛生週間",
        url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/anzeneisei12/index.html",
        note: "毎年10月の年次イベント",
      },
    ],
    related: [
      {
        href: "/strategy/plan-generator",
        label: "年次計画ジェネレーター（ツール）",
        description: "業種13種×規模3段階の39テンプレートを実行",
      },
      {
        href: "/laws",
        label: "労働安全衛生法 条文一覧",
        description: "安全衛生管理体制（第10〜25条）の根拠条文",
      },
      {
        href: "/circulars",
        label: "厚労省 通達・告示一覧",
        description: "全国安全週間・全国労働衛生週間の通達原文",
      },
      {
        href: "/guides/anzeneho-ai-chatbot",
        label: "ガイド：安衛法AIチャットボット",
        description: "計画書の条文・実施事項の根拠質問はAIチャットへ",
      },
      {
        href: "/guides/industry-accident-reports",
        label: "ガイド：業種別 労働災害分析レポート",
        description: "業種別の事故傾向を計画書の重点目標に反映する流れ",
      },
      {
        href: "/guides/chemical-ra-create-simple",
        label: "ガイド：化学物質RA（CREATE-SIMPLE 無料）",
        description: "化学物質RAを年次計画の実施事項に組み込む流れ",
      },
    ],
  },
  {
    slug: "chemical-ra-create-simple",
    primaryKeyword: "化学物質 リスクアセスメント CREATE-SIMPLE 無料",
    title: "化学物質リスクアセスメント無料ツール｜CREATE-SIMPLE準拠",
    description:
      "化学物質RAをCREATE-SIMPLE準拠で無料実施。物質名・GHS分類・取扱量・換気状況から ばく露・健康障害リスクを簡易評価。安衛法第57条の3に基づく義務化（2024-2026年改正）対応の解説と無料ツールへの導線。",
    h1: "化学物質リスクアセスメント 無料ツール（CREATE-SIMPLE準拠）",
    lead: "「化学物質 リスクアセスメント（CREATE-SIMPLE 無料）」は、安衛法第57条の3に基づき2024年から段階的に義務化された化学物質リスクアセスメント（化学物質RA）を、厚生労働省CREATE-SIMPLE方式に準拠して無料で実施するための解説ページです。物質名・GHS分類・取扱量・換気状況からばく露と健康障害のリスクを簡易評価し、必要な保護具・改善対策を提示するツールへ案内します。",
    toolHref: "/chemical-ra",
    toolCta: "化学物質RAツールを開く",
    datePublished: "2026-05-19",
    dateModified: "2026-05-19",
    keywords: [
      "化学物質 リスクアセスメント CREATE-SIMPLE 無料",
      "CREATE-SIMPLE 使い方",
      "化学物質RA 義務化",
      "安衛法 第57条の3",
      "化学物質管理 自律的管理",
      "化学物質 ばく露 リスク評価",
    ],
    longTail: [
      {
        query: "化学物質リスクアセスメントとは — CREATE-SIMPLEとの関係",
        answer:
          "化学物質リスクアセスメント（化学物質RA）は、労働安全衛生法第57条の3に基づき、危険性・有害性のある化学物質を取り扱う事業者が、ばく露と健康障害のリスクを評価し低減措置を講じる仕組みです。CREATE-SIMPLEは厚生労働省が無償提供する簡易評価ツールで、物質のGHS分類・取扱量・換気状況・作業時間から、ばく露濃度の推定とリスク区分（I〜IV）を自動算定します。当サイトのツールはCREATE-SIMPLE準拠の入力項目と判定ロジックで、ブラウザ完結の無料簡易評価を提供します。",
      },
      {
        query: "化学物質RAは2024年から義務？対象は？",
        answer:
          "安衛法第57条の3に基づくリスクアセスメントは、（1）安衛法施行令別表第3・別表第9の危険有害物質（674物質＋追加分）について実施義務、（2）2024年4月から2026年4月にかけて段階的に対象物質が拡大、（3）労働災害防止上必要な事業場では全化学物質が対象、と整理されます。詳細は当サイトの化学物質RAページで最新の対象物質リスト（厚労省データ統合8,400物質超）を確認できます。",
      },
      {
        query: "CREATE-SIMPLE の入力項目は？ — 無料で使える？",
        answer:
          "CREATE-SIMPLEの主要入力項目は、（1）化学物質名（CAS番号も可）、（2）GHS分類（健康有害性・物理的危険性）、（3）取扱量（kg/日 または L/日）、（4）含有率、（5）取扱状況（換気・作業時間・呼吸用保護具の有無）です。厚生労働省版CREATE-SIMPLEはExcelマクロベースで無料公開されており、当サイトのツールはCREATE-SIMPLEのロジックをWebに移植してブラウザ完結で無料利用できる形にしています。",
      },
      {
        query: "リスク区分 I〜IV の意味は？",
        answer:
          "CREATE-SIMPLE のリスク区分は、（I）リスクは小さい — 現状の管理を継続、（II）リスクあり — 改善が望ましい、（III）リスク大 — 早急な改善が必要、（IV）リスク極大 — 直ちに代替化または工程変更を検討、の4段階です。区分IIIは局所排気装置の改善・呼吸用保護具の改善・作業時間短縮、区分IVは代替化検討・取扱中止・工学的対策（密閉化等）が推奨されます。",
      },
      {
        query: "化学物質RAで必要な保護具はどう決まる？",
        answer:
          "リスク区分とGHS分類（皮膚刺激・呼吸器感作・発がん性等）から、（1）呼吸用保護具（防じんマスク・防毒マスク・電動ファン付き呼吸用保護具RPE）、（2）化学防護手袋（材質はJIS T 8116）、（3）化学防護衣、（4）保護メガネ・顔面シールド、を必要に応じ選定します。当サイトの/equipment-finderでは物質・作業内容から推奨保護具をAIで提案します。",
      },
      {
        query: "化学物質RAは誰が実施する？ — 化学物質管理者の要件",
        answer:
          "安衛法上、化学物質RAの実施責任は事業者にあります。2024年4月から、リスクアセスメント対象物質を製造・取り扱う事業場では『化学物質管理者』の選任が義務化されました（安衛則第12条の5）。化学物質管理者は専門的講習修了が原則（リスクアセスメント対象物質を製造する事業場の場合）です。当サイトの/education/hoteikyoiku/chemical-raで講習対応教育プログラムを公開しています。",
      },
      {
        query: "SDS（安全データシート）はどこで入手する？",
        answer:
          "SDSは化学物質の譲渡・提供元（メーカー・販売店）から無償で受領できます。安衛法第57条の2でSDS交付が義務化されています。SDSは（1）化学物質の名称、（2）GHS分類・絵表示、（3）応急措置、（4）取扱・保管方法、（5）暴露防止・保護措置、（6）廃棄上の注意、の16項目を含みます。手元にない場合は譲渡元へ請求し、入手後は化学物質RAの入力に使用します。",
      },
      {
        query: "化学物質RA の記録保存は何年？",
        answer:
          "リスクアセスメントの結果（対象物質、作業内容、リスク区分、低減措置、実施日）は事業場で記録・保存し、労働者へ周知する義務があります（安衛則第34条の2の7・第34条の2の8）。記録の保存期間は法令上『次回のリスクアセスメント実施まで』ですが、実務上は3年以上の保存と労働基準監督署の臨検対応のため、安全衛生委員会議事録とセットで保管することを推奨します。",
      },
    ],
    steps: [
      {
        name: "化学物質RAツールを開く",
        text: "/chemical-raで化学物質名（またはCAS番号）を入力します。8,400物質超の厚労省統合DBから候補が表示されます。",
        url: "/chemical-ra",
      },
      {
        name: "GHS分類を確認",
        text: "選択した物質のGHS分類（健康有害性カテゴリ）が自動表示されます。手元のSDSと突合して確認します。",
      },
      {
        name: "取扱条件を入力",
        text: "取扱量（kg/日 または L/日）、含有率、換気状況（屋外・全体換気・局所排気・密閉）、作業時間、呼吸用保護具の有無を入力します。",
      },
      {
        name: "リスク区分の判定",
        text: "CREATE-SIMPLE準拠ロジックでリスク区分（I〜IV）が表示されます。区分II以上は具体的な改善対策（局所排気の改善、保護具のグレードアップ、代替化検討）が推奨表示されます。",
      },
      {
        name: "保護具を確定・記録",
        text: "/equipment-finderで物質・作業内容から推奨保護具をAIで提案します。判定結果は安全衛生委員会で審議し、議事録・RA記録として保存します。",
        url: "/equipment-finder",
      },
    ],
    sources: [
      {
        label: "厚生労働省｜化学物質による労働災害防止のための新たな規制について",
        url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/kagakubussitu/index.html",
        note: "2024年4月化学物質管理改正の一次出典",
      },
      {
        label: "職場のあんぜんサイト｜化学物質リスクアセスメント実施支援システム（CREATE-SIMPLE）",
        url: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/ankgc07_1.htm",
        note: "厚労省公式 CREATE-SIMPLE ダウンロード",
      },
      {
        label: "e-Gov 法令検索｜労働安全衛生法 第57条の3",
        url: "https://laws.e-gov.go.jp/law/347AC0000000057",
        note: "化学物質RA義務の根拠条文",
      },
      {
        label: "e-Gov 法令検索｜労働安全衛生規則 第34条の2の7・第12条の5",
        url: "https://laws.e-gov.go.jp/law/347M50002000032",
        note: "RA記録・化学物質管理者の根拠",
      },
    ],
    related: [
      {
        href: "/chemical-ra",
        label: "化学物質RAツール（CREATE-SIMPLE準拠）",
        description: "ブラウザ完結で物質名から保護具・対策まで",
      },
      {
        href: "/chemical-database",
        label: "化学物質検索（8,400物質）",
        description: "CAS番号・物質名から濃度基準・GHS分類を確認",
      },
      {
        href: "/chemical-ra/product-search",
        label: "製品名 → 成分検索",
        description: "塗料・洗剤・接着剤の製品名から含有化学物質を遡及",
      },
      {
        href: "/equipment-finder",
        label: "保護具AIファインダー",
        description: "物質と作業内容から手袋・マスクをAIで提案",
      },
      {
        href: "/education/hoteikyoiku/chemical-ra",
        label: "化学物質RA実務教育",
        description: "化学物質管理者選任・自律管理対応の教育プログラム",
      },
      {
        href: "/guides/anzeneho-ai-chatbot",
        label: "ガイド：安衛法AIチャットボット",
        description: "化学物質関連の条文質問（第57条の3 ほか）はAIチャットへ",
      },
      {
        href: "/guides/annual-safety-plan-generator",
        label: "ガイド：年次安全衛生計画 業種別 ジェネレーター",
        description: "化学物質RAを年次計画の実施事項に組み込む流れ",
      },
    ],
  },
];

export function getKeywordLandingBySlug(slug: string): KeywordLanding | undefined {
  return KEYWORD_LANDINGS.find((k) => k.slug === slug);
}

export function keywordLandingUrl(slug: string): string {
  return `${SITE_URL}/guides/${slug}`;
}
