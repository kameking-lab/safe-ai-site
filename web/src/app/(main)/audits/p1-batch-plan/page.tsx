import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "P1 段階的解消計画 — 激辛監査 2026-05-16",
  description:
    "安全AIポータル 激辛監査(2026-05-16) P1 finding 10件をVercel無料枠制約下で4バッチ×4日に分散して解消するスケジュール計画。",
  robots: { index: false, follow: true },
  alternates: { canonical: null as unknown as string },
};

type BatchFinding = {
  id: string;
  title: string;
  effortHours: number;
  url: string;
  fix: string;
};

type Batch = {
  number: number;
  label: string;
  startDate: string;
  totalHours: number;
  prName: string;
  dependency: string;
  effect: string;
  findings: BatchFinding[];
};

const BATCHES: Batch[] = [
  {
    number: 1,
    label: "表示誤認リスク修正",
    startDate: "2026-05-17",
    totalHours: 9,
    prName: 'fix(exam-quiz): rename "過去問" to "学習用問題" + add source disclaimer',
    dependency: "なし",
    effect:
      "「過去問」誤認リスク(景表法リスク含む)をゼロに近づける。G-001(P0)の観点も同時解消。",
    findings: [
      {
        id: "A-001",
        title: "「過去問クイズ」表示と実装(創作問題)の不一致 — 誤認誘導のおそれ",
        effortHours: 6,
        url: "/exam-quiz, /quiz",
        fix: "UI見出し「過去問クイズ」→「学習用問題」に改称。各カテゴリトップに「公式試験問題の逐語コピーではなく、出題範囲を踏まえた学習用問題」と明示。公表過去問は外部リンクのみに限定。",
      },
      {
        id: "A-002",
        title: "exam-quiz ページに出題ソース注記なし",
        effortHours: 3,
        url: "/exam-quiz",
        fix: "ページ上部に固定インフォバー追加: 「※当サイトの問題は学習用に作成したものであり、実際の試験で出題されたものではありません」",
      },
    ],
  },
  {
    number: 2,
    label: "未稼働ページ 非公開化一括",
    startDate: "2026-05-18",
    totalHours: 7,
    prName: "fix(nav): remove/noindex 4 unfinished pages (lms/api-docs/handover/pricing)",
    dependency: "なし",
    effect: "「未完成な企業プロダクト感」を即時解消。第三者の信頼性スコア向上。",
    findings: [
      {
        id: "F-001",
        title: "/lms — 2026年秋公開予定のウェイトリスト、現状機能なし",
        effortHours: 2,
        url: "/lms",
        fix: "ナビから除外 + noindex。ページ本体は「LMS機能は法人化後にβ提供予定」1行に縮小。",
      },
      {
        id: "F-002",
        title: "/api-docs — 実APIなし、ロードマップのみ",
        effortHours: 2,
        url: "/api-docs",
        fix: "ページ削除(または /admin 配下に移動) + 301リダイレクト設定。",
      },
      {
        id: "F-003",
        title: "/handover — 内部用ページが外部公開",
        effortHours: 1,
        url: "/handover",
        fix: "ページ削除または /admin 配下に移動。ナビから除外 + noindex。",
      },
      {
        id: "F-004",
        title: "/pricing — 「準備中」5プラン構想記載のみ、実装ゼロ",
        effortHours: 2,
        url: "/pricing",
        fix: "ナビから除外 + noindex。ページ本体は「料金は法人化後に提示予定」1行に縮小。",
      },
    ],
  },
  {
    number: 3,
    label: "体裁整合 + DPA整理",
    startDate: "2026-05-19",
    totalHours: 9,
    prName: "fix(branding): clarify personal-project scope + noindex /dpa",
    dependency: "Batch 2 完了推奨(非公開化済みページへの整合)",
    effect:
      "「個人研究プロジェクト」と「企業向けプロダクト」のブランド乖離を解消。法的責任が曖昧なページをすべて撤退。",
    findings: [
      {
        id: "A-005",
        title: "「個人運営の研究プロジェクト」表記と機能(LMS β/Stripe/DPA/API-docs)の体裁不整合",
        effortHours: 6,
        url: "/lms, /dpa, /api-docs, /pricing",
        fix: "フッタ・/about に「現在提供中のサービス / 法人化後に提供予定のサービス」を明確に分離掲載。Batch 2 で非公開化したページへの残存リンクをすべて削除。",
      },
      {
        id: "G-002",
        title: "/dpa — テンプレート未整備状態での公開、法的責任曖昧",
        effortHours: 3,
        url: "/dpa",
        fix: "ナビから除外 + noindex。ページ本体は「DPA等の企業契約は法人化後に提供予定」1行に縮小。",
      },
    ],
  },
  {
    number: 4,
    label: "コンテンツ正確性 + 保険情報更新",
    startDate: "2026-05-20",
    totalHours: 12,
    prName: "fix(content): synthetic-accident badge + insurance roadmap update",
    dependency: "なし(独立。Batch 1/2 完了後推奨)",
    effect: "コンテンツ誠実性(合成データの明示)と法的信頼性(保険ロードマップ)の向上。",
    findings: [
      {
        id: "B-001",
        title:
          "2025年事故事例が「速報統計から導出した代表パターン」=実質創作 — preliminary バッジでは伝わりにくい",
        effortHours: 8,
        url: "/accidents-reports, /accidents",
        fix: "代表パターン事例に専用バッジ「想定例(統計に基づく合成)」を新設(amber系、現行の速報バッジと色分け)。確定値(R07個票)公開後の置換ロードマップを常時表示。",
      },
      {
        id: "G-003",
        title: "賠償責任保険「未加入」を /insurance で明記 — 個人運営の限界",
        effortHours: 4,
        url: "/insurance",
        fix: "「未加入」の透明性を維持しつつ、加入ロードマップを明示(短期:個人PL保険検討、中期:法人化後IT賠償責任保険)。最終更新日フィールドを追加。",
      },
    ],
  },
];

