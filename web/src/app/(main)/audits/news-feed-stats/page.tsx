import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";
import statsJson from "@/data/news-feed/stats.json";

type SimpleCount = {
  approved: number;
  rejected: number;
  total: number;
  approvalRate: number;
};

type DayRow = SimpleCount & { date: string };
type PublisherRow = SimpleCount & { publisher: string };
type CategoryRow = SimpleCount & { category: string };
type AccidentTypeRow = SimpleCount & { type: string };

type Histogram = {
  buckets: string[];
  approved: number[];
  rejected: number[];
};

type Sample = {
  headline: string;
  aiSummary: string;
  publisher: string;
  score: {
    relevance: number;
    copyrightRisk: number;
    misinformationRisk: number;
    duplication: number;
    judgedAt: string;
    model: string;
    rejectionReasons?: string[];
  };
};

type StatsShape = {
  generatedAt: string;
  counts: SimpleCount;
  byDay: DayRow[];
  byPublisher: PublisherRow[];
  byEstimatedWorkCategory: CategoryRow[];
  byEstimatedAccidentType: AccidentTypeRow[];
  scoreHistograms: {
    relevance: Histogram;
    copyrightRisk: Histogram;
    misinformationRisk: Histogram;
    duplication: Histogram;
  };
  rejectionReasonRanks: { reason: string; count: number }[];
  samples: { approved: Sample[]; rejected: Sample[] };
};

const stats = statsJson as StatsShape;

export const metadata: Metadata = {
  title: "News-feed AI judge stats — audit dashboard",
  description:
    "B.2 ニュースフィード自動収集パイプライン (NHK + 厚労省 RSS + Gemini 2.5 Flash 判定) の運用統計。承認率推移・出典別承認率・スコア分布・却下理由分析・サンプル監査。社外検索エンジン非公開 (noindex)。",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null as unknown as string },
};

function formatPercent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

