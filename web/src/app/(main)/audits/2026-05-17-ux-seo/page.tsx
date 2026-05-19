import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "第三者目線 UX+SEO 激辛監査レポート 2026-05-17",
  description:
    "安全AIポータル(www.anzen-ai-portal.jp)を第三者目線で激辛レビューしたUX/SEO特化監査レポート。PR #187 以降の84 PR 連投で生じた歪み・回帰・新規問題の通し番号付き課題リスト。社内採用/不採用判断用。",
  robots: { index: false, follow: true, nocache: true },
  alternates: { canonical: null as unknown as string },
};

const META = {
  auditId: "harsh-third-party-ux-seo-2026-05-17",
  auditDate: "2026-05-17",
  baseMainSha: "41b77a7",
  scope: "UX (8軸) + SEO (8軸) 専門特化、PR #187 49件と非重複",
  reviewedPages: 45,
  viewports: ["375x667", "414x896", "768x1024", "1920x1080"],
  keywords: [
    "安衛法 AI チャットボット",
    "労働災害 業種別 分析 レポート",
    "年次安全衛生計画 業種 ジェネレーター",
    "化学物質 リスクアセスメント CREATE-SIMPLE 無料",
  ],
  excludedFromPrior: 49,
  newFindings: 56,
};

type Priority = "P0" | "P1" | "P2" | "P3";
type Status = "TBD" | "out-of-scope" | "resolved";

type Finding = {
  id: string;
  category: string; // UX-A 〜 UX-H, SEO-A 〜 SEO-H
  title: string;
  priority: Priority;
  effortHours: number;
  url?: string;
  evidence: string;
  recommendation: string;
  status: Status;
  /** PR number that resolved this finding; surfaces in data-status as "resolved-pr-<n>" for downstream tooling */
  resolvedPr?: number;
};

// =====================================================================
// UX カテゴリ
// =====================================================================

const FINDINGS_UX_A: Finding[] = [
  {
    id: "UX-001",
    category: "UX-A",
    title:
      "メイン3機能 (chatbot / accidents-reports / strategy/plan-generator) がトップ CTA・ヒーロー外、戦略との乖離",
    priority: "P1",
    effortHours: 4,
    url: "/",
    evidence:
      "web/src/components/new-home-hero.tsx のCTAは /chatbot と /ky の2件のみ。 /accidents-reports と /strategy/plan-generator はヒーロー直下動線に出てこず、HomeThreePillars 内の事故DBカードも /accidents (10年統合DB) に遷移、業種別レポート /accidents-reports へは到達しない。docs/homepage の『メイン3項目化』方針 (commit d81ac80) と実装の乖離。",
    recommendation:
      "(a) ヒーローCTAを3項目に拡張 (安衛法AIチャット / 業種別 事故分析レポート / 年次安全衛生計画)。 (b) HomeThreePillars 事故カードの遷移先を /accidents-reports にして実利用主導の動線にする。 (c) 既存の /accidents へは『10年事故DB一覧へ』というセカンダリリンクに格下げ。",
    status: "resolved",
    resolvedPr: 241,
  },
  {
    id: "UX-002",
    category: "UX-A",
    title: "モバイルボトムナビ5項目がメイン3機能と非整合 (/accidents-reports と /strategy/plan-generator が無い)",
    priority: "P1",
    effortHours: 2,
    url: "/ (mobile <480px)",
    evidence:
      "web/src/components/MobileBottomNav.tsx の ITEMS は home/ky/law-search/chatbot/account。メイン3機能のうち 2/3 (accidents-reports, strategy/plan-generator) が固定ナビから抜けている。モバイルユーザーは縦スクロール後にこれら主要機能へ辿り着く動線がない。",
    recommendation:
      "ITEMS を [home, chatbot, accidents-reports, strategy/plan-generator, account] の5項目構成にリプレイス。検索とKYは2タップ以内 (ホーム+1) で到達できるよう、ホーム最上部に専用ショートカットを配置。",
    status: "resolved",
    resolvedPr: 241,
  },
  {
    id: "UX-003",
    category: "UX-A",
    title: "ナビゲーション3層構造の過剰 (FlagshipNav 10項目 + サイドバー 9カテゴリ 30+項目 + Footer 4カテゴリ 30+項目)",
    priority: "P2",
    effortHours: 12,
    url: "全ページ",
    evidence:
      "(1) web/src/components/flagship-nav.tsx の FLAGSHIP_FEATURES は 10件 (10機能×サブ機能 56リンク以上)。(2) web/src/components/app-shell.tsx の NAV_CATEGORIES は 9カテゴリで item 数は約30。(3) web/src/components/footer.tsx は 4カテゴリで リンク数 30+。同じページに『主要機能』『関連データ』『プロジェクト』『規約』の重複ラベルが存在。Hick's Law 観点で選択肢が多すぎ、利用者は機能発見できず scrolling/scanning コストが累積する。",
    recommendation:
      "(a) FlagshipNav を 7→3 に絞り、メイン3機能 (chatbot/accidents-reports/plan-generator) を最上位に置く。 (b) サイドバーは『現場ツール / 学習 / 法令 / データ / プロジェクト』の5カテゴリに統合。 (c) footer は『主要機能 3 / 関連データ / 規約』の3カラムに整理。重複リンクを排除。",
    status: "TBD",
  },
  {
    id: "UX-004",
    category: "UX-A",
    title: "『7目玉』ラベルと FLAGSHIP_FEATURES 配列長 10 の数値ミスマッチ",
    priority: "P2",
    effortHours: 1,
    url: "/, /features",
    evidence:
      "web/src/config/flagship-nav.ts コメント `/** 7目玉の主要機能ナビゲーション定義 */`、 web/src/components/flagship-grid.tsx の h2 表示 `『7つの主要機能』(isEn ? '7 flagship tools' : '7つの主要機能')`、 web/src/components/flagship-nav.tsx の aria-label `7目玉ナビゲーション` のいずれも『7』を主張。一方 FLAGSHIP_FEATURES 配列は safety-diary, ky, chemical-ra, signage, laws, chatbot, accidents, education-certification, industries, work-environment の10件。コードと表示の不一致は第三者には誤情報。",
    recommendation:
      "FLAGSHIP_FEATURES を厳密に7件に絞る (memory: education-certification, industries, work-environment を別カテゴリへ移動)、または表示文言を『10の主要機能』『主要機能セット』に統一。中途半端な『7』ラベルは即時撤去。",
    status: "resolved",
  },
  {
    id: "UX-005",
    category: "UX-A",
    title: "Footer『主要機能』7項目 (safety-diary / ky / chemical-ra / signage / laws / chatbot / accidents) がオーナー戦略メイン3機能と非整合",
    priority: "P1",
    effortHours: 2,
    url: "全ページフッター",
    evidence:
      "web/src/components/footer.tsx:34-70 の『主要機能』カラムは 7項目固定で、メイン3機能のうち /accidents-reports が含まれず /accidents (10年DB) になっている。 /strategy/plan-generator は『プロジェクト』カラムにも『関連データ』カラムにも無い。サイト全体動線で『主要』の定義が分裂。",
    recommendation:
      "『主要機能』カラムを上位3項目 (chatbot / accidents-reports / strategy/plan-generator) に整理し、残り4項目は『ツール』『データ』別カラムに移動。フッターの順序を docs/homepage の戦略3項目化と一致させる。",
    status: "resolved",
    resolvedPr: 241,
  },
];

