import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "P1残7件 段階的解消計画 — 激辛UX/SEO監査 2026-05-17",
  description:
    "安全AIポータル 激辛UX/SEO監査(2026-05-17, PR #235)のP1残7件をPro plan 28日内に消化する3バッチ計画。PR #238で5件処理済後の残余を対象。",
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
  /** PR number that delivered the batch; surfaces in data-status as "completed-pr-<n>" */
  completedPr?: number;
};

const BATCHES: Batch[] = [
  {
    number: 1,
    label: "メイン3機能 戦略一致 (UX系)",
    startDate: "2026-05-19",
    endDate: "2026-05-22",
    totalHours: 8,
    prName:
      "feat(ux): P1 Batch 1 — align main-3-features in hero CTA / mobile bottom nav / footer (UX-001/002/005)",
    dependency: "なし (即時着手可)",
    effect:
      "サイト全体のナビ・CTA・Footerがオーナー戦略「メイン3機能(chatbot/accidents-reports/strategy/plan-generator)」と一致。監査総評の「戦略⇄実装の乖離」を解消。",
    status: "completed",
    completedPr: 241,
    findings: [
      {
        id: "UX-001",
        category: "UX-A",
        title: "メイン3機能がトップ CTA・ヒーロー外、戦略との乖離",
        effortHours: 4,
        url: "/",
        dependency: "なし",
        fix: "ヒーローCTAを3項目に拡張(安衛法AIチャット/業種別事故分析レポート/年次安全衛生計画)。HomeThreePillars事故カードの遷移先を/accidents-reportsに変更。既存/accidentsはセカンダリリンクに格下げ。",
      },
      {
        id: "UX-002",
        category: "UX-A",
        title: "モバイルボトムナビ5項目がメイン3機能と非整合",
        effortHours: 2,
        url: "/ (mobile <480px)",
        dependency: "なし",
        fix: "MobileBottomNav.tsxのITEMSを[home, chatbot, accidents-reports, strategy/plan-generator, account]の5項目構成にリプレイス。検索/KYは2タップ以内で到達できるようホーム最上部に専用ショートカット配置。",
      },
      {
        id: "UX-005",
        category: "UX-A",
        title: "Footer『主要機能』7項目がオーナー戦略メイン3機能と非整合",
        effortHours: 2,
        url: "全ページフッター",
        dependency: "なし",
        fix: "footer.tsxの『主要機能』カラムを上位3項目(chatbot/accidents-reports/strategy/plan-generator)に整理。残り4項目は『ツール』『データ』別カラムに移動。",
      },
    ],
  },
  {
    number: 2,
    label: "メイン3機能 SEO最適化",
    startDate: "2026-05-23",
    endDate: "2026-05-29",
    totalHours: 10,
    prName:
      "feat(seo): /guides hub-and-spoke for SEO-001 four-keyword recovery + main-3-feature internal-link density",
    dependency: "Batch 1 完了 (メイン3機能のIA固定後でないと二度手間)",
    effect:
      "メイン3機能のGoogle検索インプレッション向上の土台(KPI目標: GSC 1ヶ月後にimpressions +50%)。PageRank流通効率改善。SEO-001はPR #242の/guidesハブ&スポーク(Article/HowTo/FAQPage/BreadcrumbList JSON-LD + 30+ロングテール変奏)で根本対応。SEO-012はPR #244で/accidents-reports業種カード→/strategy/plan-generator?industry=、/chatbot→/accidents-reports + /strategy/plan-generatorの相互リンク密度を確立。",
    status: "completed",
    completedPr: 244,
    findings: [
      {
        id: "SEO-001",
        category: "SEO-A",
        title: "主要検索クエリで安全AIポータルがGoogle検索結果トップ10圏外",
        effortHours: 4,
        url: "/chatbot, /accidents-reports, /strategy/plan-generator",
        dependency: "Batch 1 完了推奨",
        fix: "メイン3機能の title/description を主要KW前半に再構成。各ページ冒頭H2にE-E-A-Tシグナル(監修:労働安全衛生コンサルタント・登録番号)を明示。docs/seo-kpi-monitoring-2026-05.md でGSC週次監視を定常化(オプション+2h)。",
      },
      {
        id: "SEO-012",
        category: "SEO-D",
        title: "メイン3機能 相互の内部リンク密度が低い",
        effortHours: 6,
        url: "/chatbot, /accidents-reports, /strategy/plan-generator",
        dependency: "Batch 1 完了",
        fix: "(a)/accidents-reports各業種カードに『この業種の年次計画を作る(/strategy/plan-generator?industry=...)』リンク追加。(b)/strategy/plan-generatorフォーム結果末尾に『生成計画書をAIに質問(/chatbot)』リンク。(c)/chatbotサイドバーに『関連機能:業種別事故レポート/年次計画ジェネレーター』常時表示。",
      },
    ],
  },
  {
    number: 3,
    label: "多言語SEO決着 (撤去案推奨)",
    startDate: "2026-05-30",
    endDate: "2026-06-02",
    totalHours: 4,
    prName:
      "feat(seo): retire broken English UI to stop GSC mixed-signal (SEO-015/023)",
    dependency: "なし (Batch 1/2 と並行可、ただしオーナー戦略判断必要)",
    effect:
      "GoogleSearchConsoleの不適切判定リスク解消。SSR HTMLがlang=jaのみで一貫し、Googlebotの混乱を排除。法人化後に/en/プレフィックスで本格再開を別計画化。PR #244 で撤去案を採用 — LanguageProvider/EnglishBetaBanner/言語切替UIを撤去し、useLanguage/useTranslationフックは互換維持(ja固定返却)。",
    status: "completed",
    completedPr: 244,
    findings: [
      {
        id: "SEO-015",
        category: "SEO-E",
        title: "英語コンテンツがclient-side i18nのみ — Googlebotから英語版が見えず、SEO実質ゼロ",
        effortHours: 2,
        effortNote: "撤去案。本格対応(/en/プレフィックスSSR)は40h+で別計画化",
        url: "全ページ",
        dependency: "SEO-023とセット",
        fix: "撤去案(推奨): EnglishBetaBanner撤去 + LANGUAGE_LABELS.enを'English (limited)'に格下げ + EN_FEATURE_COPYは残しつつGooglebotからはjaのみindex化を明文化。本格対応案(40h)は法人化後に繰り越し。",
      },
      {
        id: "SEO-023",
        category: "SEO-H",
        title: "html lang属性がSSRでは常に'ja' — Googlebot視点で英語版が存在しないと判定",
        effortHours: 2,
        effortNote: "撤去案。本格対応([locale]ルート)は8hで本格化時に対応",
        url: "全ページ",
        dependency: "SEO-015とセット",
        fix: "撤去案(推奨): <html lang='ja'>を固定維持。client-sideの動的applyHtmlLang変更も停止(常にja)。Banner/Toggle撤去でUX矛盾も解消。本格対応案(8h)は/en/ルート実装時に対応。",
      },
    ],
  },
];

