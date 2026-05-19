import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "安全AIポータル 現況詳細レポート 2026-05-19 — メイン3機能・SEO・残タスク全棚卸し",
  description:
    "2026-05-19時点の安全AIポータル（anzen-ai-portal.jp）現況報告。/chatbot・/accidents-reports・/strategy/plan-generator の3機能実装詳細、SEO実測、P2/P3残16+10件、回帰監査F-001〜F-011を網羅。外部読者が本URLだけで状況把握できる粒度。",
  alternates: {
    canonical: "https://www.anzen-ai-portal.jp/audits/site-status-2026-05-19",
  },
  openGraph: {
    title: "安全AIポータル 現況詳細レポート 2026-05-19",
    description:
      "メイン3機能（chatbot/accidents-reports/plan-generator）・SEO実測・残タスクP2/P3・回帰監査11件の全棚卸し。個人運営研究プロジェクト。",
    url: "https://www.anzen-ai-portal.jp/audits/site-status-2026-05-19",
    type: "article",
    publishedTime: "2026-05-19T00:00:00Z",
  },
  robots: { index: true, follow: true },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "Report",
  name: "安全AIポータル 現況詳細レポート 2026-05-19",
  description:
    "安全AIポータル（anzen-ai-portal.jp）の2026-05-19時点における実装現況・SEO実測・残タスクの全棚卸しレポート。メイン3機能（/chatbot・/accidents-reports・/strategy/plan-generator）を中心に詳細を記録。",
  datePublished: "2026-05-19",
  author: {
    "@type": "Organization",
    name: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/about",
  },
  url: "https://www.anzen-ai-portal.jp/audits/site-status-2026-05-19",
  inLanguage: "ja",
  about: [
    { "@type": "Thing", name: "労働安全衛生AIチャットボット" },
    { "@type": "Thing", name: "業種別労働災害分析レポート" },
    { "@type": "Thing", name: "年次安全衛生計画ジェネレーター" },
  ],
};

type Stat = { label: string; value: string };
type Finding = { id: string; priority: "P1" | "P2" | "P3"; title: string; status: "open" | "noted" };

const STATS: Stat[] = [
  { label: "調査日", value: "2026-05-19" },
  { label: "HEAD", value: "ab55d44" },
  { label: "最終PR", value: "#250" },
  { label: "P2残タスク", value: "16件" },
  { label: "P3残タスク", value: "10件" },
  { label: "回帰監査", value: "11件" },
];

const FINDINGS: Finding[] = [
  { id: "F-001", priority: "P1", title: "未来日付の事故レコード mhlw-2026-001 (occurredOn: 2026-07-08)", status: "open" },
  { id: "F-002", priority: "P1", title: "ハードコード認証鍵 /api/admin/health/route.ts:6", status: "open" },
  { id: "F-003", priority: "P2", title: "ANZEN AI Portal 残存 6箇所（OG/PDF/about/features/circulars/JSON-LD）", status: "open" },
  { id: "F-004", priority: "P2", title: "Gemini API 6ルートに Circuit Breaker 未適用", status: "open" },
  { id: "F-005", priority: "P2", title: "動的AIルート 10本に CDNキャッシュなし（Vercel quota消費増）", status: "open" },
  { id: "F-006", priority: "P3", title: "real-accident-cases-2025-preliminary.ts に2026年分が混在", status: "noted" },
  { id: "F-007", priority: "P3", title: "/admin/ugc/review に認証ゲート無し", status: "noted" },
  { id: "F-008", priority: "P3", title: "/quiz route metadata title 表記混在", status: "noted" },
  { id: "F-009", priority: "P3", title: "PR #238 commit message 誤記（削除≠noindex化）", status: "noted" },
  { id: "F-010", priority: "P3", title: "curated-2026-002 の confidence 文書化不足", status: "noted" },
  { id: "F-011", priority: "P3", title: "/admin/newsletter SSRガード未確認", status: "noted" },
];