const FINDINGS_UX_B: Finding[] = [
  {
    id: "UX-006",
    category: "UX-B",
    title: "Ctrl+K 検索インデックスが5カテゴリのみ (notice/chemical/quiz/education/accident) で laws/industries/diversity/faq/glossary 未網羅",
    priority: "P2",
    effortHours: 8,
    url: "全ページ (CommandPalette)",
    evidence:
      "web/src/components/CommandPalette.tsx:24 の `CATEGORIES = ['notice','chemical','quiz','education','accident']` のみ。利用者が『腰痛 予防』『カスハラ』『熱中症 R7』『石綿 事前調査』『業種 建設』『FAQ 安全管理者』等を引いてもヒットしない。trackEvent でゼロ件検索ログを分析し追加すべき。",
    recommendation:
      "buildSearchIndex のソースを laws / industries / diversity / heat-illness-prevention / asbestos-management / faq / glossary / ky-examples / education-certification まで拡張。カテゴリ別フィルタも増やす。",
    status: "TBD",
  },
  {
    id: "UX-007",
    category: "UX-B",
    title: "モバイル『検索』ボタンとデスクトップ『Ctrl+K』が異なる機能 (前者は /law-search 遷移、後者は CommandPalette)",
    priority: "P2",
    effortHours: 2,
    url: "全ページ",
    evidence:
      "web/src/components/MobileBottomNav.tsx の `search` item は href=/law-search で直接遷移。 web/src/components/app-shell.tsx の PC `検索 Ctrl+K` ボタンは openCommandPalette を呼び出す。同じ『検索』ラベルだがモバイルは1機能遷移、PCはサイト横断検索。学習コストと混乱を生む。",
    recommendation:
      "MobileBottomNav の『検索』も CommandPalette を開くボタンに変更 (openCommandPalette via useCommandPalette hook)。 /law-search は副次動線として CommandPalette 内『法令検索』ショートカット行に出す。",
    status: "TBD",
  },
  {
    id: "UX-008",
    category: "UX-B",
    title: "ホーム本日のトピックカードに『業種別 事故分析レポート』『年次安全衛生計画』への動線がない",
    priority: "P2",
    effortHours: 3,
    url: "/",
    evidence:
      "web/src/components/home-three-pillars.tsx の3カードはそれぞれ /accidents, /risk, /laws へのCTA。メイン3機能のうち /accidents-reports と /strategy/plan-generator がトップの主要見出しから到達できない。",
    recommendation:
      "(a) 事故カード『事故DBを見る →』を『業種別レポートを開く →』に変え /accidents-reports に。 (b) 法改正カードに『年次計画を作る』のセカンダリCTAを追加し /strategy/plan-generator に誘導。",
    status: "TBD",
  },
];

const FINDINGS_UX_C: Finding[] = [
  {
    id: "UX-009",
    category: "UX-C",
    title: "ヒーロー直下『FEATURES 7つの主要機能』見出しが実装10機能と矛盾、第三者の信頼性低下",
    priority: "P2",
    effortHours: 1,
    url: "/",
    evidence:
      "web/src/components/flagship-grid.tsx の h2: `『7つの主要機能』`。 直下のグリッドには10枚カードが並ぶ。コンサル/労務担当者からは『数を盛っているのか、減らしたのか分からない』と映る。",
    recommendation:
      "見出しを『主要10機能』『現場をワンストップで支える機能群』等に修正、または10→7の絞り込みを実施。",
    status: "resolved",
  },
  {
    id: "UX-010",
    category: "UX-C",
    title: "英語版ヒーローのブランド表記が『ANZEN AI Portal』のまま残存 (リブランド未完)",
    priority: "P2",
    effortHours: 1,
    url: "/ (lang=en)",
    evidence:
      "web/src/components/new-home-hero.tsx:57 `{isEn ? 'ANZEN AI Portal' : '安全AIポータル'}`。 直近 c6a22bc コミット (fix(branding): remove ANZEN AI from remaining alt attributes) で alt 属性のみ修正しているが、ヒーロー英語表記は ANZEN AI Portal のまま。英語版で『安全AIポータルって何?』と困惑を生む。",
    recommendation:
      "英語表記を 'ANZEN AI Portal' から 'Anzen AI Portal (Japan OSH research)' などに刷新するか、ja の『安全AIポータル』をそのまま英語版でも使い (固有名詞扱い)、サブタイトルだけ英訳。",
    status: "resolved",
    resolvedPr: 246,
  },
  {
    id: "UX-011",
    category: "UX-C",
    title: "メインCTA『安衛法AIに質問する』が初見ユーザーには『安衛法』の意味不明 (略語)",
    priority: "P3",
    effortHours: 1,
    url: "/",
    evidence:
      "ヒーロー CTA1 は『安衛法AIに質問する』。安衛法 = 労働安全衛生法は専門用語。コンサル/労務担当者には自明だが、現場作業員や中小規模事業主には『安衛法って何の略?』のステップが入る。検索流入では一般語の方が KPI が伸びる。",
    recommendation:
      "CTA を『労働安全衛生法をAIに質問』『現場の安全ルールをAIに質問』等の平易表現に統一。略語使用は2スクロール目以降の専門セクションに限定。",
    status: "TBD",
  },
  {
    id: "UX-012",
    category: "UX-C",
    title: "ヒーロー直下 HomeThreePillars 3カードの AlertGenerator (AI生成ボタン) 配置がCTA過多 (1ページに5+ CTA)",
    priority: "P3",
    effortHours: 2,
    url: "/",
    evidence:
      "web/src/components/home-three-pillars.tsx は3カードそれぞれに『注意喚起文を作成』(AlertGenerator) + 詳細リンクの計6 CTA。ヒーロー2 CTA と合わせて First View 直下に8 CTA。Hick's Law 違反、初見ユーザーは『どこを押せばいい?』で停止する。",
    recommendation:
      "AlertGenerator は3カード共通の1つにまとめる (どのトピックから生成するかを内部で選択)。または初期表示時はCTA非表示、ホバー/タップで露出。",
    status: "TBD",
  },
];

const FINDINGS_UX_D: Finding[] = [
  {
    id: "UX-013",
    category: "UX-D",
    title:
      "/strategy/plan-generator のパンくず重複 (『戦略・計画』と『年次安全衛生計画ジェネレーター』が同じURLを指す)",
    priority: "P2",
    effortHours: 1,
    url: "/strategy/plan-generator",
    evidence:
      "web/src/app/(main)/strategy/plan-generator/page.tsx:38-42 の breadcrumbs: `[{name:'ホーム', url:'/'},{name:'戦略・計画', url:'/strategy/plan-generator'},{name:'年次安全衛生計画ジェネレーター', url:'/strategy/plan-generator'}]`。中間と末端のURLが同じ。JSON-LD でも重複が出力され、Google が『同一URLを階層的に持つ』壊れた BreadcrumbList と判定する。",
    recommendation:
      "(a) /strategy をハブページとして実装し、中間パンくず URL を /strategy に。 (b) または2階層目を削除して [ホーム, 年次安全衛生計画ジェネレーター] の2階層に。",
    status: "TBD",
  },
  {
    id: "UX-014",
    category: "UX-D",
    title:
      "/strategy ルートが孤立 (`/strategy` 直URLでアクセスしてもハブが無く、子ページ /strategy/plan-generator のみ)",
    priority: "P3",
    effortHours: 3,
    url: "/strategy, /strategy/plan-generator",
    evidence:
      "web/src/app/(main)/strategy/ に page.tsx は存在するが、UX-013 のパンくずが /strategy/plan-generator を『戦略・計画』として参照しているのは、ハブとしての /strategy が機能していないことを示す。ユーザーが URL を一段削って /strategy を見に行く動線で迷子になる。",
    recommendation:
      "/strategy をハブ化し、配下の年次計画ジェネレーター以外の戦略ツール (RA, 教育計画) も統合。または、/strategy を削除し直接 /strategy/plan-generator にリダイレクト。",
    status: "TBD",
  },
  {
    id: "UX-015",
    category: "UX-D",
    title:
      "Footer の『主要機能』『関連データ』分類基準が不明瞭 (KY事例DB/メンタル/外国人労働者/グッズが『関連データ』扱い)",
    priority: "P3",
    effortHours: 2,
    url: "全ページフッター",
    evidence:
      "web/src/components/footer.tsx の『関連データ』カラムには KY事例DB (ツール) / メンタル対策 (機能ハブ) / 外国人労働者 (機能ハブ) / 安全用品カタログ (ツール) が混在。第三者には『データ』と『機能』の境界が見えない。",
    recommendation:
      "『機能』(操作系) と『データ』(参照系) の二軸で分類整理。例: KY事例DB → データ、メンタル対策 → 機能、外国人労働者 → 機能、用品カタログ → 機能。",
    status: "TBD",
  },
];