const FINDING_TO_BATCH: Record<string, number> = {
  "A-001": 1,
  "A-002": 1,
  "A-005": 3,
  "B-001": 4,
  "F-001": 2,
  "F-002": 2,
  "F-003": 2,
  "F-004": 2,
  "G-002": 3,
  "G-003": 4,
};

const BATCH_COLORS = ["", "bg-sky-50 border-sky-200", "bg-violet-50 border-violet-200", "bg-emerald-50 border-emerald-200", "bg-amber-50 border-amber-200"];
const BATCH_BADGE_COLORS = ["", "bg-sky-100 text-sky-900", "bg-violet-100 text-violet-900", "bg-emerald-100 text-emerald-900", "bg-amber-100 text-amber-900"];

export default function P1BatchPlanPage() {
  const totalFindings = Object.keys(FINDING_TO_BATCH).length;
  const totalHours = BATCHES.reduce((s, b) => s + b.totalHours, 0);

  return (
    <PageContainer width="narrow" className="space-y-8">
      <div>
        <p className="text-xs text-slate-500" data-marker="plan-doc-noindex">
          ※ 本ページは社内用計画ドキュメントです。noindex 設定、サイトマップ・ナビ非掲載。AIエージェントが web_fetch で読むことを想定したプレーン構造。
        </p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          P1 段階的解消計画 — 激辛監査 2026-05-16
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          監査: <span className="font-mono">audit/harsh-third-party-2026-05-16</span> (PR #187)<br />
          ベースHEAD: <span className="font-mono">3f33771</span> ・計画作成日: 2026-05-16
        </p>
      </div>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="summary"
      >
        <h2 className="text-base font-bold text-slate-900">サマリ</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>
            対象P1 finding: {totalFindings}件
            <span className="ml-2 text-slate-400 text-xs">
              ※監査METAの記載は13件だが実データは{totalFindings}件
            </span>
          </li>
          <li>バッチ数: {BATCHES.length}バッチ / PR数: {BATCHES.length}件</li>
          <li>合計推定工数: {totalHours}h</li>
          <li>完了目標: 2026-05-20(4日間)</li>
          <li>Vercel制約: 1日1 PR = 無料枠内で完結</li>
        </ul>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-1 pr-3 font-semibold text-slate-700">バッチ</th>
                <th className="text-left py-1 pr-3 font-semibold text-slate-700">着手日</th>
                <th className="text-left py-1 pr-3 font-semibold text-slate-700">工数</th>
                <th className="text-left py-1 pr-3 font-semibold text-slate-700">件数</th>
                <th className="text-left py-1 font-semibold text-slate-700">内容</th>
              </tr>
            </thead>
            <tbody>
              {BATCHES.map((b) => (
                <tr key={b.number} className="border-b border-slate-100">
                  <td className="py-1 pr-3">
                    <span className={`rounded px-2 py-0.5 font-bold ${BATCH_BADGE_COLORS[b.number]}`}>
                      Batch {b.number}
                    </span>
                  </td>
                  <td className="py-1 pr-3 font-mono">{b.startDate}</td>
                  <td className="py-1 pr-3">{b.totalHours}h</td>
                  <td className="py-1 pr-3">{b.findings.length}件</td>
                  <td className="py-1">{b.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section data-section="dependency-map" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-bold text-slate-900">依存関係</h2>
        <pre className="mt-2 text-xs leading-6 text-slate-700 whitespace-pre-wrap">
{`[Batch 1] A-001, A-002  ──► Batch 3 の A-005 は Batch 1 の方向性を踏まえる
           (独立: 即時着手可)

[Batch 2] F-001, F-002, F-003, F-004
           (独立: 即時着手可。Batch 1 と並行可)

[Batch 3] A-005, G-002  ──► Batch 2 完了後推奨
           (非公開化済みページへの残存リンク削除を含む)

[Batch 4] B-001, G-003
           (独立。Batch 1/2 完了後推奨)`}
        </pre>
      </section>

      {BATCHES.map((batch) => (
        <section
          key={batch.number}
          id={`batch-${batch.number}`}
          className={`rounded-xl border p-4 space-y-3 ${BATCH_COLORS[batch.number]}`}
          data-batch={batch.number}
        >
          <header>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className={`rounded px-2 py-0.5 text-sm font-bold ${BATCH_BADGE_COLORS[batch.number]}`}>
                Batch {batch.number}
              </span>
              <h2 className="text-base font-bold text-slate-900">{batch.label}</h2>
            </div>
            <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
              <span>着手日: <span className="font-mono">{batch.startDate}</span></span>
              <span>工数: {batch.totalHours}h</span>
              <span>finding: {batch.findings.length}件</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold">依存先: </span>{batch.dependency}
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
                data-batch={batch.number}
              >
                <header className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900">{f.id}</span>
                  <span className="text-xs text-slate-500">{f.effortHours}h</span>
                  <span className="font-mono text-xs text-slate-500">{f.url}</span>
                </header>
                <h3 className="mt-1 text-sm font-semibold text-slate-800">{f.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-700">
                  <span className="font-semibold">修正方針: </span>{f.fix}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded bg-white border border-slate-200 p-2 text-xs text-slate-700">
            <span className="font-semibold">マージ後の効果: </span>{batch.effect}
          </div>
        </section>
      ))}

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="vercel-notes"
      >
        <h2 className="text-base font-bold text-slate-900">Vercel 無料枠メモ</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>ビルドクォータ: 24h/day 制限</li>
          <li>本計画: 1日1 PR = Vercel 余裕あり</li>
          <li>同日に他 Dispatch PR が着手している場合は当日バッチを翌日にずらすこと</li>
          <li>P0 finding(D-001: robots.txt バグ / G-001: 景表法リスク)は本計画外で即時対応</li>
        </ul>
      </section>

      <section
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-section="meta"
      >
        <h2 className="text-base font-bold text-slate-900">メタデータ</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>計画作成日: 2026-05-16</li>
          <li>ベースHEAD: 3f33771 (PR #187)</li>
          <li>関連監査ページ: <span className="font-mono">/audits/2026-05-16</span></li>
          <li>本ドキュメント: <span className="font-mono">/audits/p1-batch-plan</span></li>
          <li>docs: <span className="font-mono">docs/p1-batch-plan-2026-05-16.md</span></li>
          <li>本ページ: noindex / follow / サイトマップ非掲載 / ナビ非掲載</li>
        </ul>
      </section>
    </PageContainer>
  );
}
