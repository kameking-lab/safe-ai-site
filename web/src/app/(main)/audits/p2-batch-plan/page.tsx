import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "P2残26件 段階的解消計画 — 激辛UX/SEO監査 2026-05-17",
  description:
    "安全AIポータル 激辛UX/SEO監査(2026-05-17, PR #235)のP2残26件をPro plan 28日内に消化する6バッチ計画。PR #238で4件処理済後の残余を対象。",
  robots: { index: false, follow: true },
  alternates: { canonical: null as unknown as string },
};

type BatchFinding = {
  id: string;
  category: string;
  title: string;
  effortHours: number;
  effortNote?: string;
  url: string;
  fix: string;
  dependency: string;
};

type BatchStatus = "planned" | "in-progress" | "completed";

type Batch = {
  number: number;
  label: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  prName: string;
  dependency: string;
  effect: string;
  findings: BatchFinding[];
  status: BatchStatus;
  completedPr?: number;
};

const BATCHES: Batch[] = [
  {
    number: 1,
    label: "Text/Label Quick Wins",
    startDate: "2026-05-19",
    endDate: "2026-05-22",
    totalHours: 9,
    prName:
      "fix(ux-p2): label/copy quick wins — brand/badges/stats/labels (UX-010/022/025/026/029, SEO-016)",
    dependency: "なし (即時着手可)",
    effect:
      "サイト内文言の小さなブランド不整合・視認性低下・分類不適切を一括解消。後続バッチで触る前に表面ノイズを除去する。",
    status: "completed",
    completedPr: 246,
    findings: [
      {
        id: "UX-010",
        category: "UX-C",
        title: "英語版ヒーローのブランド表記 ANZEN AI Portal 残存",
        effortHours: 1,
        url: "/ (lang=en)",
        dependency: "なし",
        fix: "new-home-hero.tsx の英語表記を 'Anzen AI Portal (Japan OSH research)' に刷新。alt属性 (PR c6a22bc) 整合性も再確認。",
      },
      {
        id: "UX-022",
        category: "UX-G",
        title: "ホーム統計バー text-[9px] で視認性低",
        effortHours: 1,
        url: "/ (mobile)",
        dependency: "なし",
        fix: "new-home-hero.tsx 統計バーの最小フォントを text-[11px] に統一、viewport <400px では2+1カラムレイアウトに変更、出典は'i'アイコンで開く。",
      },
      {
        id: "UX-025",
        category: "UX-H",
        title: "演習問題機能ラベル3種類 (ナビ/h1/メタtitle)",
        effortHours: 2,
        url: "/exam-quiz",
        dependency: "なし",
        fix: "exam-quiz/page.tsx の PageHeader title と metadata.title を『演習問題（全資格対応）』に統一。description も連動更新。ナビは PR #234 で対応済。",
      },
      {
        id: "UX-026",
        category: "UX-H",
        title: "NEW/AI/βバッジの過剰使用 (常時NEW)",
        effortHours: 2,
        url: "全ページナビ",
        dependency: "なし",
        fix: "app-shell.tsx NAV_CATEGORIES に badgeUntil: 'YYYY-MM-DD' を導入し公開後30日のみNEW表示。AIバッジは chatbot のみに絞り、他の AI 利用機能は別バッジ ('+AI' 等) に切り分け。",
      },
      {
        id: "UX-029",
        category: "UX-H",
        title: "Footer Q&A投稿募集の分類不適切",
        effortHours: 1,
        url: "全ページフッター",
        dependency: "Batch 3 (Footer再編) と先行整合",
        fix: "footer.tsx の Q&A投稿募集を『関連データ』カラムから『プロジェクト』系カラムに移し、ラベルを『Q&A 投稿募集 (準備中)』に変更。投稿数10件未満は /contact 経由のみに格下げも選択肢。",
      },
      {
        id: "SEO-016",
        category: "SEO-E",
        title: "EN_FEATURE_COPY 7件のみ・残3機能日本語fallback",
        effortHours: 2,
        url: "/, /features",
        dependency: "なし",
        fix: "flagship-grid.tsx EN_FEATURE_COPY に (1) education-certification: 'Special Education & Skill Training DB' (2) industries: 'Industry-Specific Safety Portal (10 industries)' (3) work-environment: 'Working Environment Measurement & Classification' を追加。",
      },
    ],
  },
  {
    number: 2,
    label: "Mobile UX & Feedback",
    startDate: "2026-05-23",
    endDate: "2026-05-26",
    totalHours: 9,
    prName:
      "fix(ux-p2): Batch 2 mobile UX + feedback — UX-007/016/021/024",
    dependency: "Batch 1 完了推奨 (バッジ整理後の方が AppShell 編集衝突を回避)",
    effect:
      "モバイル利用者のタップ可達性 (検索/A11y/ナビ) を改善。失敗時の出口UIで離脱率を抑える。",
    status: "completed",
    completedPr: 250,
    findings: [
      {
        id: "UX-007",
        category: "UX-B",
        title: "モバイル『検索』とPC『Ctrl+K』が異なる機能",
        effortHours: 2,
        url: "全ページ",
        dependency: "なし",
        fix: "MobileBottomNav.tsx の search を openCommandPalette via useCommandPalette に統一。/law-search は CommandPalette 内『法令検索』ショートカット行に副次表示。",
      },
      {
        id: "UX-016",
        category: "UX-E",
        title: "AlertGenerator AI生成失敗時のエラー表示が生テキスト・再試行UI無し",
        effortHours: 2,
        url: "/",
        dependency: "なし",
        fix: "home-three-pillars.tsx AlertGenerator フォールバックに『再試行』ボタン + 失敗ヒント (API使用上限/ネットワーク等) + 3回連続失敗時 /contact 誘導 を追加。",
      },
      {
        id: "UX-021",
        category: "UX-F",
        title: "モバイルA11yトグル (ふりがな/やさしい/文字大) がメニュー奥",
        effortHours: 3,
        url: "全ページ (mobile)",
        dependency: "なし",
        fix: "app-shell.tsx モバイルヘッダーに最低限『ふりがな』『文字大』を露出。初回訪問時バナーで『ふりがな/やさしい日本語/文字大の表示モードあり』を案内 (localStorage で再表示抑止)。",
      },
      {
        id: "UX-024",
        category: "UX-G",
        title: "ShareButtons fixed が MobileBottomNav と重なる",
        effortHours: 2,
        url: "全ページ (mobile)",
        dependency: "なし",
        fix: "app-shell.tsx ShareButtons モバイル時に bottom-16 オフセット付与で MobileBottomNav (h-14) と非重畳化。または右上に移動。",
      },
    ],
  },
  {
    number: 3,
    label: "Navigation Restructure + Mental Hub",
    startDate: "2026-05-27",
    endDate: "2026-06-01",
    totalHours: 16,
    prName:
      "refactor(ux-p2): consolidate 3-layer navigation + merge mental-health subhub (UX-003/027)",
    dependency: "Batch 1 / 2 完了 (バッジ・モバイルUI確定後)",
    effect:
      "Hick's Law 観点の選択肢過多を解消、機能発見性向上。サイドバー/Footerの重複ラベル排除。",
    status: "planned",
    findings: [
      {
        id: "UX-003",
        category: "UX-A",
        title: "ナビゲーション3層構造の過剰 (FlagshipNav 10 + Sidebar 9C + Footer 4C)",
        effortHours: 12,
        url: "全ページ",
        dependency: "Batch 1 (バッジ整理)",
        fix: "(a) flagship-nav.tsx を 7→3 (chatbot/accidents-reports/plan-generator)。 (b) app-shell.tsx NAV_CATEGORIES を 9→5 (現場ツール/学習/法令/データ/プロジェクト) に統合。 (c) footer.tsx を 4→3 カラム (主要機能3/関連データ/規約) に整理し重複リンク排除。",
      },
      {
        id: "UX-027",
        category: "UX-H",
        title: "メンタル系3項目並列で差分伝わらず",
        effortHours: 4,
        url: "/diversity, /mental-health, /mental-health-management, /treatment-work-balance",
        dependency: "UX-003 と同PR (NAV_CATEGORIES編集の重複回避)",
        fix: "(a) /mental-health (旧/概念解説) を /mental-health-management (新/実務ハブ) に 301 リダイレクト統合。 (b) サイドバーを『多様な働き方 (diversity/foreign-workers)』『心身の健康 (mental-health-management/treatment-work-balance)』の2サブカテゴリに分割。",
      },
    ],
  },
  {
    number: 4,
    label: "Internal Linking + Structured Data",
    startDate: "2026-06-02",
    endDate: "2026-06-06",
    totalHours: 16,
    prName:
      "feat(seo-p2): internal links + structured data — ItemList/Quiz/about-main3 (UX-008, SEO-010/011/013)",
    dependency: "Batch 3 完了 (ナビIA確定後にリンク先固定が安全)",
    effect:
      "PageRank流通効率改善、ItemList/Quiz Schema でリッチスニペット候補化、E-E-A-T シグナル集中。",
    status: "planned",
    findings: [
      {
        id: "UX-008",
        category: "UX-B",
        title: "ホームトピックカードからメイン3機能への動線欠如",
        effortHours: 3,
        url: "/",
        dependency: "Batch 3 (ナビIA確定)",
        fix: "home-three-pillars.tsx の事故カード CTA を /accidents-reports に変更、法改正カードに『年次計画を作る』セカンダリCTAを追加し /strategy/plan-generator に誘導。",
      },
      {
        id: "SEO-013",
        category: "SEO-D",
        title: "/about → メイン3機能 直接リンク無し (E-E-A-T分散)",
        effortHours: 3,
        url: "/about",
        dependency: "Batch 3 (ナビIA確定)",
        fix: "/about 末尾に『この研究の成果物 (メイン3機能)』カードを設置 → /chatbot, /accidents-reports, /strategy/plan-generator。逆方向も /chatbot footer に『監修: 労働安全衛生コンサルタント (/about)』を恒久表示。",
      },
      {
        id: "SEO-010",
        category: "SEO-C",
        title: "FlagshipGrid ItemList Schema 未実装",
        effortHours: 4,
        url: "/",
        dependency: "UX-003 (FlagshipGrid 構造確定後)",
        fix: "flagship-grid.tsx に ItemList JSON-LD を埋め込み、各 ListItem に name/url/description を持たせ複数 sitelinks 表示を狙う。",
      },
      {
        id: "SEO-011",
        category: "SEO-C",
        title: "/exam-quiz CourseList/Quiz Schema 未実装",
        effortHours: 6,
        url: "/exam-quiz, /exam-quiz/[slug]",
        dependency: "なし",
        fix: "(a) /exam-quiz トップに ItemList of Course Schema、 (b) /exam-quiz/[slug] に Quiz Schema (questions/answers は一部抜粋のみ、全問記載はしない)。",
      },
    ],
  },
  {
    number: 5,
    label: "Sitemap/Tech SEO + Long-tail Content",
    startDate: "2026-06-07",
    endDate: "2026-06-11",
    totalHours: 27,
    prName:
      "feat(seo-p2): sitemap automation + long-tail content (SEO-002/006/008/022)",
    dependency:
      "Batch 4 と並行可だが、SEO-002 はメイン3機能のIA確定 (Batch 3) が前提",
    effect:
      "sitemap鮮度をビルド時自動化、重複コンテンツリスク低減、ロングテール検索意図を3機能の description/本文に注入。",
    status: "planned",
    findings: [
      {
        id: "SEO-006",
        category: "SEO-B",
        title: "sitemap lastModified の鮮度差が極端",
        effortHours: 4,
        url: "/sitemap.xml",
        dependency: "なし",
        fix: "scripts/refresh-sitemap-lastmod.mjs を新設し git log 最終更新日を取得、prebuild フックで sitemap.ts を生成。静的ハードコーディング撤廃。",
      },
      {
        id: "SEO-008",
        category: "SEO-B",
        title: "compare ページ sitemap に5つのクエリ組み合わせURL",
        effortHours: 3,
        url: "/sitemap.xml",
        dependency: "なし",
        fix: "sitemap.ts から compare?industries=... のクエリ付き5URLを除外、/accidents-reports/compare のみ priority=0.5 で sitemap 掲載。クエリ別ページは内部リンクから到達可能に維持。",
      },
      {
        id: "SEO-022",
        category: "SEO-G",
        title: "sitemap-index と sitemap.xml の整合性CI検証なし",
        effortHours: 4,
        url: "/sitemap.xml, /sitemap-index.xml",
        dependency: "SEO-006 完了後 (lastmod 自動生成と整合)",
        fix: "scripts/audit-sitemap-routes.mjs を新設し CI で (a) sitemap URL vs ルーティング (b) robots Disallow vs sitemap loc (c) lastmod が今から1年以内 を検証。Vercel ビルド失敗で回帰検出。",
      },
      {
        id: "SEO-002",
        category: "SEO-A",
        title:
          "ロングテール『〜業 計画書 テンプレート 無料』『〜業 KY例』『熱中症 安衛則612条の2 R7.6.1』未カバー",
        effortHours: 16,
        url: "/strategy/plan-generator, /ky-examples, /heat-illness-prevention",
        dependency: "Batch 3 (メイン3機能IA確定)",
        fix: "(a) /strategy/plan-generator description に『無料・PDF出力可・10業種 (建設業/製造業/運輸業/医療福祉/サービス業/小売業/飲食業/卸売業/倉庫業/事務系)』を明示。 (b) /ky-examples に『無料 KYT 例 建設業 鉄筋 高所作業 ヒヤリハット』等ロングテール H2 追加。 (c) /heat-illness-prevention に『安衛則第612条の2 令和7年6月1日施行』正規語句を最初の段落に挿入。",
      },
    ],
  },
  {
    number: 6,
    label: "CWV + Search Expansion + Chatbot SSR + i18n判断",
    startDate: "2026-06-12",
    endDate: "2026-06-15",
    totalHours: 28,
    prName:
      "perf(seo-p2): CWV + search-expansion + chatbot-SSR + i18n-decision (UX-006/017, SEO-018/020/024/025)",
    dependency:
      "Batch 5 と並行可。SEO-024/025 は P1 の SEO-015/023 と同一判断軸 (撤去推奨)",
    effect:
      "LCP/INP 改善、Ctrl+K サイト横断検索強化、Chatbot 初期表示がSEO/A11y両面で改善、多言語SEOの一貫したスタンス確定。",
    status: "planned",
    findings: [
      {
        id: "UX-006",
        category: "UX-B",
        title: "Ctrl+K検索インデックスが5カテゴリのみ",
        effortHours: 8,
        url: "全ページ (CommandPalette)",
        dependency: "Batch 3 (新ナビカテゴリ確定後にインデックス整列)",
        fix: "CommandPalette.tsx buildSearchIndex を laws/industries/diversity/heat-illness-prevention/asbestos-management/faq/glossary/ky-examples/education-certification まで拡張。カテゴリ別フィルタも増やす。zero-hit クエリは trackEvent でログ。",
      },
      {
        id: "UX-017",
        category: "UX-E",
        title: "Chatbot SSR時『読み込み中』のみでFCP遅延",
        effortHours: 4,
        url: "/chatbot",
        dependency: "なし",
        fix: "chatbot-panel.tsx の EXAMPLE_QUESTIONS とプレースホルダーを Server Component に分離し SSR 出力。<noscript> 内に静的なサンプル質問リストを併設。",
      },
      {
        id: "SEO-018",
        category: "SEO-F",
        title: "ホームHTML 151KB / JS chunks 24個 (TBT/INP劣化リスク)",
        effortHours: 8,
        url: "/",
        dependency: "Batch 3 (FlagshipGrid 縮約後の bundle 計測が正確)",
        fix: "(a) scripts/lighthouse-monitor.mjs を週次運用 (cron) 化。 (b) JS chunks 20個以下バジェット設定。 (c) AlertGenerator (Gemini呼び出しUI) を 'use client' から動的 import (next/dynamic, ssr:false) に切り替え First Load JS から除外。",
      },
      {
        id: "SEO-020",
        category: "SEO-F",
        title: "HomeThreePillars 全体 'use client' で SSR/CSR シフト",
        effortHours: 4,
        url: "/",
        dependency: "SEO-018 と同PR推奨 (Client Boundary 再設計)",
        fix: "home-three-pillars.tsx の pickLatestFatalAccident / pickRecentLawRevisions / pickWarningWeather を Server Component に分離し props で渡す。AlertGenerator のみ Client Boundary に。FCP 後の CLS 抑制。",
      },
      {
        id: "SEO-024",
        category: "SEO-H",
        title: "『English (Beta)』表記が GSC で英語インプレッション0と矛盾",
        effortHours: 0,
        effortNote:
          "判断のみ。実装は P1 Batch 3 (SEO-015/023撤去) と同期処理されれば工数ゼロ",
        url: "全ページ",
        dependency: "P1 SEO-015/023 の方針確定",
        fix: "LANGUAGE_LABELS.en を 'English (limited)' に格下げ + EnglishBetaBanner 撤去 (P1 撤去案と同方針)。本格対応 (/en/ ルート) は法人化後に繰り越し。",
      },
      {
        id: "SEO-025",
        category: "SEO-H",
        title: "言語切替時URL不変 (localStorage 依存)",
        effortHours: 4,
        url: "全ページ",
        dependency: "SEO-024 確定後",
        fix: "language-context.tsx の setLanguage に ?lang=en クエリを反映、canonical はクエリなし版を指す (重複コンテンツ回避)。本格 /en/ プレフィックスは法人化後の別計画。",
      },
    ],
  },
];