const FINDINGS_UX_E: Finding[] = [
  {
    id: "UX-016",
    category: "UX-E",
    title: "AlertGenerator (ホーム3カード共通) AI生成失敗時のエラー表示が生テキスト、再試行UI無し",
    priority: "P2",
    effortHours: 2,
    url: "/",
    evidence:
      "web/src/components/home-three-pillars.tsx:402 のフォールバック `setError(isEn ? 'Network error occurred.' : 'ネットワークエラーが発生しました。')`。ユーザーには『再試行』ボタンも『なぜ失敗したか』のヒントもない。失敗時の出口が無い。",
    recommendation:
      "エラー時に (a) 再試行ボタン、 (b) 'API使用上限/ネットワーク等を確認' の具体的ヒント、 (c) 失敗が3回続いた場合の管理者連絡先誘導 (/contact) を表示。",
    status: "TBD",
  },
  {
    id: "UX-017",
    category: "UX-E",
    title:
      "Chatbot ページ SSR 時に『読み込み中』のみ表示、CSR mount まで First Contentful Paint がプレースホルダーのまま",
    priority: "P2",
    effortHours: 4,
    url: "/chatbot",
    evidence:
      "本番 https://www.anzen-ai-portal.jp/chatbot に curl/WebFetch でアクセスしても初期 HTML には『読み込み中』のみ表示。サンプル質問チップ・プレースホルダーが SSR で出ない。スクリーンリーダー/Googlebot 視点で『何のためのページ?』が遅延理解になる。",
    recommendation:
      "(a) chatbot-panel.tsx の EXAMPLE_QUESTIONS 等を SSR でも出力するよう Server Component 分離。 (b) `<noscript>` 内に静的なサンプル質問リストを併設。",
    status: "TBD",
  },
  {
    id: "UX-018",
    category: "UX-E",
    title: "ホームページ統計バー (1,069件/5,026件/1,050点) が SSR/CSR 双方で数値が固定だが、CLS リスク有",
    priority: "P3",
    effortHours: 2,
    url: "/",
    evidence:
      "web/src/components/new-home-hero.tsx の STATS は data/site-stats から取得。SITE_STATS.mhlwNoticeCount 等は static 値だが、フォントロード後にレイアウトシフトが発生し得る。viewport 375px で数値折り返しがあると CLS 増加。",
    recommendation:
      "(a) 統計数値部分に CSS `font-display: swap` ではなく `optional` を採用するか、フォント先行ロード。(b) コンテナに固定の min-h を付与してロード前後でレイアウトが揺れない構造に。",
    status: "TBD",
  },
];

const FINDINGS_UX_F: Finding[] = [
  {
    id: "UX-019",
    category: "UX-F",
    title:
      "屋外モードトグルがPC上部+サイドバー底部の2箇所に重複配置 (機能は同期するがUI重複)",
    priority: "P3",
    effortHours: 1,
    url: "全ページ (PC)",
    evidence:
      "web/src/components/app-shell.tsx:605-627 (PC top bar の屋外モードボタン) と 400-412 (サイドバー底部の屋外ボタン) で同一機能が2箇所に出る。視覚的にも『何が違うのか』が分からない。",
    recommendation:
      "サイドバー底部の屋外ボタンを削除し、PC top bar の1箇所のみに集約。アクセシビリティトグル群 (ふりがな/やさしい/文字大/屋外) は1グループとしてトップバーに移動。",
    status: "TBD",
  },
  {
    id: "UX-020",
    category: "UX-F",
    title: "言語切替セレクトボックスが PC/モバイルで2つの <select> 要素 (id 衝突は回避済だが重複)",
    priority: "P3",
    effortHours: 1,
    url: "全ページ",
    evidence:
      "web/src/components/app-shell.tsx:416-433 (PC: id='app-lang-select-pc') と 472-493 (Mobile: id='app-lang-select-mobile') の2 <select>。ラベルは別だが機能完全重複。同じ language state を共有しているがDOM上は2つ。スクリーンリーダーで読み上げが冗長になる場合あり。",
    recommendation:
      "1つの <select> を CSS で PC/モバイル両対応 (display 切替) する、または ResponsiveSelect コンポーネントに抽出。",
    status: "TBD",
  },
  {
    id: "UX-021",
    category: "UX-F",
    title:
      "モバイルヘッダーでアクセシビリティトグル (ふりがな/やさしい/文字大) がデフォルト非表示 — ハンバーガーメニュー展開後のみ露出",
    priority: "P2",
    effortHours: 3,
    url: "全ページ (mobile)",
    evidence:
      "web/src/components/app-shell.tsx の モバイルヘッダーは 検索 + 屋外 + 言語 + テーマ + ユーザー + メニューの6要素のみ。ふりがな/やさしい/文字大はメニュー展開後の 4ボタングループ内。日本語が苦手な利用者・高齢の現場作業員はメニューを開かないと機能発見できない。",
    recommendation:
      "(a) 初回訪問時にバナーで『ふりがな/やさしい日本語/文字大の表示モードあります』を案内、 (b) mobile ヘッダーに最低限『ふりがな』『文字大』を移動表示。",
    status: "TBD",
  },
];

const FINDINGS_UX_G: Finding[] = [
  {
    id: "UX-022",
    category: "UX-G",
    title:
      "ホームヒーロー統計バー (3カラム×統計数値+出典) が viewport 375px で text-[9px] サイズ — 視認性低",
    priority: "P2",
    effortHours: 1,
    url: "/ (mobile)",
    evidence:
      "web/src/components/new-home-hero.tsx:90-124 の統計バー: `grid-cols-3 gap-3 sm:gap-4` で 375px では1カラム75px幅。 `text-[9px]` (9px) と `text-[10px]` (10px) が混在。Tailwind 標準の text-xs (12px) を下回るサイズは現場ユーザー(高齢/老眼) には読みづらい。",
    recommendation:
      "(a) viewport <400px では2カラム+1カラムレイアウトに変更、 (b) 最小フォントサイズを text-[11px] (11px) に統一、 (c) 出典リンクは ハンドル化 して 'i' アイコンタップで開く。",
    status: "resolved",
    resolvedPr: 246,
  },
  {
    id: "UX-023",
    category: "UX-G",
    title:
      "サイドバーが lg (1024px〜) 以上でのみ表示、768〜1023px ではドロワー必須でタブレット縦持ち体験が悪い",
    priority: "P3",
    effortHours: 4,
    url: "全ページ (tablet 768x1024)",
    evidence:
      "web/src/components/app-shell.tsx:325 `<aside className=\"hidden ... lg:flex\">`。 lg ブレイクポイント (1024px) 未満はモバイル扱いでハンバーガー必須。iPad 縦 (768x1024) や Surface Go ではサイドバーが常時表示されない。",
    recommendation:
      "lg ブレイクポイントを md (768px) に下げ、タブレット縦持ちでもサイドバー固定。または md ではナビを上部水平バーに切り替え。",
    status: "TBD",
  },
  {
    id: "UX-024",
    category: "UX-G",
    title:
      "右下フローティング ShareButtons (固定) がモバイル下部 MobileBottomNav の上に重なり、SNS共有時にホーム/KY/検索ボタンを覆う",
    priority: "P2",
    effortHours: 2,
    url: "全ページ (mobile)",
    evidence:
      "web/src/components/app-shell.tsx:636 `<ShareButtons fixed />`。 ShareButtons は fixed bottom right。MobileBottomNav も fixed bottom inset-x-0 z-40。 z-index/position の重ね合わせで、ShareButtons パネル展開時にボトムナビの右側 (chat / マイ) が見えない/タップできない可能性。",
    recommendation:
      "(a) モバイルでは ShareButtons を画面右上か中央上に移動、 (b) または ShareButtons は MobileBottomNav 表示時 (≤480px) に bottom-16 (ナビ分のオフセット) を付与。",
    status: "TBD",
  },
];