function priorityBadge(p: Finding["priority"]) {
  const cls =
    p === "P1"
      ? "bg-red-100 text-red-800 border-red-300"
      : p === "P2"
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : "bg-slate-100 text-slate-700 border-slate-300";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      {p}
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-4" data-section={id}>
      <h2 id={`${id}-heading`} className="border-b border-slate-200 pb-2 text-xl font-bold text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className="space-y-3" data-subsection={id}>
      <h3 id={`${id}-heading`} className="text-base font-bold text-slate-800">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-3 text-sm leading-7 text-slate-700">{children}</div>;
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <dt className="w-28 shrink-0 font-semibold text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

export default function SiteStatusReport20260519() {
  return (
    <PageContainer width="narrow" className="space-y-12 py-10">
      <JsonLd schema={schema} />

      {/* Header */}
      <header className="space-y-4" data-section="header">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Site Status Snapshot
        </p>
        <h1 className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl" data-h1>
          安全AIポータル 現況詳細レポート 2026-05-19
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          本レポートは個人運営研究プロジェクト「安全AIポータル」（<a href="https://www.anzen-ai-portal.jp" className="underline">anzen-ai-portal.jp</a>）の2026-05-19時点の現況を棚卸ししたものです。
          メイン3機能（/chatbot・/accidents-reports・/strategy/plan-generator）の実装詳細、SEO実測データ、残タスク（P2/P3/回帰監査）を網羅し、
          外部の読者が本URLだけで状況を完全に把握できる粒度で記述しています。判断・優先順位付け・打ち手提案は含みません。
        </p>
        <dl className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <dt className="text-[10px] font-semibold text-slate-500">{s.label}</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-900">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-slate-500">
          生データ: <a href="https://github.com/kameking-lab/safe-ai-site/blob/main/docs/site-status-2026-05-19/seo-raw.json" className="underline">docs/site-status-2026-05-19/seo-raw.json</a>
        </p>
      </header>

      {/* Section 1: Summary */}
      <Section id="summary" title="1. サマリー">
        <Prose>
          <p>
            PR #250（fix(ux-p2): Batch 2 mobile UX）をmainにマージ済み、HEAD=ab55d44。Vercel Proプラン稼働中（〜2026-06-15）。
            2週間前の激辛UX/SEO監査（PR #235、54件）に対してP1全件・P2 Batches 1-2が完了した（PR #241〜#250）。
            メイン3機能にはCopilot SafetyContextによる業種・関心事項の3機能間引き継ぎが実装された（PR #245）。
          </p>
          <p>
            残課題はP2残16件（Batches 3-6、87h）・P3残10件（4バッチ、22h）・回帰監査11件（F-001〜F-011）。
            Vercel Proプラン期限（2026-06-15）内に消化する計画が
            <a href="/audits/p2-batch-plan" className="underline">P2バッチ計画ページ</a>と
            <a href="/audits/p3-batch-plan" className="underline">P3バッチ計画ページ</a>に公開されている。
            セキュリティ上の緊急事項としてF-002（ハードコード認証鍵 /api/admin/health）が未処置のまま残っている。
          </p>
        </Prose>
      </Section>

      {/* Section 2: Main 3 Features */}
      <Section id="main-features" title="2. メイン3機能の現況">

        <SubSection id="chatbot" title="2.1 /chatbot — 安衛法AIチャットボット">
          <Prose>
            <p>
              <strong>実装ファイル:</strong>
              ルートは <code>chatbot/page.tsx</code>（メタデータ・JSON-LD）と <code>ChatbotBody.tsx</code>（UIレイアウト・Copilot埋め込み）。
              チャットUIの中核は <code>src/components/chatbot-panel.tsx</code>（会話履歴管理、localStorage永続化、音声完結モード、法令カテゴリフィルタ、ダウンロード・共有機能、最大15セッション管理）。
              APIエンドポイントは <code>src/app/api/chatbot/route.ts</code>（Gemini 2.5 Flash、RAG検索、信頼度判定high/medium/low、ハルシネーション抑制、直近8ターン履歴）。
              RAG周辺として <code>src/lib/rag-search.ts</code>（BM25スコアリング、クエリ拡張、同義語展開）・<code>src/lib/chatbot-enrichment.ts</code>（出典構造化、関連法令自動サジェスト、深掘りリンク）・<code>src/lib/notice-search.ts</code>（厚労省通達検索）が存在する。
            </p>
            <p>
              <strong>RAG索引データ件数:</strong>
              法令50法令体制（<code>src/data/laws/*.ts</code>、推計5,000〜10,000条文）。
              通達・告示・指針は <code>src/data/mhlw-notices.ts</code> 経由で1,069件（bindingLevel別3区分、19カテゴリ）。
              個別詳細事故ケースは <code>src/data/mock/real-accident-cases*.ts</code> 合計7ファイルで292件。
              化学物質は <code>src/data/chemicals-mhlw/compact.json</code> で1,046件以上（仕様値）。
              業種別集計統計は <code>src/data/aggregates-mhlw/industry-profiles.json</code> で504,413件。
            </p>
            <p>
              <strong>SafetyContext連携と他機能動線:</strong>
              SafetyContextは industry・scale・keyConcerns（最大5件）・recentQueries（最大10件）・activePlan・progress（3機能訪問フラグ）を localStorage <code>safety-context-v1</code> に永続化。
              /accidents-reports への動線は <code>chatbot-panel.tsx:L847-856</code> で業種コンテキスト検出時に <code>/accidents-reports/{"{industry}"}</code> へのリンクを動的生成。
              /strategy/plan-generator への動線は <code>chatbot-panel.tsx:L857-870</code> で <code>?industry=&amp;focus=</code> 付きURLを生成。
              CopilotNextStepsパネルは <code>ChatbotBody.tsx:L166-169</code> に埋め込み。
            </p>
            <p>
              <strong>既知の弱点:</strong>
              レスポンスキャッシュが存在せず同一クエリでも毎回Gemini API呼び出し（F-005関連）。
              Gemini APIルート6本にCircuit Breaker未適用（F-004）。
              直近8ターンのみ送信で長期会話の文脈喪失リスク。
              SSR時の初期表示が「読み込み中」のみでFCP遅延（UX-017、P2 Batch 6対応予定）。
              共有URLのTTLなし（Base64永続）。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="accidents-reports" title="2.2 /accidents-reports — 業種別労働災害分析">
          <Prose>
            <p>
              <strong>実装ファイル:</strong>
              ページは3点（ハブ page.tsx 336行・動的業種別 [industry]/page.tsx 163行・比較 compare/page.tsx 173行）。
              コンポーネントは <code>src/components/accidents-reports/</code> 以下8ファイル（industry-report-view.tsx 約850行が中核、comparison-view.tsx 約700行）。
              ライブラリは <code>src/lib/accident-analysis.ts</code>（約1050行）・<code>src/lib/accident-comparison.ts</code>（約600行）。
            </p>
            <p>
              <strong>5業種ランディングページ:</strong>
              建設業（/accidents-reports/construction、66,713件）・
              製造業（/accidents-reports/manufacturing、115,601件、最多）・
              運輸業（/accidents-reports/transport、66,650件）・
              医療・福祉（/accidents-reports/healthcare、22,707件）・
              サービス業（/accidents-reports/service、34,436件）。
              各ページのh2構成は「事故型ランキング」「原因Top10」「月別季節性」「年次推移」「業種特有パターン」「推奨対策チェックリスト」「関連法令」。
              JSON-LDはwebPage/breadcrumb/datasetの3層。ISR revalidate=86400（24時間）。
            </p>
            <p>
              <strong>データ規模:</strong>
              集計統計（industry-profiles.json、2026-04-18生成）で504,413件（25業種）を格納、うち5業種合計306,107件。
              個別詳細ケース（real-accident-cases*.ts 7ファイル合計）は292件。
              サイト上の「5,000件超」という表記と実データの対応関係がコード上で未明示。
              industry-profiles.json は2026-05-20時点で32日古く、更新トリガー機構がない。
            </p>
            <p>
              <strong>既知の弱点:</strong>
              フリーテキスト検索・事故型フィルタ・月別フィルタが未実装（業種選択のみ）。
              スマートフォン（375px）での5業種並列比較は横スクロール必須。
              compareページのクエリURL4件がsitemapに残存（重複コンテンツリスク、SEO-008）。
              監査コメント（page.tsx:L102-105）「B-001: representative-pattern の免責事項をハブで可視化」が未対応。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="plan-generator" title="2.3 /strategy/plan-generator — 年次安全衛生計画ジェネレーター">
          <Prose>
            <p>
              <strong>実装ファイル:</strong>
              ページは3点（strategy/page.tsx パスワードゲート・plan-generator/page.tsx 入力フォーム・preview/[id]/page.tsx プレビュー出力）。
              コンポーネントは <code>src/components/safety-plan/plan-generator-form.tsx</code>（Copilot prefill対応）・plan-document.tsx・print-button.tsx。
              生成エンジンは <code>src/lib/safety-plan-generator.ts</code>。
              テンプレートデータは <code>src/data/safety-plan-templates/</code>（index.ts + base/*.ts + industries/ 10ファイル）。
            </p>
            <p>
              <strong>30テンプレート:</strong>
              10業種（建設・製造・運輸・医療・サービス・小売・飲食・卸売・倉庫・事務）×3規模（small〜49人 / medium 50-299人 / large 300人以上）の固定組み合わせ。
              テンプレートは5層構造（共通基礎→規模→業種→業種×規模交互作用→カスタム）で重複排除後に生成。
              AIを使用しない完全ルールベース生成。出力はHTML表示とブラウザ印刷経由PDF（window.print()）の2形式。
            </p>
            <p>
              <strong>入力パラメータ:</strong>
              業種（必須）・規模（必須）・年度（必須、2025〜2040）・組織名（任意）・重点取組み（任意、複数選択）・特殊作業（任意）・海外派遣有無（任意）・過重労働優先度（任意）・備考（任意、最大2000文字）の9項目。
              URLパラメータ（?industry=&amp;focus=）からの自動prefill対応。
            </p>
            <p>
              <strong>Copilot連携:</strong>
              plan-generator-form.tsx:L101-161でSafetyContextから業種・規模・重点取組みを自動prefill。
              フォーム送信時に copilot.recordPlan()（L184-191）で計画をコンテキスト記録。
              /accidents-reports への動線は form.tsx:L397-411、/chatbot への動線はL413-421。
            </p>
            <p>
              <strong>既知の弱点:</strong>
              農業・林業・漁業が10業種外で未対応。PDF品質がブラウザ印刷依存。
              notesフィールドが2000文字許容でURLが3000文字超になる可能性あり。
              /strategyルート（親）から/strategy/plan-generatorへの301リダイレクト未実装（UX-014）。
              customGoalsフィールドが型定義にあるがUIに入力欄なし（常に空配列）。
            </p>
          </Prose>
        </SubSection>
      </Section>

      {/* Section 3: SEO */}
      <Section id="seo" title="3. SEO実測データ">
        <Prose>
          <p>
            <strong>sitemap構成:</strong>
            メインは <code>src/app/sitemap.ts</code> で静的169URL＋動的URL（通達1,069件・記事〜50件・保護具〜500-1000件・安全標識〜1500件・疾病ガイド等）を返す。
            推定総URL数は2,800〜3,500件。
            sitemap-index.xmlが親で子sitemapはsitemap.ts・sitemap-articles.xml・sitemap-circulars.xml・sitemap-equipment.xmlの4本。
            未解決課題：compareページのクエリURL4件が残存（SEO-008）、lastModifiedハードコードによる鮮度差（SEO-006）、整合性CI検証なし（SEO-022）。
          </p>
          <p>
            <strong>robots.ts:</strong>
            全クローラー向けDisallowは /admin/, /api/, /auth/, /dev/, /handover, /lms, /api-docs, /dpa の8パターン。
            AIクローラー17種を / でブロック（PR #239実装、Vercel bandwidth/quota保護目的）。
            /audits/ は意図的にDisallow除外（AI WebFetchでの監査ページ参照可能にするため）。
          </p>
          <p>
            <strong>GSC連携:</strong>
            <code>src/lib/stats/search-console-client.ts</code>（219行）にOAuth実装あり（ユーザーOAuth、リフレッシュトークン方式）。
            必要環境変数はGSC_OAUTH_CLIENT_ID / GSC_OAUTH_CLIENT_SECRET / GSC_OAUTH_REFRESH_TOKEN の3点。
            いずれか1つでも未設定時はモックデータ（search-console-mock.ts）にフォールバック。
            本番の実稼働状況はVercel環境変数設定次第で、ローカルからは確認不可。
            稼働時の取得データ：クエリ別TOP30・ページ別TOP30・国別TOP10・デバイス別TOP5。
          </p>
          <p>
            <strong>GA4連携:</strong>
            フロントエンドは <code>src/components/Analytics.tsx</code>（NEXT_PUBLIC_GA_MEASUREMENT_ID制御）でページビュー自動追跡・trackEvent()ユーティリティ。
            バックエンドAPI取得は <code>src/lib/stats/ga4-client.ts</code>（サービスアカウントJSON認証、GA4_PROPERTY_ID + GOOGLE_APPLICATION_CREDENTIALS_JSON）。
            未設定時はモックデータ返却。稼働時の取得データ：DAU/MAU/PV/平均セッション時間/直帰率/ページ別TOP10/流入元TOP10。
          </p>
          <p>
            <strong>構造化データ:</strong>
            <code>src/components/json-ld.tsx</code> にOrganization/WebSite/WebPage/BreadcrumbList/QAPage/WebApplication/NewsArticle/Dataset/FAQPage等のスキーマファクトリが集約。
            コードベース全体で125ファイルがJSON-LDを使用。
            メイン3機能はCOPILOT_FEATURE_PEERSとして相互参照（mentionsフィールド）。
            FlagshipGrid ItemList Schema（SEO-010）と/exam-quiz CourseList/Quiz Schema（SEO-011）はP2 Batch 4で実装予定、現時点未実装。
          </p>
          <p>
            <strong>主要ページメタデータ（コード調査）:</strong>
            /chatbot「安衛法AIチャットボット｜33法令以上を根拠条文付きで即答（無料）」・
            /accidents-reports「労働災害 業種別 分析レポート｜5業種5,000件超の自動集計（無料）」・
            /strategy/plan-generator「年次安全衛生計画 業種別 ジェネレーター｜10業種×3規模・無料・PDF」。
            titleのサイトタグ付与パターン（｜安全AIポータル）は全ページ共通。
          </p>
        </Prose>
      </Section>

      {/* Section 4: Gaps */}
      <Section id="gaps" title="4. ギャップと課題の機械判定">
        <Prose>
          <p>
            コード規模に対してアクセスが少ない可能性のある機能として/strategy/plan-generatorが挙げられる。
            /strategyルートへのアクセス時にパスワードゲートが表示されるが/strategy/plan-generatorへの301リダイレクトが未実装で、URLを直打ちしないと到達できない（UX-014）。
            sitemapのlastModified（2026-05-16）は比較的新しいが、/chatbot（2026-04-01）はPR #245による大幅改修（2026-05-18）より48日古い。
          </p>
          <p>
            内部リンク観点では/aboutからメイン3機能への直接リンクが未実装（SEO-013）、ホームトピックカードから/accidents-reports・/strategy/plan-generatorへの動線が欠如（UX-008）。これらはP2 Batch 4での対応予定。
          </p>
          <p>
            compareページのクエリURL4件がsitemap掲載で重複コンテンツリスク（SEO-008、P2 Batch 5で修正予定）。
            FlagshipGrid ItemList Schema・/exam-quiz CourseList/Quiz Schemaが未実装でリッチスニペット候補化が遅れている（SEO-010/011、P2 Batch 4で対応予定）。
            ホームHTML 151KB・JS 24chunksはCWVのTBT/INP悪化リスク（SEO-018、P2 Batch 6対応予定）。
            h1「現場の安全を、AIで変える。」が検索意図ワードと不一致（SEO-003、P3 Batch 1対応予定）。
          </p>
        </Prose>
      </Section>

      {/* Section 5: Remaining Tasks */}
      <Section id="remaining-tasks" title="5. 残タスク全可視化">

        <SubSection id="p2-remaining" title="5.1 P2残16件 (Batches 3-6)">
          <Prose>
            <p>
              計画ページ: <a href="/audits/p2-batch-plan" className="underline">/audits/p2-batch-plan</a>。
              Batch 1（PR #246）・Batch 2（PR #250）完了。残16件87h。
            </p>
            <p>
              <strong>Batch 3「Navigation Restructure + Mental Hub」</strong>（2026-05-27〜06-01、16h、計画中）：
              UX-003（12h）FlagshipNav 10→3削減・NAV_CATEGORIES 9→5統合・Footer 4→3列整理。
              UX-027（4h）/mental-health→/mental-health-management 301統合。
            </p>
            <p>
              <strong>Batch 4「Internal Linking + Structured Data」</strong>（2026-06-02〜06、16h、計画中）：
              UX-008（3h）ホームトピックカードからメイン3機能への動線追加。
              SEO-013（3h）/aboutからメイン3機能への直接リンク追加。
              SEO-010（4h）FlagshipGrid ItemList Schema実装。
              SEO-011（6h）/exam-quiz CourseList/Quiz Schema実装。
            </p>
            <p>
              <strong>Batch 5「Sitemap/Tech SEO + Long-tail Content」</strong>（2026-06-07〜11、27h、計画中）：
              SEO-006（4h）sitemap lastModifiedのgit log自動取得スクリプト化。
              SEO-008（3h）compareクエリURL4件をsitemapから除外。
              SEO-022（4h）sitemap整合性CI検証スクリプト新設。
              SEO-002（16h）ロングテールキーワード（「〜業 計画書 テンプレート 無料」「熱中症 安衛則612条の2 R7.6.1」等）のdescription/h2への挿入。
            </p>
            <p>
              <strong>Batch 6「CWV + Search Expansion + Chatbot SSR + i18n」</strong>（2026-06-12〜15、28h、計画中）：
              UX-006（8h）CommandPalette検索インデックスの全カテゴリ拡張。
              UX-017（4h）chatbot SSR時の「読み込み中」FCP遅延解消（Server Component分離）。
              SEO-018（8h）ホームHTML 151KB/JS 24chunks削減。
              SEO-020（4h）HomeThreePillarsのServer Component分離。
              SEO-024/025（4h）英語表記i18n統一判断。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="p3-remaining" title="5.2 P3残10件 (Batches 1-4)">
          <Prose>
            <p>
              計画ページ: <a href="/audits/p3-batch-plan" className="underline">/audits/p3-batch-plan</a>。
              先行解消2件済（UX-020/SEO-019）。残10件22h。
            </p>
            <p>
              <strong>Batch 1「Copy &amp; CLS Quick Wins」</strong>（2026-05-21〜23、5h、計画中）：
              UX-011（1h）メインCTA「安衛法AIに質問」→「労働安全衛生法をAIに質問」に変更。
              UX-019（1h）屋外モードトグルをPC topbar集約。
              SEO-003（1h）h1→「労働安全衛生のAI・DX活用ポータル」変更。
              UX-018（2h）統計バーCLSリスク解消。
            </p>
            <p>
              <strong>Batch 2「Footer Restructure」</strong>（2026-05-28〜30、6h、計画中）：
              UX-015（2h）Footerの機能vs データ再分類。SEO-014（4h）アンカーテキストのロングテール置換。
            </p>
            <p>
              <strong>Batch 3「Alert Consolidation &amp; Strategy Hub」</strong>（2026-06-04〜06、5h、計画中）：
              UX-012（2h）HomeThreePillarsの3カードAlertGeneratorを1つに統合。
              UX-014（3h）/strategyを/strategy/plan-generatorに301リダイレクト（vercel.json）。
            </p>
            <p>
              <strong>Batch 4「Navigation Breakpoint &amp; Thin Content」</strong>（2026-06-10〜12、6h、計画中）：
              UX-023（3h）Sidebarをlg以上からmd以上表示に変更。SEO-017（3h）thin contentのh2/description整理。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="regression-findings" title="5.3 回帰監査 11件 (F-001〜F-011)">
          <p className="text-sm text-slate-600 mb-3">
            対象期間2026-05-05〜05-19（14日間）・対象PR 173件の横断監査（<a href="/audits/post-2week-regression" className="underline">PR #249</a>）で検出。
          </p>
          <ul className="space-y-2" data-findings-list>
            {FINDINGS.map((f) => (
              <li
                key={f.id}
                data-finding-id={f.id}
                data-finding-status={f.status}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <code className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-slate-700">{f.id}</code>
                {priorityBadge(f.priority)}
                <span className="text-slate-700">{f.title}</span>
              </li>
            ))}
          </ul>
        </SubSection>

        <SubSection id="f001-f002" title="5.4 F-001 / F-002 現状（未処置）">
          <Prose>
            <p>
              <strong>F-001（P1、Data integrity）:</strong>
              <code>src/data/mock/real-accident-cases-2024-2026.ts:143-162</code> の mhlw-2026-001 レコードは
              occurredOn=2026-07-08（本調査日から49日先の未来日付）かつ provenance=&apos;mhlw&apos;（厚労省公式扱い）として掲載中。
              複数の監査ページ（post-2week-regression、2026-05-16、brand-consistency）で言及済み。
              推奨対応は（1）occurredOn を 2025-07-08 に修正、（2）レコード削除、（3）provenance=&apos;scenario&apos; 変更＋disclaimer追加の3択。本ページでは処理しない。
            </p>
            <p>
              <strong>F-002（P1、Security）:</strong>
              <code>src/app/api/admin/health/route.ts:6</code> に
              <code>const VALID_KEY = &apos;anzenai2026&apos;</code> がハードコードされており、GitHubパブリックソースに露出中。
              返却内容はservice statusのみだが内部URL/環境情報の公開リスクあり。
              推奨対応は <code>process.env.STRATEGY_AUTH_PASSWORD ?? &apos;&apos;</code> への置換＋GitHistoryからの消去（BFG）またはSTRATEGY_AUTH_PASSWORDのローテーション。本ページでは処理しない。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="todo-fixme" title="5.5 コード内 TODO/FIXME">
          <p className="text-sm text-slate-700">
            <code>src/</code> 以下の全TypeScript/TSXファイルで明示的なTODO/FIXMEコメントは <strong>0件</strong>（grep調査）。
            未完成事項はF-001〜F-011と各バッチ計画に記録されており、監査ページのJavaScriptデータとして管理されている。
          </p>
        </SubSection>
      </Section>

      {/* Section 6: Systematized Issues */}
      <Section id="issues" title="6. 課題の体系化">

        <SubSection id="feature-issues" title="6.1 メイン機能側の課題">
          <Prose>
            <p>
              <strong>/chatbot:</strong>
              レスポンスキャッシュなしで同一クエリに毎回Gemini API呼び出し（F-005）。
              Gemini APIルート6本にCircuit Breaker未適用（F-004、quota枯渇時に全件失敗リスク）。
              直近8ターンのみ送信で長期会話の文脈喪失。SSR時FCP遅延（UX-017）。共有URLのTTLなし。
            </p>
            <p>
              <strong>/accidents-reports:</strong>
              industry-profiles.json が2026-05-20時点で32日古く更新トリガー機構がない。
              フリーテキスト検索・事故型フィルタ・月別フィルタが未実装。
              スマートフォンでの5業種並列比較は横スクロール必須。
              「5,000件超」という表記と実データ（292件個別ケース/504,413件集計統計）の関係が不明確。
              compareページのsitemapクエリURL残存（重複コンテンツリスク）。
            </p>
            <p>
              <strong>/strategy/plan-generator:</strong>
              農業・林業・漁業・派遣・請負が10業種外で未対応。
              PDF品質がブラウザ印刷依存でサーバー側PDF生成なし。
              URLが最大3000文字超になる可能性あり（notes 2000文字許容）。
              /strategyルートから301リダイレクト未実装（UX-014）。
              Copilot prefillの視覚フィードバックが初回訪問時のみ。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="seo-issues" title="6.2 SEO側の課題">
          <Prose>
            <p>
              sitemap lastModifiedのハードコードにより実際の更新頻度とのクロール優先度乖離（SEO-006、P2 Batch 5対応予定）。
              compareページのクエリURL4件残存（SEO-008）。
              FlagshipGrid ItemList Schema・/exam-quiz CourseList/Quiz Schemaが未実装（SEO-010/011）。
              Footer アンカーテキスト固定で多様性不足（SEO-014）。
              home/footer/meta での機能リスト3〜4箇所ほぼ同文のthin content（SEO-017）。
              ロングテールキーワードが主要ページのdescription/h2に未掲載（SEO-002）。
              ホームHTML 151KB・JS 24chunksのCWVリスク（SEO-018）。
              HomeThreePillarsの全体 &apos;use client&apos;（SEO-020）。
              h1「現場の安全を、AIで変える。」が検索意図ワードと不一致（SEO-003）。
              sitemap整合性CI検証なし（SEO-022）。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="data-issues" title="6.3 データ整合性・コンテンツ品質の課題">
          <Prose>
            <p>
              F-001: 未来日付事故レコード（2026-07-08）が provenance=mhlw として掲載（ブランド毀損・AI引用拡散リスク）。
              F-006: real-accident-cases-2025-preliminary.ts に2026年Q1レコードが混在（年度別メンテ時の検索漏れリスク）。
              F-010: curated-2026-002の編集方針が文書化されていない。
              「5,000件超」という表記と実データ件数の対応関係が不明確。
              サイト上「33法令以上」の記載に対し実装は50法令体制（タイトル/descriptionと実装の乖離）。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="infra-issues" title="6.4 インフラ・運用の課題">
          <Prose>
            <p>
              Vercel Proプランは2026-06-15で期限切れ。P2 Batch 6（2026-06-12〜15）がPro期限ギリギリに設定されており遅延リスクがある。
              F-002（/api/admin/healthのハードコード認証鍵）が未修正でGitHub publicリポジトリに露出中。
              動的AIルート10本のCDNキャッシュ未設定（F-005）によりVercel Functions invocationが蓄積、Hobby降格後の無料枠超過リスクあり。
              Gemini API Circuit Breaker が6本のルートに未適用（F-004、障害時の連鎖影響）。
              週次Lighthouse監視スクリプトが未稼働（P2 Batch 6で実装予定）。
              sitemap整合性CI検証が未実装（SEO-022）。
              STRATEGY_AUTH_PASSWORDのローテーション手順が文書化されていない。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="unexplored" title="6.5 未着手だが重要そうな領域">
          <Prose>
            <p>
              <strong>通知機能:</strong> /notifications ページはsitmapに掲載されているが機能が存在しない。CLAUDE.mdの優先課題に記載。
            </p>
            <p>
              <strong>サブスク課金:</strong> NEXT_PUBLIC_PAID_MODE=false のままでStripe実装は用意されているが稼働していない。Vercel Proのコストを回収する手段がない状態。
            </p>
            <p>
              <strong>KY用紙の完成:</strong> /ky ページは存在するが音声入力・PDF出力が未実装（CLAUDE.mdの優先課題）。
            </p>
            <p>
              <strong>Eラーニング編集機能:</strong> データファイルは充実しているがコンテンツ編集UIが未実装。
            </p>
            <p>
              <strong>法令条文のe-Govリンク:</strong> law-metadata.ts に egovLawId が存在するが全法令でのカバレッジ確認と実リンク化が未完了。
            </p>
            <p>
              <strong>リアルタイム法令更新:</strong> 現状は手動バッチ更新（mhlw-notices.jsonl）で厚労省Webからの自動取り込みは未実装。
            </p>
            <p>
              <strong>チャットボットレスポンスキャッシュ:</strong> 同一クエリへの重複API呼び出しを防ぐインメモリまたはRedisキャッシュが未実装。
            </p>
          </Prose>
        </SubSection>
      </Section>

      {/* Footer note */}
      <footer className="border-t border-slate-200 pt-6">
        <dl className="space-y-1 text-xs">
          <KeyVal label="調査日" value="2026-05-19" />
          <KeyVal label="調査HEAD" value="ab55d44 (origin/main)" />
          <KeyVal label="調査手法" value="静的コード解析（src/ 全ファイル）+ 監査ページデータ読み込み" />
          <KeyVal label="実本番curl" value="本レポートはコード解析ベース。本番curl実測値はseo-raw.jsonに別途記録" />
          <KeyVal label="生データ" value="docs/site-status-2026-05-19/seo-raw.json" />
          <KeyVal label="関連ページ" value="/audits/p2-batch-plan, /audits/p3-batch-plan, /audits/post-2week-regression" />
        </dl>
      </footer>
    </PageContainer>
  );
}
