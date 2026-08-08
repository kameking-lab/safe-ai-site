import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import results from "@/data/chatbot-eval-results.json";
import freshResults from "@/data/chatbot-eval-fresh-results.json";
import genqualitySnapshot from "@/data/chatbot-genquality-latest.json";
import { PageJsonLd } from "@/components/page-json-ld";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { ogImageUrl } from "@/lib/og-url";

const SITE = "https://www.anzen-ai-portal.jp";
const _title = "AIチャットボット評価（根拠検索と安全保留）";
const _desc =
  "労働安全衛生AIチャットボットについて、hash検証済み法令本文のRecall@5と、条件不足・誤前提・未収録資料を回答保留できた割合を分けて公開します。法的正答率ではありません。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/about/chatbot-eval" },
  openGraph: withSiteOpenGraph("/about/chatbot-eval", {
    title: _title,
    description: _desc,
    type: "article",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({
    title: _title,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  }),
};

type EvalResult = {
  generated_at: string;
  total: number;
  correct: number;
  accuracy: number;
  retrieval_total?: number;
  retrieval_correct?: number;
  retrieval_accuracy?: number;
  precision5?: number;
  mrr?: number;
  quality_metrics_generated_at?: string;
  safe_hold_total?: number;
  safe_hold_correct?: number;
  safe_hold_rate?: number;
  target: number;
  passed: boolean;
  failures: Array<{
    id: number;
    topic: string;
    question: string;
    expected: string;
    actual: string;
  }>;
  topic_breakdown: Record<string, { total: number; correct: number; accuracy: number }>;
};

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

// 生成回答の限定機械チェック。Recall@5（検索ヒット率）とは別レンズ。
// 実測値は loop-eval-nightly.ps1 が本番へ23問投げて更新する追跡スナップショットから読む。
// スナップショット欠損・破損時は 2026-07-03 のベースライン（19/21 = 90.5%）へ静的フォールバック
// （docs/chatbot-genquality-eval-2026-07-03.md）。
type GenQuality = {
  date: string;
  strictAccuracy: number;
  correct: number;
  partial: number;
  scorable: number;
  usefulRate: number;
  target: number;
  isFallback: boolean;
};

const GENQUALITY_BASELINE: GenQuality = {
  date: "2026-07-03",
  strictAccuracy: 19 / 21,
  correct: 19,
  partial: 1,
  scorable: 21,
  usefulRate: 1,
  target: 0.8,
  isFallback: true,
};

function readNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function loadGenQuality(): GenQuality {
  const raw = genqualitySnapshot as Record<string, unknown>;
  const strictAccuracy = readNumber(raw.strictAccuracy);
  const scorable = readNumber(raw.scorable);
  // 正答率が [0,1] 外・採点母数が非正・欠損なら破綻させずベースラインへ退避。
  if (
    strictAccuracy === undefined ||
    strictAccuracy < 0 ||
    strictAccuracy > 1 ||
    scorable === undefined ||
    scorable <= 0
  ) {
    return GENQUALITY_BASELINE;
  }
  return {
    date: typeof raw.date === "string" ? raw.date : GENQUALITY_BASELINE.date,
    strictAccuracy,
    correct: readNumber(raw.correct) ?? 0,
    partial: readNumber(raw.partial) ?? 0,
    scorable,
    usefulRate: readNumber(raw.usefulRate) ?? GENQUALITY_BASELINE.usefulRate,
    target: readNumber(raw.target) ?? GENQUALITY_BASELINE.target,
    isFallback: false,
  };
}

export default function ChatbotEvalPage() {
  const gq = loadGenQuality();
  const r = results as EvalResult;
  const retrievalTotal = r.retrieval_total ?? r.total;
  const retrievalCorrect = r.retrieval_correct ?? r.correct;
  const retrievalAccuracy = r.retrieval_accuracy ?? r.accuracy;
  const safeHoldTotal = r.safe_hold_total ?? 0;
  const safeHoldCorrect = r.safe_hold_correct ?? 0;
  const sortedTopics = Object.entries(r.topic_breakdown).sort(
    ([, a], [, b]) => b.total - a.total
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <PageJsonLd
        name="AIチャットボット評価（根拠検索と安全保留）"
        description="根拠条文の検索ヒット率と、危険な誤前提等を回答保留できた割合を分離して公開します。"
        path="/about/chatbot-eval"
        breadcrumbs={[
          { name: "ホーム", url: SITE },
          { name: "プロジェクトについて", url: `${SITE}/about` },
          { name: "AIチャット精度評価", url: `${SITE}/about/chatbot-eval` },
        ]}
      />
      <nav aria-label="パンくず" className="mb-4 text-xs text-slate-500">
        <Link href="/about" className="hover:underline">
          研究・実証プロジェクトについて
        </Link>
        <span className="mx-2">/</span>
        <span>AIチャットボット評価</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        AIチャットボット評価：根拠検索と安全保留
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        hash検証済みe-Gov法令本文から期待条文を検索できたかと、条件不足・誤前提・未収録の通達や指針を
        無関係な条文で代用せず回答保留できたかを、別の指標で測定しています。Recall@5は検索上位5件への
        期待条文の着地率であり、生成回答の法的正しさ、現在の個別案件への適用、引用の意味的支持を示す正答率ではありません。
      </p>

      {/* サマリ */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="条文検索ヒット" value={`${retrievalCorrect} / ${retrievalTotal}`} accent />
        <Stat label="Recall@5" value={formatPct(retrievalAccuracy)} accent />
        <Stat
          label="Precision@5"
          value={r.precision5 === undefined ? "未計測" : formatPct(r.precision5)}
        />
        <Stat
          label="MRR"
          value={r.mrr === undefined ? "未計測" : r.mrr.toFixed(3)}
        />
        <Stat
          label="安全保留"
          value={`${safeHoldCorrect} / ${safeHoldTotal}`}
          accent={safeHoldTotal > 0 && safeHoldCorrect === safeHoldTotal}
        />
        <Stat
          label="検索到達ゲート"
          value={
            r.passed ? (
              <><CheckCircle2 className="mr-1 inline h-5 w-5 align-[-3px] text-emerald-600" aria-hidden="true" />到達</>
            ) : (
              <><XCircle className="mr-1 inline h-5 w-5 align-[-3px] text-rose-600" aria-hidden="true" />未到達</>
            )
          }
          accent={r.passed}
        />
      </section>
      <p className="mt-3 text-xs text-slate-500">
        ※ 総ケース数は {r.total} 件（条文検索 {retrievalTotal} 件、安全保留 {safeHoldTotal} 件）です。
        Precision@5は上位5候補の純度、MRRは最初の期待根拠が現れる順位を示します。
        「検索到達ゲート」はRecallと安全保留だけの限定判定であり、低いPrecisionを打ち消す総合PASSではありません。
        生成回答は下記の自作・限定的な機械チェックで別途確認していますが、意味的正確性の評価ではありません。<br />
        最終評価: {formatDate(r.generated_at)} ／ ソース:{" "}
        <code className="rounded bg-slate-100 px-1">src/lib/rag-100q.fixture.ts</code>
        ／ 実行コマンド:{" "}
        <code className="rounded bg-slate-100 px-1">npm run eval:chatbot</code>
        {r.quality_metrics_generated_at ? (
          <> ／ 純度・順位指標: {formatDate(r.quality_metrics_generated_at)}</>
        ) : null}
      </p>

      {/* 生成回答の限定機械チェック */}
      <GenQualitySection g={gq} />

      {/* トピック別 */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">トピック別 Recall@5</h2>
        <p className="mt-1 text-xs text-slate-500">
          法令カテゴリ別に分けた集計。問数の多いトピックから降順表示。Recall@5 = top-5 に gold 条文が 1 件以上含まれた割合。
        </p>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">トピック</th>
                <th className="px-3 py-2 text-right font-semibold">問数</th>
                <th className="px-3 py-2 text-right font-semibold">検索ヒット</th>
                <th className="px-3 py-2 text-right font-semibold">Recall@5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedTopics.map(([topic, t]) => (
                <tr key={topic}>
                  <td className="px-3 py-2 font-medium text-slate-800">{topic}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.total}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.correct}</td>
                  <td
                    className={`px-3 py-2 text-right font-semibold ${
                      t.accuracy >= r.target ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {formatPct(t.accuracy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 失敗ケース */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">未達ケース（{r.failures.length} 件）</h2>
        {r.failures.length === 0 ? (
          <p className="mt-2 text-sm text-emerald-700">
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
            今回の評価対象では、条文検索の失敗と安全保留の見逃しは記録されませんでした。
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {r.failures.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-slate-800"
              >
                <p className="font-semibold">
                  Q{f.id}{" "}
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] text-amber-900">
                    {f.topic}
                  </span>{" "}
                  {f.question}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">期待:</span> {f.expected}
                </p>
                <p className="mt-0.5">
                  <span className="font-semibold">取得:</span> {f.actual}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* fresh セット結果 */}
      <FreshResultsSection r={freshResults as EvalResult} />

      {/* 評価方法 */}
      <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-bold text-slate-900">評価方法・限界</h2>
        <ul className="mt-2 space-y-1 text-xs leading-6 text-slate-700">
          <li>
            ・テストセットは{" "}
            <code className="rounded bg-white px-1">src/lib/rag-100q.fixture.ts</code>{" "}
            に固定。条文検索ケースと、安全上回答を保留すべきケースを分離しています。
          </li>
          <li>
            ・本セクションの評価対象は <strong>RAG 検索の根拠条文ヒット率</strong>。生成回答は上記の限定機械チェックで公開していますが、第三者による正確性評価ではありません。
          </li>
          <li>
            ・単一根拠のケースは期待条文が上位5件に含まれるかを確認し、複数の条文が結論に不可欠なケースは
            <code className="rounded bg-white px-1">requiredAll</code> として全条文の取得を必須にします。
          </li>
          <li>
            ・本ベンチマークは検索段階の代理指標であり、実際の回答精度はモデル生成・プロンプト設計にも依存します。
          </li>
          <li>
            ・評価は CI で自動再走（
            <code className="rounded bg-white px-1">npm test -- rag-100q.test</code>
            ）。本ページは <code className="rounded bg-white px-1">npm run eval:chatbot</code> 実行時に更新される JSON を読み出して描画しています。
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link
            href="/chatbot"
            className="rounded-md border border-blue-200 bg-white px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50"
          >
            チャットボットを試す →
          </Link>
          <Link
            href="/about/data-sources"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            データソース一覧
          </Link>
          <a
            href="https://laws.e-gov.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            e-Gov 法令検索 ↗
          </a>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        accent ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold ${
          accent ? "text-blue-800" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function GenQualitySection({ g }: { g: GenQuality }) {
  return (
    <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold text-slate-900">
          生成回答の自作機械チェック（限定セット）
        </h2>
        <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-900">
          第三者検証なし
        </span>
      </div>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        自作の23問へ回答を生成し、うち採点可能な {g.scorable} 問を限定されたキーワード・引用ルールで照合した結果です。
        <strong>回答の意味的正確性、各主張と引用の対応、実運用での安全性を採点したものではありません。</strong>
        第三者検証・専門家レビューは未実施で、質問や採点網を広げると数値は下がり得ます。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="機械ルール完全一致率" value={formatPct(g.strictAccuracy)} />
        <Stat
          label="全ルール一致数"
          value={`${g.correct} / ${g.scorable}`}
        />
        <Stat label="部分一致" value={`${g.partial} 問`} />
        <Stat label="外部レビュー" value="未実施" />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        測定日: {g.date}
        {g.isFallback ? (
          <>
            （公開ベースライン・スナップショット未配備時のフォールバック）
          </>
        ) : (
          <>（限定セットの夜間自動チェック値）</>
        )}
        {" "}／ 目標値: {formatPct(g.target)}
        {" "}／ 採点器:{" "}
        <code className="rounded bg-slate-100 px-1">chatbot-genquality-scorer</code>
        ／ 実行コマンド:{" "}
        <code className="rounded bg-slate-100 px-1">npm run eval:chatbot-gen</code>
      </p>
      <p className="mt-2 text-xs text-slate-500">
        ※ 「全ルール一致」「部分一致」は自作した機械ルール上の分類です。「正答」「不具合なし」を意味しません。
        未検出の誤結論、条番号誤り、引用の意味的不一致、ハルシネーションが残る可能性があります。
      </p>
    </section>
  );
}

function FreshResultsSection({ r }: { r: EvalResult }) {
  const retrievalTotal = r.retrieval_total ?? r.total;
  const retrievalCorrect = r.retrieval_correct ?? r.correct;
  const retrievalAccuracy = r.retrieval_accuracy ?? r.accuracy;
  const safeHoldTotal = r.safe_hold_total ?? 0;
  const safeHoldCorrect = r.safe_hold_correct ?? 0;
  const sortedTopics = Object.entries(r.topic_breakdown).sort(
    ([, a], [, b]) => b.total - a.total
  );
  return (
    <section className="mt-12 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold text-slate-900">
          fresh セット（第2ベンチマーク）
        </h2>
        <span className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
          言い換えロバストネス
        </span>
      </div>
      <p className="mt-2 text-xs leading-6 text-slate-600">
        既存セットとは別の言い回し・観点で、条文検索と安全保留を合わせて {r.total} ケース確認します。
        Recall@5は法的正答率ではなく、監査済みの期待根拠へ上位5件で到達できた割合です。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="条文検索ヒット" value={`${retrievalCorrect} / ${retrievalTotal}`} accent />
        <Stat label="Recall@5" value={formatPct(retrievalAccuracy)} accent />
        <Stat
          label="Precision@5"
          value={r.precision5 === undefined ? "未計測" : formatPct(r.precision5)}
        />
        <Stat
          label="MRR"
          value={r.mrr === undefined ? "未計測" : r.mrr.toFixed(3)}
        />
        <Stat
          label="安全保留"
          value={`${safeHoldCorrect} / ${safeHoldTotal}`}
          accent={safeHoldTotal > 0 && safeHoldCorrect === safeHoldTotal}
        />
        <Stat
          label="検索到達ゲート"
          value={
            r.passed ? (
              <><CheckCircle2 className="mr-1 inline h-5 w-5 align-[-3px] text-emerald-600" aria-hidden="true" />到達</>
            ) : (
              <><XCircle className="mr-1 inline h-5 w-5 align-[-3px] text-rose-600" aria-hidden="true" />未到達</>
            )
          }
          accent={r.passed}
        />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        最終評価: {formatDate(r.generated_at)} ／ ソース:{" "}
        <code className="rounded bg-slate-100 px-1">test/chatbot-fresh-100.json</code>
        ／ 実行コマンド:{" "}
        <code className="rounded bg-slate-100 px-1">npm test -- rag-100q-fresh</code>
        {r.quality_metrics_generated_at ? (
          <> ／ 純度・順位指標: {formatDate(r.quality_metrics_generated_at)}</>
        ) : null}
      </p>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">トピック</th>
              <th className="px-3 py-2 text-right font-semibold">問数</th>
              <th className="px-3 py-2 text-right font-semibold">検索ヒット</th>
              <th className="px-3 py-2 text-right font-semibold">Recall@5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sortedTopics.map(([topic, t]) => (
              <tr key={topic}>
                <td className="px-3 py-2 font-medium text-slate-800">{topic}</td>
                <td className="px-3 py-2 text-right text-slate-700">{t.total}</td>
                <td className="px-3 py-2 text-right text-slate-700">{t.correct}</td>
                <td
                  className={`px-3 py-2 text-right font-semibold ${
                    t.accuracy >= r.target ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {formatPct(t.accuracy)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {r.failures.length > 0 ? (
        <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <summary className="cursor-pointer font-semibold text-slate-700">
            未達ケースを表示（{r.failures.length} 件）
          </summary>
          <ul className="mt-3 space-y-2">
            {r.failures.map((f) => (
              <li
                key={f.id}
                className="rounded-md border border-amber-200 bg-amber-50 p-2 text-slate-800"
              >
                <p className="font-semibold">
                  Q{f.id}{" "}
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] text-amber-900">
                    {f.topic}
                  </span>{" "}
                  {f.question}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">期待:</span> {f.expected}
                </p>
                <p className="mt-0.5">
                  <span className="font-semibold">取得:</span> {f.actual}
                </p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