const FINDINGS_UX_H: Finding[] = [
  {
    id: "UX-025",
    category: "UX-H",
    title:
      "演習問題機能ラベル3種類 (ナビ『演習問題』/ ページh1『学習用クイズ』/ メタtitle『安全衛生 資格試験 学習用クイズ』)",
    priority: "P2",
    effortHours: 2,
    url: "/exam-quiz",
    evidence:
      "(a) web/src/components/app-shell.tsx:98 nav label = '演習問題'、(b) web/src/app/(main)/exam-quiz/page.tsx:74 PageHeader title = '学習用クイズ（全資格対応）'、(c) 同 metadata.title = '安全衛生 資格試験 学習用クイズ'。PR #234 で nav は『演習問題』に統一されたが、ページ本体は未対応。",
    recommendation:
      "3箇所すべて『演習問題（全資格対応）』に統一。メタ description も連動更新。",
    status: "resolved",
    resolvedPr: 246,
  },
  {
    id: "UX-026",
    category: "UX-H",
    title:
      "NEW / AI / β バッジの過剰使用 (サイドバー8箇所超 + FlagshipNav 内のサブ機能にも分散)",
    priority: "P2",
    effortHours: 2,
    url: "全ページナビ",
    evidence:
      "web/src/components/app-shell.tsx NAV_CATEGORIES で `badge: 'NEW'` が features/risk-prediction/chatbot/chemical-ra/mental-health-management/treatment-work-balance/plan-generator の7+件。 `badge: 'AI'` も chatbot/risk-prediction/chemical-ra で3件。 NEW が常時表示の利用者には『何が新しい?』が分からなくなり情報価値ゼロ。",
    recommendation:
      "(a) NEW バッジは公開後30日のみ表示する有効期限機構を導入 (badgeUntil: 'YYYY-MM-DD')。 (b) AI バッジは chatbot のみに絞る (RAコア機能は AI でなくテンプレ計算なので AI バッジ撤去)。",
    status: "resolved",
    resolvedPr: 246,
  },
  {
    id: "UX-027",
    category: "UX-H",
    title:
      "メンタル系3項目 (メンタル・カスハラ / メンタル対策実務 / 治療と仕事の両立支援) がサイドバー同カテゴリ並列で利用者に差分伝わらない",
    priority: "P2",
    effortHours: 4,
    url: "/diversity, /mental-health, /mental-health-management, /treatment-work-balance",
    evidence:
      "web/src/components/app-shell.tsx:128-133『多様な働き方』カテゴリに 4項目 (diversity/mental-health/mental-health-management/treatment-work-balance) が並列。利用者は『どれを開けばよいか』判断不能。メンタル系2項目 (mental-health vs mental-health-management) の境界がラベルから読めない。",
    recommendation:
      "(a) /mental-health (旧 / 概念解説) は /mental-health-management (新 / 実務ハブ) に統合または301。 (b) サイドバーは『多様な働き方 (diversity/foreign-workers)』『心身の健康 (mental-health-management/treatment-work-balance)』の2サブカテゴリに整理。",
    status: "TBD",
  },
  {
    id: "UX-028",
    category: "UX-H",
    title: "Footer に /api-docs リンクが残存 (本体は noindex 設定済だがフッター誘導は継続)",
    priority: "P1",
    effortHours: 1,
    url: "全ページフッター",
    evidence:
      "web/src/components/footer.tsx:168-172 で /api-docs に静的リンク。 web/src/app/(main)/api-docs/ ページ本体は noindex (curl で確認、`<meta name='robots' content='noindex,'>` 出力)、robots.txt でも Disallow 指定済 (PR #187 F-002)。しかしフッターからのリンクは未削除。ユーザーは『API ドキュメント』を期待してクリックし未完成ページに到達、信頼性毀損。",
    recommendation:
      "footer.tsx から /api-docs リンクを削除。法人化後のAPI提供開始時に再追加。",
    status: "resolved",
  },
  {
    id: "UX-029",
    category: "UX-H",
    title:
      "Footer に /qa-knowledge『Q&A投稿募集』リンクが残存 (PR #194/#234 で縮小ランディング化済だが訴求残存)",
    priority: "P2",
    effortHours: 1,
    url: "全ページフッター",
    evidence:
      "web/src/components/footer.tsx:109-113。F-007 の縮小判断 (kept-by-owner B-縮小) は /qa-knowledge を投稿募集ランディングに絞り /faq へ301する設計。フッターの『Q&A投稿募集』ラベルは縮小方針と整合するが、関連データカラムの分類は『データ』として不適切。",
    recommendation:
      "(a) ラベルを『Q&A 投稿募集 (準備中)』にしてプロジェクト/コミュニティ系カラムに移動、 (b) もしくは投稿数が10件未満のうちは footer 表示から除外し /contact 経由のみに。",
    status: "resolved",
    resolvedPr: 246,
  },
];

// =====================================================================
// SEO カテゴリ
// =====================================================================

const FINDINGS_SEO_A: Finding[] = [
  {
    id: "SEO-001",
    category: "SEO-A",
    title:
      "主要検索クエリで安全AIポータルが Google 検索結果トップ10圏外 (『安衛法 AI チャットボット』『労働災害 業種別 分析 レポート』『年次安全衛生計画 業種 ジェネレーター』)",
    priority: "P1",
    effortHours: 0,
    url: "Google検索全般",
    evidence:
      "WebSearch 2026-05-17 時点: (a)『安衛法 AI チャットボット』top10 はBotpress/Malwarebytes/JBS等の汎用記事、安衛法特化チャットボットの言及無し。(b)『労働災害 業種別 分析 レポート』top10 は JISHA / 厚労省 / osh-management.com / keiyaku-watch.jp。安全AIポータル不在。(c)『年次安全衛生計画 業種 ジェネレーター』top10 は厚労省/m3career/aemk.or.jp/sangyoui/sbrain.co.jp等の士業/コンサルブログ。当サイトの『業種10種×規模3段階の30テンプレート』は強力な差別化だが、検索可視性ゼロ。",
    recommendation:
      "(a) /chatbot, /accidents-reports, /strategy/plan-generator の title/description を主要キーワード前半に再構成。(b) これら3機能を起点とする internal-link hub を作り、業種別 LP に E-E-A-T 要素 (オーナー資格・登録番号) を埋め込む。(c) Google Search Console で当該クエリのインプレッション/CTR/ポジションを定常監視する仕組みをドキュメント化。",
    status: "resolved",
    resolvedPr: 242,
  },
  {
    id: "SEO-002",
    category: "SEO-A",
    title:
      "ロングテール『〜業 安全衛生計画書 テンプレート 無料』『〜業 KY 例 5業種』『熱中症 安衛則 612条の2 R7.6.1』などの未カバー意図",
    priority: "P2",
    effortHours: 16,
    url: "/strategy/plan-generator, /ky-examples, /heat-illness-prevention",
    evidence:
      "現状 metadata.description は『業種10種×規模3段階の30テンプレート』『5業種×10作業150件』等の機能訴求中心で、ユーザーの実検索意図 (『無料』『PDF』『2025 R7.6.1 改正後』『施行日』など) のロングテール語句が薄い。",
    recommendation:
      "(a) /strategy/plan-generator の description に『無料・PDF出力可・建設業/製造業/運輸業/医療福祉/サービス業/小売業/飲食業/卸売業/倉庫業/事務系の10業種』を明示。(b) /ky-examples に『無料 KYT 例 建設業 鉄筋 高所作業 ヒヤリハット』等ロングテール H2 を追加。(c) /heat-illness-prevention に『安衛則第612条の2 令和7年6月1日施行』正規語句を最初の段落に。",
    status: "TBD",
  },
  {
    id: "SEO-003",
    category: "SEO-A",
    title:
      "ホームのキャッチコピー『現場の安全を、AIで変える。』が検索流入ワードとマッチしない (情緒的訴求のみ)",
    priority: "P3",
    effortHours: 1,
    url: "/",
    evidence:
      "h1=『現場の安全を、AIで変える。』。Google でこのフレーズは月間検索 0 (情緒コピー)。一方『労働安全衛生 サイト』『安全管理者 ツール』『安全衛生計画 無料』等のクエリには h1 が一致しない。タイトル/h1 と検索意図の乖離が CTR 低下を招く。",
    recommendation:
      "h1 を『労働安全衛生のAI・データ活用ポータル』『安全管理者の業務を10機能で支える研究プロジェクト』等の検索意図ワードに変更し、キャッチコピーは subhead に格下げ。",
    status: "TBD",
  },
];