function HistogramRow({
  title,
  hist,
  thresholdLabel,
}: {
  title: string;
  hist: Histogram;
  thresholdLabel: string;
}) {
  const max = Math.max(1, ...hist.approved, ...hist.rejected);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-[10px] text-slate-500">{thresholdLabel}</p>
      </div>
      <div className="mt-2 space-y-1">
        {hist.buckets.map((b, i) => {
          const a = hist.approved[i] ?? 0;
          const r = hist.rejected[i] ?? 0;
          return (
            <div key={b} className="flex items-center gap-2 text-[10px]">
              <span className="w-12 shrink-0 text-right font-mono text-slate-600">
                {b}
              </span>
              <div className="flex h-3 flex-1 overflow-hidden rounded-sm bg-slate-100">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(a / max) * 100}%` }}
                  aria-label={`approved ${a}`}
                />
                <div
                  className="bg-rose-400"
                  style={{ width: `${(r / max) * 100}%` }}
                  aria-label={`rejected ${r}`}
                />
              </div>
              <span className="w-16 shrink-0 font-mono text-slate-700">
                A{a} / R{r}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function NewsFeedStatsPage() {
  const { counts, byDay, byPublisher, byEstimatedAccidentType, byEstimatedWorkCategory, scoreHistograms, rejectionReasonRanks, samples, generatedAt } =
    stats;
  const generatedDate = new Date(generatedAt);

  return (
    <PageContainer>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
          News-feed AI judge — audit dashboard
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
          ニュースフィード自動判定 精度監査ダッシュボード
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          B.2 自動収集パイプライン (NHK + 厚労省 RSS → Gemini 2.5 Flash 判定 → approved/rejected)
          の運用統計。承認率推移、出典別承認率、スコアヒストグラム、却下理由ランキング、
          直近サンプルの目視監査。<strong>本ページは noindex (検索エンジン非公開)</strong> で、
          運用者・コンサルタント本人のみが内部参照する管理用ビューです。
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-3">
          <div>
            <dt className="font-bold text-slate-800">最終集計</dt>
            <dd className="font-mono">
              {generatedDate.toISOString().slice(0, 19).replace("T", " ")}Z
            </dd>
          </div>
          <div>
            <dt className="font-bold text-slate-800">蓄積件数</dt>
            <dd>
              承認 {counts.approved} / 却下 {counts.rejected} / 計 {counts.total}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-slate-800">全期間承認率</dt>
            <dd className="font-mono">{formatPercent(counts.approvalRate)}</dd>
          </div>
        </dl>
      </header>

      <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-bold text-amber-900">⚠ サンプルサイズの注意</h2>
        <p className="mt-1 text-xs leading-5 text-amber-900/90">
          B.2 自動運用は 2026-05-13 開始 (PR #111)。本ダッシュボードのサンプル数は
          まだ統計的に有意な水準に達していない場合があります。とくに分母 10 件未満の
          カテゴリ別承認率はトレンドではなく個別事例として読んでください。
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-bold text-slate-900">日次承認率推移</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-100 text-left text-slate-700">
              <tr>
                <th className="px-3 py-2">日付 (JST)</th>
                <th className="px-3 py-2 text-right">承認</th>
                <th className="px-3 py-2 text-right">却下</th>
                <th className="px-3 py-2 text-right">合計</th>
                <th className="px-3 py-2 text-right">承認率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {byDay.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-center text-slate-500">
                    データなし
                  </td>
                </tr>
              ) : (
                byDay.map((d) => (
                  <tr key={d.date}>
                    <td className="px-3 py-2 font-mono">{d.date}</td>
                    <td className="px-3 py-2 text-right">{d.approved}</td>
                    <td className="px-3 py-2 text-right">{d.rejected}</td>
                    <td className="px-3 py-2 text-right">{d.total}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatPercent(d.approvalRate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">出典別承認率</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-2">出典</th>
                  <th className="px-3 py-2 text-right">A</th>
                  <th className="px-3 py-2 text-right">R</th>
                  <th className="px-3 py-2 text-right">承認率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {byPublisher.map((p) => (
                  <tr key={p.publisher}>
                    <td className="px-3 py-2">{p.publisher}</td>
                    <td className="px-3 py-2 text-right">{p.approved}</td>
                    <td className="px-3 py-2 text-right">{p.rejected}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatPercent(p.approvalRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">却下理由ランキング</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-2">スコア軸</th>
                  <th className="px-3 py-2 text-right">回数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rejectionReasonRanks.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-3 text-center text-slate-500">
                      データなし
                    </td>
                  </tr>
                ) : (
                  rejectionReasonRanks.map((r) => (
                    <tr key={r.reason}>
                      <td className="px-3 py-2 font-mono">{r.reason}</td>
                      <td className="px-3 py-2 text-right">{r.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">推定業種分布</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-2">業種</th>
                  <th className="px-3 py-2 text-right">A</th>
                  <th className="px-3 py-2 text-right">R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {byEstimatedWorkCategory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center text-slate-500">
                      データなし
                    </td>
                  </tr>
                ) : (
                  byEstimatedWorkCategory.map((c) => (
                    <tr key={c.category}>
                      <td className="px-3 py-2">{c.category}</td>
                      <td className="px-3 py-2 text-right">{c.approved}</td>
                      <td className="px-3 py-2 text-right">{c.rejected}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">推定事故型分布</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-3 py-2">事故型</th>
                  <th className="px-3 py-2 text-right">A</th>
                  <th className="px-3 py-2 text-right">R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {byEstimatedAccidentType.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center text-slate-500">
                      データなし
                    </td>
                  </tr>
                ) : (
                  byEstimatedAccidentType.map((t) => (
                    <tr key={t.type}>
                      <td className="px-3 py-2">{t.type}</td>
                      <td className="px-3 py-2 text-right">{t.approved}</td>
                      <td className="px-3 py-2 text-right">{t.rejected}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-bold text-slate-900">スコア分布ヒストグラム</h2>
        <p className="mb-3 text-xs text-slate-600">
          A = approved, R = rejected。緑が承認、桃色が却下。
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <HistogramRow
            title="relevance"
            hist={scoreHistograms.relevance}
            thresholdLabel="承認: ≥70 (statistics は ≥60)"
          />
          <HistogramRow
            title="copyrightRisk"
            hist={scoreHistograms.copyrightRisk}
            thresholdLabel="承認: ≤30 (低いほど安全)"
          />
          <HistogramRow
            title="misinformationRisk"
            hist={scoreHistograms.misinformationRisk}
            thresholdLabel="承認: ≤30 (低いほど安全)"
          />
          <HistogramRow
            title="duplication"
            hist={scoreHistograms.duplication}
            thresholdLabel="承認: accident は ≤50 / 行政発表は適用外"
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-bold text-slate-900">直近サンプル (誤判定監査用)</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
              直近 approved 上位 10 件
            </h3>
            <ul className="space-y-2">
              {samples.approved.length === 0 ? (
                <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  データなし
                </li>
              ) : (
                samples.approved.map((s, i) => (
                  <li
                    key={`a-${i}`}
                    className="rounded border border-emerald-200 bg-emerald-50/40 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-slate-900">
                      {s.headline}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      {s.publisher} / R{s.score.relevance} C{s.score.copyrightRisk} M
                      {s.score.misinformationRisk} D{s.score.duplication}
                    </p>
                    {s.aiSummary ? (
                      <p className="mt-1 text-[11px] italic text-slate-700">
                        要約: {s.aiSummary}
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-700">
              直近 rejected 上位 10 件
            </h3>
            <ul className="space-y-2">
              {samples.rejected.length === 0 ? (
                <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  データなし
                </li>
              ) : (
                samples.rejected.map((s, i) => (
                  <li
                    key={`r-${i}`}
                    className="rounded border border-rose-200 bg-rose-50/40 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-slate-900">
                      {s.headline}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      {s.publisher} / R{s.score.relevance} C{s.score.copyrightRisk} M
                      {s.score.misinformationRisk} D{s.score.duplication}
                    </p>
                    {s.score.rejectionReasons && s.score.rejectionReasons.length > 0 ? (
                      <ul className="mt-1 list-disc pl-4 text-[10px] text-rose-800">
                        {s.score.rejectionReasons.map((rr) => (
                          <li key={rr}>{rr}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-bold text-slate-900">2026-05-17 監査での改善 (PR 内詳細)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          <li>
            <strong>newsType 分類追加</strong>: accident_report / administrative_notice /
            statistics_release / general_news を Gemini に判定させ、type 別に閾値を分岐。
          </li>
          <li>
            <strong>duplication の適用範囲を限定</strong>: 行政発表・統計発表に duplication
            は適用しない (上限 100)。第34回石綿認定審査会の誤却下 (D=65) を解消。
          </li>
          <li>
            <strong>ハイブリッド事前フィルタ</strong>: 学校・家庭・観光客等のキーワードで
            AI 呼び出し前に却下 (Gemini クォータ節約 + 早期分類)。
          </li>
          <li>
            <strong>pending バケット追加</strong>: 境界スコア
            (relevance 50-69 / accident で duplication 51-70) は保留に分類。
          </li>
        </ul>
      </section>
    </PageContainer>
  );
}