const FINDING_TO_BATCH: Record<string, number> = {
  "UX-010": 1,
  "UX-022": 1,
  "UX-025": 1,
  "UX-026": 1,
  "UX-029": 1,
  "SEO-016": 1,
  "UX-007": 2,
  "UX-016": 2,
  "UX-021": 2,
  "UX-024": 2,
  "UX-003": 3,
  "UX-027": 3,
  "UX-008": 4,
  "SEO-013": 4,
  "SEO-010": 4,
  "SEO-011": 4,
  "SEO-006": 5,
  "SEO-008": 5,
  "SEO-022": 5,
  "SEO-002": 5,
  "UX-006": 6,
  "UX-017": 6,
  "SEO-018": 6,
  "SEO-020": 6,
  "SEO-024": 6,
  "SEO-025": 6,
};

const RESOLVED_BY_PR238: Array<{ id: string; theme: string }> = [
  { id: "UX-004", theme: "7目玉ラベル統一" },
  { id: "UX-009", theme: "7目玉ラベル統一" },
  { id: "UX-013", theme: "BreadcrumbList修正 (SEO-009 と同根)" },
  { id: "SEO-007", theme: "description短縮" },
];

const BATCH_COLORS = [
  "",
  "bg-sky-50 border-sky-200",
  "bg-violet-50 border-violet-200",
  "bg-emerald-50 border-emerald-200",
  "bg-amber-50 border-amber-200",
  "bg-rose-50 border-rose-200",
  "bg-indigo-50 border-indigo-200",
];
const BATCH_BADGE_COLORS = [
  "",
  "bg-sky-100 text-sky-900",
  "bg-violet-100 text-violet-900",
  "bg-emerald-100 text-emerald-900",
  "bg-amber-100 text-amber-900",
  "bg-rose-100 text-rose-900",
  "bg-indigo-100 text-indigo-900",
];