const FINDINGS_SEO_B: Finding[] = [
  {
    id: "SEO-004",
    category: "SEO-B",
    title:
      "hreflang link 要素が HTML 内に出力されていない (layout.tsx の alternates.languages は同一URL指定)",
    priority: "P1",
    effortHours: 4,
    url: "全ページ",
    evidence:
      "(a) web/src/app/layout.tsx:55-59 で alternates.languages = { ja: 'https://www.anzen-ai-portal.jp', en: '...', 'x-default': '...' } と3言語同URL指定。 (b) 本番 https://www.anzen-ai-portal.jp/ および /chatbot の HTML を curl + grep -ioE 'hreflang' で 0件確認。 Next.js が同一URLを検出して link emit を省略している可能性。(c) サイトマップ側では同一URL hreflang を ja/en/x-default 3件emit。 GoogleSearchConsole『不適切な hreflang』警告対象。",
    recommendation:
      "(a) /en/ プレフィックス付きルートを実装し、本物の英語URLを発行 (現在 client-side i18n は SEO で不可視)。または (b) hreflang を完全に撤去し、ja のみで運用し『英語版は Beta、Googleには日本語版のみインデックス』と明示。中途半端な同一URL hreflang は害のみ。",
    status: "TBD",
  },
  {
    id: "SEO-005",
    category: "SEO-B",
    title:
      "sitemap.xml の全URL に ja/en/x-default 同一URL hreflang が出力 → Google Search Console 不適切判定リスク",
    priority: "P1",
    effortHours: 2,
    url: "/sitemap.xml",
    evidence:
      "本番 curl 結果: 各 <url> ブロックに `<xhtml:link rel='alternate' hreflang='ja' href='...'/>`, `hreflang='en'`, `hreflang='x-default'` が全部同一URLを指す。Google: 『代替URL を持つときは、各代替URLは異なる必要があります』。 web/src/app/sitemap.ts:247-254 の `alternates.languages` が全URLに同一を埋め込む実装。",
    recommendation:
      "(a) sitemap.ts の alternates.languages ブロックを削除 (英語版 URL が無いなら hreflang は emit しない)。 (b) 本格英語対応 (SEO-004) 完了後に /en/ プレフィックスURLを埋め込む。",
    status: "resolved",
  },
  {
    id: "SEO-006",
    category: "SEO-B",
    title:
      "sitemap lastModified の鮮度差が極端 (/pricing 2026-03-01, /privacy 2025-10-01, /ky 2026-04-01, vs /accidents-reports/* 2026-05-16)",
    priority: "P2",
    effortHours: 4,
    url: "/sitemap.xml",
    evidence:
      "web/src/app/sitemap.ts:15-163。直近の更新 (2026-05-15〜17) と古い (2026-03-01, 2025-10-01) が混在。/pricing は PAID_MODE=false で sitemap 除外済だが 2026-03-01 はリブランド前。Googlebot は『更新が止まったサイト』判定で crawl 頻度を下げる。",
    recommendation:
      "(a) 各ページの実コンテンツ更新タイミングと lastmod を git ベースで自動生成する (`scripts/refresh-sitemap-lastmod.mjs` を新設し、デプロイ前 prebuild フックで実行)。 (b) 静的ハードコーディングを撤廃。",
    status: "TBD",
  },
  {
    id: "SEO-007",
    category: "SEO-B",
    title:
      "ホームページの meta description が145字超 (Google検索結果で切れる)",
    priority: "P2",
    effortHours: 1,
    url: "/",
    evidence:
      "web/src/app/(main)/page.tsx:10-11 `_desc = '労働安全衛生のAI・DX活用研究プロジェクト。安全衛生日誌・KY簡易作成・化学物質RA・サイネージ・法改正・安衛法AIチャット・重大事故ニュースの7つの主要機能で現場運用を支援します。'`。 文字数 = 145文字。Google検索結果の description は120字前後で切られるため、後半『重大事故ニュースの7つの主要機能で現場運用を支援します。』が切り落とされる。",
    recommendation:
      "description を100-120字に短縮し、主要キーワード3つ (労働安全衛生 / AI / DX) を前半に置く。例:『労働安全衛生のAI・DX活用研究プロジェクト。安衛法AIチャット、KY、業種別事故分析、年次安全衛生計画など現場運用機能を集約。無料。』(96字)",
    status: "resolved",
  },
  {
    id: "SEO-008",
    category: "SEO-B",
    title:
      "compare ページ sitemap に5つのクエリ組み合わせURL — クエリパラメータベース URL の sitemap 登録は重複コンテンツリスク",
    priority: "P2",
    effortHours: 3,
    url: "/sitemap.xml (compare?industries=...)",
    evidence:
      "web/src/app/sitemap.ts:30-33 で `compare?industries=construction,manufacturing` 等の query 付き URL 5件を sitemap 掲載。 canonical は正規化 (alphabetical order) されているが、Googleが sitemap 由来の URL を canonical 越権で indexing する事例あり。クエリ URL が public sitemap に出ること自体が稀。",
    recommendation:
      "(a) クエリ付き URL を sitemap から除外し、 /accidents-reports/compare のみ sitemap 掲載。(b) クエリ別ページは内部リンクから到達可能にし、 sitemap で priority を持たせない。",
    status: "TBD",
  },
];

const FINDINGS_SEO_C: Finding[] = [
  {
    id: "SEO-009",
    category: "SEO-C",
    title:
      "/strategy/plan-generator BreadcrumbList JSON-LD が壊れたデータを持つ (UX-013 と同根、SEO 観点)",
    priority: "P1",
    effortHours: 1,
    url: "/strategy/plan-generator",
    evidence:
      "web/src/app/(main)/strategy/plan-generator/page.tsx:38-42 breadcrumbs 2階層目と3階層目の url が同じ /strategy/plan-generator。 Google Rich Results Test で『同一URLを複数のpositionで参照する不正な BreadcrumbList』と判定される可能性。",
    recommendation:
      "(a) /strategy ハブを実装し中間 URL を /strategy に。(b) または2階層に減らす ([ホーム, 年次安全衛生計画ジェネレーター])。",
    status: "resolved",
  },
  {
    id: "SEO-010",
    category: "SEO-C",
    title:
      "FlagshipGrid 10カードに ItemList Schema 未実装 — トップページが Google 検索結果で『機能リスト』のリッチスニペット候補にならない",
    priority: "P2",
    effortHours: 4,
    url: "/",
    evidence:
      "web/src/components/flagship-grid.tsx は plain な <ul> + <li> 構造。ItemList Schema.org JSON-LD が無く、Google が『FEATURES (主要機能)』を機能リストとして認識できない。ナレッジパネル/サイトリンク獲得の機会損失。",
    recommendation:
      "FlagshipGrid に ItemList JSON-LD を埋め込み、各 ListItem に name/url/description を持たせる。複数 sitelinks 表示を狙う。",
    status: "TBD",
  },
  {
    id: "SEO-011",
    category: "SEO-C",
    title:
      "/exam-quiz 直下 CourseList / Quiz Schema 未実装 (LearningResource 機会損失)",
    priority: "P2",
    effortHours: 6,
    url: "/exam-quiz, /exam-quiz/[slug]",
    evidence:
      "web/src/app/(main)/exam-quiz/page.tsx は WebPage + BreadcrumbList のみ。各 CERT_QUIZZES エントリは Quiz / Course Schema 対応可能だが未実装。『〇〇試験 問題 無料』検索でリッチカード獲得の機会損失。",
    recommendation:
      "(a) /exam-quiz トップに ItemList of Course Schema、(b) /exam-quiz/[slug] に Quiz Schema (questions/answers なし or 一部のみ)。",
    status: "TBD",
  },
];

const FINDINGS_SEO_D: Finding[] = [
  {
    id: "SEO-012",
    category: "SEO-D",
    title:
      "メイン3機能 (/chatbot, /accidents-reports, /strategy/plan-generator) 相互の内部リンク密度が低い",
    priority: "P1",
    effortHours: 6,
    url: "/chatbot, /accidents-reports, /strategy/plan-generator",
    evidence:
      "PR #225 のハブ&スポーク整理で /chatbot は法令系ハブから link in されたが、 /accidents-reports → /strategy/plan-generator の相互リンクや、 /strategy/plan-generator → /chatbot(『計画書条文確認はAIで』)の動線が薄い。Googlebot のPageRank流通効率が低下。",
    recommendation:
      "(a) /accidents-reports の各業種カードに『この業種の年次計画を作る (/strategy/plan-generator?industry=...)』リンクを追加。 (b) /strategy/plan-generator フォーム結果末尾に『生成計画書を AI に質問 (/chatbot)』リンク。 (c) /chatbot サイドバーに『関連機能: 業種別事故レポート / 年次計画ジェネレーター』を常時表示。",
    status: "resolved",
    resolvedPr: 244,
  },
  {
    id: "SEO-013",
    category: "SEO-D",
    title:
      "/about ハブ (運営者情報) からメイン3機能への直接リンクが無く、E-E-A-T シグナルが分散",
    priority: "P2",
    effortHours: 3,
    url: "/about",
    evidence:
      "/about は『研究プロジェクトについて』のハブ。オーナー資格・登録番号などのE-E-A-T訴求の中心だが、メイン3機能への文脈リンクが薄い。Googleは『専門家プロフィール → 専門分野コンテンツ』の関連性を E-E-A-T で重視。",
    recommendation:
      "/about 末尾に『この研究の成果物 (メイン3機能)』カードを設置し /chatbot, /accidents-reports, /strategy/plan-generator へ。逆方向も /chatbot footer に『監修: 労働安全衛生コンサルタント(/about)』を恒久表示。",
    status: "TBD",
  },
  {
    id: "SEO-014",
    category: "SEO-D",
    title:
      "アンカーテキスト多様性不足 — Footer 『安衛法AIチャット』『化学物質RA』等が固定文言で、ロングテール変奏 ('労働安全衛生法 AI', '化学物質 リスクアセスメント') への露出機会喪失",
    priority: "P3",
    effortHours: 4,
    url: "全ページ Footer",
    evidence:
      "web/src/components/footer.tsx の『安衛法AIチャット』『化学物質RA』『重大事故ニュース』など anchor text が固定の専門用語短縮形。 internal anchor の多様性が低く、Googleが当該キーワードの重要性を学習しにくい。",
    recommendation:
      "(a) 一部リンクをロングテール表現に置換 (例: '安衛法AIチャット' → '労働安全衛生法AIチャット')、 (b) ページごとに anchor text を 2-3 種類使い分け、 (c) related-page-cards の cta テキストでロングテール語句を組み込む。",
    status: "TBD",
  },
];