const FINDING_TO_BATCH: Record<string, number> = {
  "UX-001": 1,
  "UX-002": 1,
  "UX-005": 1,
  "SEO-001": 2,
  "SEO-012": 2,
  "SEO-015": 3,
  "SEO-023": 3,
};

const BATCH_COLORS = [
  "",
  "bg-sky-50 border-sky-200",
  "bg-violet-50 border-violet-200",
  "bg-emerald-50 border-emerald-200",
];
const BATCH_BADGE_COLORS = [
  "",
  "bg-sky-100 text-sky-900",
  "bg-violet-100 text-violet-900",
  "bg-emerald-100 text-emerald-900",
];

export default function P1BatchPlanPage() {
  const totalFindings = Object.keys(FINDING_TO_BATCH).length;
  const totalHours = BATCHES.reduce((s, b) => s + b.totalHours, 0);

  return (
    <PageContainer width="narrow" className="space-y-8">
      <div>
        <p
          className="text-xs text-slate-500"
          data-marker="plan-doc-noindex"
          data-plan-version="2026-05-18"
        >
          ※ 本ページは社内用計画ドキュメントです。noindex/follow設定、サイトマップ・ナビ非掲載。AIエージェントが web_fetch で読むことを想定したプレーン構造(data-batch-id / data-finding-id / data-status マーカー付き)。
        </p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          P1残7件 段階的解消計画 — 激辛UX/SEO監査 2026-05-17
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          監査PR: <span className="font-mono">#235</span> / 監査ページ:{" "}
          <span className="font-mono">/audits/2026-05-17-ux-seo</span>
          <br />
          ベースHEAD: <span className="font-mono">504cb8d</span>{" "}
          (PR #238 でP0級5件処理後) ・計画作成日: 2026-05-18
        </p>
      </div>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="background"
      >
        <h2 className="text-base font-bold text-slate-900">経緯と前提</h2>
        <p className="mt-2 text-xs leading-6 text-slate-700">
          監査PR #235で検出された 54件 (P1=12 / P2=30 / P3=12) のうち、P0級即時対応として PR #238 で 5件解消済。本計画はP1=12件のうち <strong>5件(UX-028 / SEO-021 / SEO-004 / SEO-005 / SEO-009)処理後の残7件</strong> をPro plan期間28日内に確実に消化するもの。
        </p>
        <table className="mt-3 w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-1 pr-3 font-semibold text-slate-700">
                PR #238 解消テーマ
              </th>
              <th className="text-left py-1 font-semibold text-slate-700">
                関連finding
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-1 pr-3">/api-docs削除</td>
              <td className="py-1 font-mono">UX-028 (P1) + SEO-021 (P1)</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-1 pr-3">hreflang除去</td>
              <td className="py-1 font-mono">SEO-004 (P1) + SEO-005 (P1)</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-1 pr-3">BreadcrumbList修正</td>
              <td className="py-1 font-mono">SEO-009 (P1)</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-1 pr-3">7目玉統一</td>
              <td className="py-1 font-mono">UX-004 (P2) + UX-009 (P2)</td>
            </tr>
            <tr>
              <td className="py-1 pr-3">description短縮</td>
              <td className="py-1 font-mono">SEO-007 (P2)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="summary"
      >
        <h2 className="text-base font-bold text-slate-900">サマリ</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>対象P1残finding: {totalFindings}件</li>
          <li>
            バッチ数: {BATCHES.length}バッチ / PR数: {BATCHES.length}件
          </li>
          <li>合計推定工数: {totalHours}h (撤去案ベース)</li>
          <li>計画完了目標: 2026-06-02 (15日間)</li>
          <li>Pro plan期限: 2026-06-15 (約2週間の余裕)</li>
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
{`[Batch 1] 戦略一致 (UX系)
  UX-001 (トップCTA)        ┐
  UX-002 (モバイルボトムナビ) ├ 並行可・即時着手可 (依存なし)
  UX-005 (Footer)            ┘
            │
            ▼
[Batch 2] SEO最適化
  SEO-001 (title/desc + E-E-A-T)
  SEO-012 (相互内部リンク強化)
    ↑ メイン3機能のIA確定後 = Batch 1 完了が前提
            │
            ▼
[Batch 3] 多言語SEO決着
  SEO-015 ┬ 同一PR (片方だけ修正すると整合性破綻)
  SEO-023 ┘
  独立 (Batch 1/2 と並行可、但しオーナー戦略判断必要)`}
        </pre>
        <div className="mt-3 grid gap-3 text-xs text-slate-700 sm:grid-cols-2">
          <div className="rounded border border-slate-200 bg-white p-2">
            <p className="font-semibold text-slate-900">単独実装可能なfinding</p>
            <p className="mt-1 text-slate-700">
              なし。UX-001/002/005はメイン3機能方針なので同一PR推奨。SEO-015/023はセットでないとlang/Banner不整合。SEO-001/012はBatch 1完了後でないと二度手間。
            </p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-2">
            <p className="font-semibold text-slate-900">
              バッチ実装が効率的なfinding群
            </p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>UX-001 + UX-002 + UX-005 → 同一PR (Batch 1)</li>
              <li>SEO-001 + SEO-012 → 同一PR (Batch 2)</li>
              <li>SEO-015 + SEO-023 → 同一PR (Batch 3)</li>
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
                着手日:{" "}
                <span className="font-mono">{batch.startDate}</span>
              </span>
              <span>
                完了目標:{" "}
                <span className="font-mono">{batch.endDate}</span>
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
            <strong>SEO-015 / SEO-023:</strong>{" "}
            「撤去案 (推奨, 4h)」と「本格対応案 (48h+)」のどちらを採用するか。本格対応は Pro 28日内では他バッチ犠牲必要。法人化後の課題に繰り越すなら撤去案で確定。
          </li>
          <li>
            <strong>Batch 2 KPI監視:</strong>{" "}
            <span className="font-mono">docs/seo-kpi-monitoring-2026-05.md</span>{" "}
            として GSC週次スナップショット保存を運用するか。Yesなら追加2h。
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
{`UX-001  ?  ?  ?  ?
UX-002  ?  ?  ?  ?
UX-005  ?  ?  ?  ?
SEO-001 ?  ?  ?  ?
SEO-012 ?  ?  ?  ?
SEO-015 ?  ?  ?  ?  ← 撤去 / 本格対応 の二択
SEO-023 ?  ?  ?  ?  ← 撤去 / 本格対応 の二択`}
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
          <li>計画作成日: 2026-05-18</li>
          <li>計画バージョン: 2026-05-18 (旧版: 2026-05-16 PR #187)</li>
          <li>
            ベースHEAD:{" "}
            <span className="font-mono">504cb8d</span> (PR #238 後)
          </li>
          <li>
            監査スナップショット:{" "}
            <span className="font-mono">
              docs/audit-snapshot-2026-05-17-ux-seo.md
            </span>
          </li>
          <li>
            計画ドキュメント:{" "}
            <span className="font-mono">docs/p1-batch-plan-2026-05-18.md</span>
          </li>
          <li>
            関連監査ページ:{" "}
            <span className="font-mono">/audits/2026-05-17-ux-seo</span>
          </li>
          <li>
            本ページ: noindex / follow / サイトマップ非掲載 / ナビ非掲載 / AI WebFetch可
          </li>
        </ul>
      </section>
    </PageContainer>
  );
}