export default function P2BatchPlanPage() {
  const totalFindings = Object.keys(FINDING_TO_BATCH).length;
  const totalHours = BATCHES.reduce((s, b) => s + b.totalHours, 0);

  return (
    <PageContainer width="narrow" className="space-y-8">
      <div>
        <p
          className="text-xs text-slate-500"
          data-marker="plan-doc-noindex"
          data-plan-version="2026-05-19"
        >
          ※ 本ページは社内用計画ドキュメントです。noindex/follow設定、サイトマップ・ナビ非掲載。AIエージェントが web_fetch で読むことを想定したプレーン構造 (data-batch-id / data-finding-id / data-status マーカー付き)。
        </p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          P2残26件 段階的解消計画 — 激辛UX/SEO監査 2026-05-17
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          監査PR: <span className="font-mono">#235</span> / 監査ページ:{" "}
          <span className="font-mono">/audits/2026-05-17-ux-seo</span>
          <br />
          ベースHEAD: <span className="font-mono">fdaa523</span> (PR #242 merged)
          ・計画作成日: 2026-05-19 ・モデル: Opus 4.7
        </p>
      </div>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="background"
      >
        <h2 className="text-base font-bold text-slate-900">経緯と前提</h2>
        <p className="mt-2 text-xs leading-6 text-slate-700">
          監査PR #235 で検出された 54件 (P1=12 / P2=30 / P3=12) のうち、P2=30件 を段階的に解消する計画。
          PR #238 で P0級即時対応として <strong>P2のうち4件が解消済</strong>:
        </p>
        <table className="mt-3 w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-1 pr-3 font-semibold text-slate-700">
                PR #238 解消テーマ
              </th>
              <th className="text-left py-1 font-semibold text-slate-700">
                関連P2 finding
              </th>
            </tr>
          </thead>
          <tbody>
            {RESOLVED_BY_PR238.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-1 pr-3">{r.theme}</td>
                <td className="py-1 font-mono">{r.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs leading-6 text-slate-700">
          → <strong>P2残=26件 / 推定合計工数=105h</strong> を本計画で消化する。
        </p>
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="summary"
      >
        <h2 className="text-base font-bold text-slate-900">サマリ</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>対象P2残finding: {totalFindings}件</li>
          <li>
            バッチ数: {BATCHES.length}バッチ / PR数: {BATCHES.length}件
          </li>
          <li>合計推定工数: {totalHours}h</li>
          <li>計画期間: 2026-05-19 〜 2026-06-15 (28日)</li>
          <li>Pro plan期限: 2026-06-15 (ぴったり)</li>
        </ul>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-1 pr-3 font-semibold text-slate-700">
                  バッチ
                </th>
                <th className="text-left py-1 pr-3 font-semibold text-slate-700">
                  着手日
                </th>
                <th className="text-left py-1 pr-3 font-semibold text-slate-700">
                  完了目標
                </th>
                <th className="text-left py-1 pr-3 font-semibold text-slate-700">
                  工数
                </th>
                <th className="text-left py-1 pr-3 font-semibold text-slate-700">
                  件数
                </th>
                <th className="text-left py-1 font-semibold text-slate-700">
                  内容
                </th>
              </tr>
            </thead>
            <tbody>
              {BATCHES.map((b) => (
                <tr key={b.number} className="border-b border-slate-100">
                  <td className="py-1 pr-3">
                    <span
                      className={`rounded px-2 py-0.5 font-bold ${BATCH_BADGE_COLORS[b.number]}`}
                    >
                      Batch {b.number}
                    </span>
                  </td>
                  <td className="py-1 pr-3 font-mono">{b.startDate}</td>
                  <td className="py-1 pr-3 font-mono">{b.endDate}</td>
                  <td className="py-1 pr-3">{b.totalHours}h</td>
                  <td className="py-1 pr-3">{b.findings.length}件</td>
                  <td className="py-1">{b.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        data-section="dependency-map"
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <h2 className="text-base font-bold text-slate-900">依存関係マップ</h2>
        <pre className="mt-2 text-xs leading-6 text-slate-700 whitespace-pre-wrap">
{`[Batch 1] Text/Label Quick Wins (依存なし、即時着手)
  UX-010 / UX-022 / UX-025 / UX-026 / UX-029 / SEO-016
            │
            ▼
[Batch 2] Mobile UX & Feedback (Batch 1 完了後)
  UX-007 / UX-016 / UX-021 / UX-024
            │
            ▼
[Batch 3] Navigation Restructure + Mental Hub (Batch 1/2 後)
  UX-003 (FlagshipNav 10→3 + Sidebar 9C→5C + Footer 4C→3C)
  UX-027 (mental-health → mental-health-management 統合)
            │
            ▼
[Batch 4] Internal Linking + Structured Data (Batch 3 後)
  UX-008 (ホームカード動線)
  SEO-013 (/about → メイン3機能)
  SEO-010 (FlagshipGrid ItemList Schema)
  SEO-011 (Exam Quiz Schema)
            │
            ▼ (Batch 5/6 は並行可)
[Batch 5] Sitemap/Tech SEO + Long-tail Content
  SEO-006 / SEO-008 / SEO-022 / SEO-002

[Batch 6] CWV + Search + Chatbot SSR + i18n判断
  UX-006 / UX-017 / SEO-018 / SEO-020 / SEO-024 / SEO-025`}
        </pre>
        <div className="mt-3 grid gap-3 text-xs text-slate-700 sm:grid-cols-2">
          <div className="rounded border border-slate-200 bg-white p-2">
            <p className="font-semibold text-slate-900">単独実装可能なfinding</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>UX-010, UX-022, UX-025, UX-026, UX-029, SEO-016 (Batch 1)</li>
              <li>UX-007, UX-016, UX-021, UX-024 (Batch 2)</li>
              <li>SEO-006, SEO-008, SEO-022 (Batch 5の sitemap 系)</li>
              <li>UX-017 (Batch 6 Chatbot SSR は他から独立)</li>
              <li>SEO-018 (CWV) は Batch 3 後の bundle 計測が正確だが独立実装可</li>
            </ul>
          </div>
          <div className="rounded border border-slate-200 bg-white p-2">
            <p className="font-semibold text-slate-900">
              バッチ実装が効率的なfinding群
            </p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>UX-003 + UX-027 → 同一PR (NAV_CATEGORIES編集衝突回避)</li>
              <li>UX-008 + SEO-013 → /about/ホーム同時編集</li>
              <li>SEO-010 + SEO-011 → 構造化データテーマで集約</li>
              <li>SEO-018 + SEO-020 → Client Boundary 再設計でまとめる</li>
              <li>SEO-024 + SEO-025 → i18n方針一括判断</li>
              <li>SEO-006 + SEO-022 → sitemap.ts + scripts/ 同時編集</li>
            </ul>
          </div>
        </div>
      </section>

      {BATCHES.map((batch) => (
        <section
          key={batch.number}
          id={`batch-${batch.number}`}
          className={`rounded-xl border p-4 space-y-3 ${BATCH_COLORS[batch.number]}`}
          data-batch-id={batch.number}
          data-status={
            batch.status === "completed" && batch.completedPr
              ? `completed-pr-${batch.completedPr}`
              : batch.status
          }
        >
          <header>
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className={`rounded px-2 py-0.5 text-sm font-bold ${BATCH_BADGE_COLORS[batch.number]}`}
              >
                Batch {batch.number}
              </span>
              <h2 className="text-base font-bold text-slate-900">
                {batch.label}
              </h2>
              {batch.status === "completed" && batch.completedPr ? (
                <a
                  href={`https://github.com/kameking-lab/safe-ai-site/pull/${batch.completedPr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 hover:bg-emerald-200"
                >
                  完了 · PR #{batch.completedPr}
                </a>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
              <span>
                着手日: <span className="font-mono">{batch.startDate}</span>
              </span>
              <span>
                完了目標: <span className="font-mono">{batch.endDate}</span>
              </span>
              <span>工数: {batch.totalHours}h</span>
              <span>finding: {batch.findings.length}件</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold">依存先: </span>
              {batch.dependency}
            </p>
            <p className="mt-1 text-xs text-slate-600 font-mono bg-white rounded px-2 py-1 border border-slate-200 break-all">
              PR: {batch.prName}
            </p>
          </header>

          <div className="space-y-2">
            {batch.findings.map((f) => (
              <article
                key={f.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
                data-finding-id={f.id}
                data-batch-id={batch.number}
                data-status={
                  batch.status === "completed" && batch.completedPr
                    ? `resolved-pr-${batch.completedPr}`
                    : batch.status
                }
                data-category={f.category}
              >
                <header className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {f.id}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 font-mono">
                    {f.category}
                  </span>
                  <span className="text-xs text-slate-500">
                    {f.effortHours}h
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {f.url}
                  </span>
                </header>
                <h3 className="mt-1 text-sm font-semibold text-slate-800">
                  {f.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-700">
                  <span className="font-semibold">修正方針: </span>
                  {f.fix}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-semibold">依存: </span>
                  {f.dependency}
                </p>
                {f.effortNote ? (
                  <p className="mt-1 text-xs text-amber-700">
                    <span className="font-semibold">工数注記: </span>
                    {f.effortNote}
                  </p>
                ) : null}
              </article>
            ))}
          </div>

          <div className="rounded bg-white border border-slate-200 p-2 text-xs text-slate-700">
            <span className="font-semibold">マージ後の期待効果: </span>
            {batch.effect}
          </div>
        </section>
      ))}

      <section
        className="rounded-xl border border-amber-200 bg-amber-50 p-4"
        data-section="owner-decision"
      >
        <h2 className="text-base font-bold text-slate-900">
          オーナー判断ポイント
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>
            <strong>SEO-024 / SEO-025:</strong> P1計画 (SEO-015/023) で「撤去案」が確定済なら、SEO-024/025 も同方針 (Beta表記撤去 + ?lang=en クエリ識別の簡易対応) で確定。本格対応は法人化後の別計画に繰り越し
          </li>
          <li>
            <strong>UX-003 (ナビ3層削減):</strong> FlagshipNav 10→3 は副次機能 (education-certification / industries / work-environment 等) の発見性低下リスクあり。「主要3 + 副次セクション展開」の二段構造で合意できるか
          </li>
          <li>
            <strong>UX-027 (メンタル系統合):</strong> /mental-health を /mental-health-management に 301 リダイレクト統合する判断。既存被リンクの帰属確認後に実施
          </li>
          <li>
            <strong>SEO-018 (Lighthouse CI週次):</strong> scripts/lighthouse-monitor.mjs の cron 運用は Vercel cron 枠を消費。CRON_SECRET 経由のリモートトリガーで運用するか別途検討
          </li>
        </ul>
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="adoption-template"
      >
        <h2 className="text-base font-bold text-slate-900">
          採用/不採用判断テンプレート
        </h2>
        <pre className="mt-2 text-xs leading-6 text-slate-700 whitespace-pre-wrap font-mono">
{`UX-003  ?  ?  ?  ?  ← ナビ削減方針 (副次機能どう扱うか)
UX-006  ?  ?  ?  ?
UX-007  ?  ?  ?  ?
UX-008  ?  ?  ?  ?
UX-010  ?  ?  ?  ?
UX-016  ?  ?  ?  ?
UX-017  ?  ?  ?  ?
UX-021  ?  ?  ?  ?
UX-022  ?  ?  ?  ?
UX-024  ?  ?  ?  ?
UX-025  ?  ?  ?  ?
UX-026  ?  ?  ?  ?
UX-027  ?  ?  ?  ?  ← /mental-health 301 統合の可否
UX-029  ?  ?  ?  ?
SEO-002 ?  ?  ?  ?
SEO-006 ?  ?  ?  ?
SEO-008 ?  ?  ?  ?
SEO-010 ?  ?  ?  ?
SEO-011 ?  ?  ?  ?
SEO-013 ?  ?  ?  ?
SEO-016 ?  ?  ?  ?
SEO-018 ?  ?  ?  ?  ← Lighthouse CI 週次運用の可否
SEO-020 ?  ?  ?  ?
SEO-022 ?  ?  ?  ?
SEO-024 ?  ?  ?  ?  ← 撤去 / 本格対応 (P1と同期)
SEO-025 ?  ?  ?  ?  ← 撤去 / 本格対応 (P1と同期)`}
        </pre>
        <p className="mt-2 text-xs text-slate-600">
          形式:{" "}
          <span className="font-mono">
            &lt;ID&gt; &lt;採否(adopt/defer/reject)&gt; &lt;担当者&gt;
            &lt;着手予定週&gt; &lt;備考&gt;
          </span>
        </p>
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="meta"
      >
        <h2 className="text-base font-bold text-slate-900">メタデータ</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>計画作成日: 2026-05-19</li>
          <li>計画モデル: Opus 4.7</li>
          <li>計画バージョン: 2026-05-19 (姉妹計画: P1残=docs/p1-batch-plan-2026-05-18.md)</li>
          <li>
            ベースHEAD: <span className="font-mono">fdaa523</span> (PR #242 merged)
          </li>
          <li>
            監査スナップショット:{" "}
            <span className="font-mono">
              docs/audit-snapshot-2026-05-17-ux-seo.md
            </span>
          </li>
          <li>
            計画ドキュメント:{" "}
            <span className="font-mono">docs/p2-batch-plan-2026-05-18.md</span>
          </li>
          <li>
            関連監査ページ:{" "}
            <span className="font-mono">/audits/2026-05-17-ux-seo</span>
          </li>
          <li>
            姉妹計画ページ:{" "}
            <span className="font-mono">/audits/p1-batch-plan</span>
          </li>
          <li>
            本ページ: noindex / follow / サイトマップ非掲載 / ナビ非掲載 / AI WebFetch可
          </li>
        </ul>
      </section>
    </PageContainer>
  );
}