const FINDINGS_SEO_E: Finding[] = [
  {
    id: "SEO-015",
    category: "SEO-E",
    title:
      "英語コンテンツが client-side i18n のみ — Googlebot は静的 HTML の日本語版しか見えない、英語SEO実質ゼロ",
    priority: "P1",
    effortHours: 0,
    url: "全ページ",
    evidence:
      "web/src/contexts/language-context.tsx の LanguageProvider は useState('ja') 初期化、 localStorage から hydrate。 Googlebot は static SSR の日本語 HTML をクロール。 英語版コンテンツは JS 実行後のみ。 Google が JS レンダリングする場合でも、localStorage に何も無い状態で初期表示は ja のままで、英語 indexing は事実上不可能。",
    recommendation:
      "(a) 本格対応する場合は /en/ プレフィックスルート (Next.js i18n routing) を導入し SSR で英語HTMLをemit。(b) 簡易対応なら『Beta』ラベルを撤去し、英語切替機能は Footer 内 explanatory bar に格下げ。中途半端な多言語化を停止。",
    status: "resolved",
    resolvedPr: 244,
  },
  {
    id: "SEO-016",
    category: "SEO-E",
    title:
      "FlagshipGrid の英語コピー (EN_FEATURE_COPY) が 7件のみ — 残り3機能 (education-certification, industries, work-environment) の英語表示が日本語fallbackで多言語品質低",
    priority: "P2",
    effortHours: 2,
    url: "/, /features",
    evidence:
      "web/src/components/flagship-grid.tsx:8-44 EN_FEATURE_COPY のキーは safety-diary, ky, chemical-ra, signage, laws, chatbot, accidents の7件。 FLAGSHIP_FEATURES 10件のうち education-certification, industries, work-environment の英語版は f.cardTitle/f.cardDescription (日本語) を流す。English (Beta) を主張するなら最低限の翻訳カバレッジが必要。",
    recommendation:
      "EN_FEATURE_COPY に残り3機能を追加。 (1) education-certification: 'Special Education & Skill Training DB'、 (2) industries: 'Industry-Specific Safety Portal (10 industries)'、 (3) work-environment: 'Working Environment Measurement & Classification'。",
    status: "resolved",
    resolvedPr: 246,
  },
  {
    id: "SEO-017",
    category: "SEO-E",
    title:
      "ホームの『FEATURES 7つの主要機能で...』文言とコンテンツ重複 — 同じ機能リストがフッターにも記載され thin content シグナル",
    priority: "P3",
    effortHours: 2,
    url: "/, 全ページ Footer",
    evidence:
      "(a) /page.tsx description = '安全衛生日誌・KY簡易作成・化学物質RA・サイネージ・法改正・安衛法AIチャット・重大事故ニュースの7つの主要機能'。 (b) flagship-grid.tsx 内 h2 サブテキスト同様の機能列挙。 (c) footer.tsx 主要機能カラム同じ7項目。サイト全ページで同一機能リストが3-4箇所重複。",
    recommendation:
      "(a) ホームは『主要3機能 (chatbot/accidents-reports/plan-generator) + 関連7機能』に整理。(b) Footer は『機能ハブへ』の1リンクのみで /features にユーザー誘導。",
    status: "TBD",
  },
];

const FINDINGS_SEO_F: Finding[] = [
  {
    id: "SEO-018",
    category: "SEO-F",
    title:
      "ホーム HTML サイズ 151KB / JS chunks 24 個 — INP / TBT 悪化リスク (PR #135 Lighthouse 監査以降の Page Weight 監視なし)",
    priority: "P2",
    effortHours: 8,
    url: "/",
    evidence:
      "curl HEAD: Content-Length: 151,867 bytes。 grep でJS chunks 24個ロード確認。CSS chunks 2個。 PR #135 の Lighthouse 監査以降、84 PR でJSバンドル/コンポーネント追加 (HomeThreePillars, AlertGenerator, FlagshipGrid, MobileBottomNav, CommandPalette など) → Page Weight 監視不在で TBT/INP が継続劣化している可能性。",
    recommendation:
      "(a) ホームページのみ Lighthouse CI を週次運用 (scripts/lighthouse-monitor.mjs)、 (b) JS chunks 20個以下にバジェット設定。(c) AlertGenerator (Gemini 呼び出し UI) を 'use client' から動的 import 化し First Load JS から除外。",
    status: "TBD",
  },
  {
    id: "SEO-019",
    category: "SEO-F",
    title:
      "/api/og の動的 OG画像生成が CDN キャッシュヘッダ未設定の場合、SNS 共有時の TTFB が遅延",
    priority: "P3",
    effortHours: 2,
    url: "/api/og",
    evidence:
      "web/src/app/layout.tsx:73 で og:image = '/api/og' の動的生成。各ページの og:image は ogImageUrl(title, desc) でクエリ付きで動的生成。Cache-Control が `public, max-age=31536000, immutable` でなければ Twitter/Facebook 共有のたびに再生成 → TTFB 増加。",
    recommendation:
      "(a) /api/og レスポンスに `Cache-Control: public, max-age=31536000, immutable` を設定、 (b) Vercel ImageOptimization の経路に切替 (next/og)。",
    status: "TBD",
  },
  {
    id: "SEO-020",
    category: "SEO-F",
    title:
      "ホームヒーロー直下 HomeThreePillars が `'use client'` 全体 SSR/CSR シフトリスク — `useMemo` の処理がクライアントのみ",
    priority: "P2",
    effortHours: 4,
    url: "/",
    evidence:
      "web/src/components/home-three-pillars.tsx:1 で `'use client'`。 pickLatestFatalAccident / pickRecentLawRevisions / pickWarningWeather は useMemo で計算可能だが、Client Component のため初期 SSR で『現在公開中の死亡事例はありません』が一瞬出る可能性 (state 同期前)。FCP 後の CLS 増。",
    recommendation:
      "(a) 3項目選択ロジックを Server Component に分離し props で渡す、(b) AlertGenerator のみ Client Boundary に。",
    status: "TBD",
  },
];

const FINDINGS_SEO_G: Finding[] = [
  {
    id: "SEO-021",
    category: "SEO-G",
    title:
      "robots.txt の Disallow と Footer/SubNav 経由のリンク存在が衝突 (/api-docs)",
    priority: "P1",
    effortHours: 1,
    url: "/robots.txt, 全ページFooter",
    evidence:
      "/robots.txt は Disallow: /api-docs。 web/src/components/footer.tsx には /api-docs リンクが残存。 Googlebot は『リンクは追えるが crawl 禁止』状態でクロール予算を浪費。soft 404 シグナル。",
    recommendation:
      "(a) footer.tsx から /api-docs リンク削除 (UX-028 と同根)、(b) /lms / /dpa など同様のリンクも全カラム横断棚卸し。",
    status: "resolved",
  },
  {
    id: "SEO-022",
    category: "SEO-G",
    title:
      "sitemap-index.xml と sitemap.xml の整合性検証が CI で行われていない (将来回帰のリスク)",
    priority: "P2",
    effortHours: 4,
    url: "/sitemap.xml, /sitemap-index.xml",
    evidence:
      "PR #180 で『URLの重複検査スクリプト』推奨が記載されたが (audit ref D-001) 、現状 scripts/ には sitemap 整合性チェッカーは無い (Glob で .mjs 確認)。PR #232/#233 robots cache purge の後も継続検証なし。",
    recommendation:
      "scripts/audit-sitemap-routes.mjs を新設し、(a) sitemap.xml の URL が routes と一致、 (b) robots.txt Disallow と sitemap loc が衝突しない、 (c) lastmod が今から1年以内、を CI で検証。",
    status: "TBD",
  },
];

const FINDINGS_SEO_H: Finding[] = [
  {
    id: "SEO-023",
    category: "SEO-H",
    title:
      "html lang 属性が SSR では常に `ja` (language-context.tsx は client-side のみ更新) — Googlebot 視点で英語版が存在しないと判定",
    priority: "P1",
    effortHours: 4,
    url: "全ページ",
    evidence:
      "web/src/app/layout.tsx:98 `<html lang='ja'>`。 web/src/contexts/language-context.tsx の applyHtmlLang は `document.documentElement.lang = ...` で client mount 後のみ更新。Googlebot は SSR 時点の lang=ja のみ参照。 hreflang/英語切替 UI を併設しても英語版は索引化不可。",
    recommendation:
      "(a) /en/ プレフィックス導入時に layout.tsx を [locale] 動的ルートに変更し SSR で lang を切替、(b) または英語版を諦め、lang=ja のみで運用し全ての英語 UI を撤去。",
    status: "resolved",
    resolvedPr: 244,
  },
  {
    id: "SEO-024",
    category: "SEO-H",
    title:
      "サイト全体に『English (Beta)』訴求があるが、英語版コンテンツの indexability が無く GoogleSearchConsole で英語クエリインプレッションが期待できない",
    priority: "P2",
    effortHours: 0,
    url: "全ページ (language toggle)",
    evidence:
      "(SEO-015/SEO-023 と連動) language-context.tsx LANGUAGE_LABELS.en = 'English (Beta)'。 EnglishBetaBanner コンポーネントもサイト上部に表示。しかし英語版URLは存在せず、Search Console で『英語からの流入』を計測しても 0 のまま。リブランド時に Beta 取り下げの判断が必要。",
    recommendation:
      "(a) /en/ ルート実装で本格対応、 (b) または英語切替 UI 撤去 + 主要ページのみ簡易英語ハブ (/about/en) のみ実装。中途半端な Beta 表記は撤去。",
    status: "resolved",
    resolvedPr: 244,
  },
  {
    id: "SEO-025",
    category: "SEO-H",
    title:
      "言語切替時に URL が変わらず (localStorage 依存) — 共有URL で言語選択が再現できず、UX/SEO ともに不利",
    priority: "P2",
    effortHours: 4,
    url: "全ページ",
    evidence:
      "web/src/contexts/language-context.tsx の setLanguage は localStorage.setItem('language', lang) のみで URL を変更しない。利用者が英語版URLをコピーして共有しても、相手は ja で開く。 Google も URL ベースで言語識別不能。",
    recommendation:
      "Next.js i18n routing 導入で /en/* プレフィックスURL化。または langパラメータ ?lang=en でクエリ識別 + canonical で正規化。",
    status: "TBD",
  },
];

// =====================================================================
// 集計
// =====================================================================

const ALL_FINDINGS: Finding[] = [
  ...FINDINGS_UX_A,
  ...FINDINGS_UX_B,
  ...FINDINGS_UX_C,
  ...FINDINGS_UX_D,
  ...FINDINGS_UX_E,
  ...FINDINGS_UX_F,
  ...FINDINGS_UX_G,
  ...FINDINGS_UX_H,
  ...FINDINGS_SEO_A,
  ...FINDINGS_SEO_B,
  ...FINDINGS_SEO_C,
  ...FINDINGS_SEO_D,
  ...FINDINGS_SEO_E,
  ...FINDINGS_SEO_F,
  ...FINDINGS_SEO_G,
  ...FINDINGS_SEO_H,
];

const CATEGORY_TITLES: Record<string, string> = {
  "UX-A": "主要動線の直感性",
  "UX-B": "検索・発見性",
  "UX-C": "ファーストビュー価値伝達",
  "UX-D": "コンテンツ消費性",
  "UX-E": "操作フィードバック",
  "UX-F": "アクセシビリティ実用度",
  "UX-G": "モバイル特有問題",
  "UX-H": "認知負荷・情報設計",
  "SEO-A": "検索意図と着地ページの整合",
  "SEO-B": "技術SEO基盤",
  "SEO-C": "構造化データ実装",
  "SEO-D": "内部リンク構造",
  "SEO-E": "コンテンツSEO",
  "SEO-F": "コア・ウェブ・バイタル",
  "SEO-G": "クローラビリティ",
  "SEO-H": "多言語SEO",
};

const CATEGORY_ORDER = [
  "UX-A",
  "UX-B",
  "UX-C",
  "UX-D",
  "UX-E",
  "UX-F",
  "UX-G",
  "UX-H",
  "SEO-A",
  "SEO-B",
  "SEO-C",
  "SEO-D",
  "SEO-E",
  "SEO-F",
  "SEO-G",
  "SEO-H",
];

function renderFindingBlock(f: Finding) {
  return (
    <article
      key={f.id}
      id={f.id}
      className="rounded-lg border border-slate-200 bg-white p-4"
      data-finding-id={f.id}
      data-priority={f.priority}
      data-category={f.category}
      data-effort-hours={f.effortHours}
      data-status={f.resolvedPr ? `resolved-pr-${f.resolvedPr}` : f.status}
    >
      <header className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-sm font-bold text-slate-900">{f.id}</span>
        <span
          className={
            "rounded px-2 py-0.5 text-xs font-bold " +
            (f.priority === "P0"
              ? "bg-red-100 text-red-900"
              : f.priority === "P1"
                ? "bg-orange-100 text-orange-900"
                : f.priority === "P2"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-slate-100 text-slate-700")
          }
        >
          {f.priority}
        </span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
          {f.category}
        </span>
        <span className="text-xs text-slate-500">推定工数 {f.effortHours}h</span>
        <span className="text-xs text-slate-500">採否: {f.status}</span>
        {f.resolvedPr ? (
          <a
            href={`https://github.com/kameking-lab/safe-ai-site/pull/${f.resolvedPr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 hover:bg-emerald-200"
          >
            完了 · PR #{f.resolvedPr}
          </a>
        ) : null}
      </header>
      <h3 className="mt-2 text-sm font-bold text-slate-900">{f.title}</h3>
      {f.url ? (
        <p className="mt-1 font-mono text-xs text-slate-600">URL: {f.url}</p>
      ) : null}
      <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-700">
        <span className="font-semibold">根拠: </span>
        {f.evidence}
      </p>
      <p className="mt-2 whitespace-pre-line text-xs leading-6 text-slate-700">
        <span className="font-semibold">解決方針: </span>
        {f.recommendation}
      </p>
    </article>
  );
}

export default function UxSeoAuditPage() {
  const counts = ALL_FINDINGS.reduce(
    (acc, f) => {
      acc.priority[f.priority] = (acc.priority[f.priority] ?? 0) + 1;
      acc.category[f.category] = (acc.category[f.category] ?? 0) + 1;
      acc.totalEffort += f.effortHours;
      return acc;
    },
    {
      priority: {} as Record<string, number>,
      category: {} as Record<string, number>,
      totalEffort: 0,
    },
  );

  return (
    <PageContainer width="narrow" className="space-y-8">
      <div>
        <p
          className="text-xs text-slate-500"
          data-marker="audit-doc-noindex"
          data-audit-id={META.auditId}
        >
          ※ 本ページは社内採否判断用の監査ドキュメントです。noindex / follow 設定、サイトマップ・内部ナビ非掲載。AIエージェントが web_fetch で読むことを想定したプレーン構造。
        </p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          第三者目線 UX + SEO 激辛監査レポート 2026-05-17
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          対象: 安全AIポータル ({" "}
          <span className="font-mono">https://www.anzen-ai-portal.jp/</span> )<br />
          視点: コンサル/労務担当者/人事/SEO担当者の第三者目線、UX 8軸 + SEO 8軸の網羅評価<br />
          ベースHEAD: <span className="font-mono">{META.baseMainSha}</span> ・監査日:{" "}
          {META.auditDate}
          <br />
          スコープ: {META.scope}
        </p>
      </div>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="summary"
      >
        <h2 className="text-base font-bold text-slate-900">サマリ統計</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>
            監査ページ数: 約{META.reviewedPages}ページ (本番URL + ソースコード両面レビュー)
          </li>
          <li>
            viewport: {META.viewports.join(" / ")} の4種別を考慮
          </li>
          <li>
            検索パフォーマンス: 主要キーワード {META.keywords.length} 件で Google検索結果上位想定を比較
          </li>
          <li>
            検出課題件数: 合計{" "}
            {(counts.priority.P0 ?? 0) +
              (counts.priority.P1 ?? 0) +
              (counts.priority.P2 ?? 0) +
              (counts.priority.P3 ?? 0)}{" "}
            件 (UX-001 〜 UX-029 / SEO-001 〜 SEO-025 通し番号)
          </li>
          <li>
            優先度別: P0 {counts.priority.P0 ?? 0}件 / P1 {counts.priority.P1 ?? 0}件 / P2{" "}
            {counts.priority.P2 ?? 0}件 / P3 {counts.priority.P3 ?? 0}件
          </li>
          <li>
            カテゴリ別:{" "}
            {CATEGORY_ORDER.map(
              (c) => `${c}=${counts.category[c] ?? 0}`,
            ).join(" / ")}
          </li>
          <li>合計推定工数: 約{counts.totalEffort}時間</li>
          <li>
            PR #187 監査 49件との重複: 除外済 (本監査は新規 finding のみ)
          </li>
        </ul>
      </section>

      <section
        className="rounded-xl border border-red-200 bg-red-50 p-4"
        data-section="overall-verdict"
      >
        <h2 className="text-base font-bold text-red-900">激辛総評 (PR #187 以降の新規課題)</h2>
        <p className="mt-2 whitespace-pre-line text-xs leading-6 text-red-900">
          {`1) 「メイン3機能 (chatbot / accidents-reports / strategy/plan-generator)」というオーナー戦略がコード実装に降りていない。トップCTA・モバイルボトムナビ・FlagshipNav・Footer のいずれもメイン3機能を最上位に置いておらず、戦略 ⇄ 実装の乖離が最大の歪み (UX-001/002/005, SEO-012)。
2) 「7目玉」と書くのに実装は10機能。FlagshipGrid h2「7つの主要機能」 vs FLAGSHIP_FEATURES.length === 10。第三者には誤情報として映る (UX-004, UX-009)。
3) 多言語化 (English Beta) は client-side i18n のみで Googlebot から英語版が見えず、SEO的に実質ゼロ。同時に sitemap で ja/en/x-default 全URL同一指定により Search Console 不適切判定のリスク。中途半端な多言語化は撤去 or /en プレフィックス本格化の二択 (SEO-004/005/015/023)。
4) Footer に未完成機能 (/api-docs / /qa-knowledge) リンク残存。PR #187 F-002/F-007 で本体は noindex/縮小済だが、リンクからの導線で利用者を未完成ページに送り続けている (UX-028/029, SEO-021)。
5) UX 認知負荷の累積。サイドバー9カテゴリ + FlagshipNav 10項目 + Footer 30+リンクの3層ナビ。NEW/AI/βバッジが8箇所超で「常時NEW」状態。コンサル目線では「機能を盛り過ぎてどれが目玉か分からない」 (UX-003/026)。
6) ラベル不一致が表面化。試験問題機能はナビ「演習問題」/ ページh1「学習用クイズ」/ メタtitle「安全衛生 資格試験 学習用クイズ」の3種類。PR #234 で nav は統一されたがページ本体は未追従 (UX-025)。
7) 検索可視性は限定的。「安衛法 AI チャットボット」「労働災害 業種別 分析 レポート」「年次安全衛生計画 業種 ジェネレーター」「化学物質 リスクアセスメント CREATE-SIMPLE」のいずれの主要クエリでも安全AIポータルは top10 圏外。差別化機能は強力 (業種10種×規模3段階の30テンプレート/ AI チャット/ 業種別レポート) なのに技術SEO/コンテンツSEO/構造化データ実装が追いついていない (SEO-001/002/010/011)。`}
        </p>
      </section>

      <section
        className="rounded-xl border border-sky-200 bg-sky-50 p-4"
        data-section="search-performance"
      >
        <h2 className="text-base font-bold text-sky-900">検索パフォーマンスシミュレーション</h2>
        <p className="mt-2 text-xs leading-6 text-sky-900">
          2026-05-17 時点で WebSearch で確認した主要 {META.keywords.length} キーワードでの Google 検索結果 (top10) のスナップショット。
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-xs leading-6 text-sky-900">
          <li>
            <span className="font-mono">「安衛法 AI チャットボット」</span>: 安全AIポータル不在。 top10 は Botpress
            / Malwarebytes / トレンドマイクロ / 読売新聞ほかの AI チャット汎用記事。 安衛法特化 AI チャットの言及無し。
            『差別化未開拓のブルーオーシャン』だが、当サイトが上位獲得できていない。
          </li>
          <li>
            <span className="font-mono">「労働災害 業種別 分析 レポート」</span>: 安全AIポータル不在。 top10 は
            JISHA / 厚労省 anzeninfo / osh-management.com / 一般財団法人ほかの公的・士業サイト。 当サイトの『5業種自動集計・5,000件超』は強力だが SEO 不在。
          </li>
          <li>
            <span className="font-mono">「年次安全衛生計画 業種 ジェネレーター」</span>: 安全AIポータル不在。 top10 は厚労省/m3career/aemk.or.jp/sangyoui/sbrain.co.jp。当サイトの『業種10種×規模3段階30テンプレ』は差別化要素として大きいが、メタ description のキーワード前置が弱い。
          </li>
          <li>
            <span className="font-mono">「化学物質 リスクアセスメント CREATE-SIMPLE 無料」</span>: 安全AIポータル不在。
            top10 は 厚労省 anzeninfo / 一般財団法人関西環境管理技術センター / 安全教育センター。 CREATE-SIMPLE自体はExcelツールでオンライン化されていないため、Webベースの当サイトは差別化余地が大きい。
          </li>
        </ul>
        <p className="mt-3 text-xs leading-6 text-sky-900">
          競合との差別化評価: 強い差別化資産 (33法令RAG / 5,026事故事例 / 業種30テンプレ / R7.6.1 熱中症コンプライアンス) を持つが、メタ description のキーワード前置・hreflang整合・内部リンク密度の不備で検索意図と当サイトのマッチが弱い。
        </p>
        <p className="mt-3 text-xs leading-6 text-sky-900">
          未カバー領域: (a) 業種ロングテール「製造業 KY 例 5業種」「建設業 安全衛生計画書 無料」、 (b) 法令ピンポイント「安衛則第612条の2 令和7年6月1日施行」、 (c) 資格試験「衛生管理者 第一種 演習問題 無料」、 (d) 化学物質「アセトン 経皮 ばく露 リスク」、 (e) アクセシビリティ「やさしい日本語 安全 マニュアル」。
        </p>
      </section>

      {CATEGORY_ORDER.map((cat) => {
        const items = ALL_FINDINGS.filter((f) => f.category === cat);
        if (items.length === 0) return null;
        return (
          <section
            key={cat}
            id={`category-${cat}`}
            data-category={cat}
            className="space-y-3"
          >
            <h2 className="text-base font-bold text-slate-900">
              カテゴリ {cat}: {CATEGORY_TITLES[cat]} ({items.length}件)
            </h2>
            <div className="space-y-3">{items.map(renderFindingBlock)}</div>
          </section>
        );
      })}

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="adoption-template"
      >
        <h2 className="text-base font-bold text-slate-900">採用/不採用判断テンプレート</h2>
        <p className="mt-1 text-xs text-slate-700">
          形式: <span className="font-mono">&lt;ID&gt; &lt;採否(adopt/defer/reject)&gt; &lt;担当者&gt; &lt;着手予定週&gt; &lt;備考&gt;</span>
        </p>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-xs leading-5 text-slate-800">
{ALL_FINDINGS.map((f) => `${f.id} ?  ?  ?  ?`).join("\n")}
        </pre>
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="meta-references"
      >
        <h2 className="text-base font-bold text-slate-900">参照</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>
            前回監査 (PR #187): {" "}
            <a
              className="text-emerald-700 underline"
              href="/audits/2026-05-16"
            >
              /audits/2026-05-16
            </a>{" "}
            (49件・8カテゴリ A-H、全件処理完了)
          </li>
          <li>
            オーナーレビューダッシュボード:{" "}
            <a
              className="text-emerald-700 underline"
              href="/audits/review-dashboard"
            >
              /audits/review-dashboard
            </a>
          </li>
          <li>
            回帰監査 (PR #177): {" "}
            <a
              className="text-emerald-700 underline"
              href="/audits/2026-05-16"
            >
              regression audit
            </a>
          </li>
        </ul>
      </section>
    </PageContainer>
  );
}
